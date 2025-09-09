import axios from 'axios';
import { db } from '../db.js';
import { ObjectId } from 'mongodb';
import { MP_CONFIG } from '../config/mercadopago.config.js';

const subscriptionsCollection = db.collection('subscriptions');
const subscriptionPlansCollection = db.collection('subscriptionplans');
const clientsCollection = db.collection('clients');

class SubscriptionService {
    
    // Crear suscripción en base de datos y MercadoPago
    async createSubscription(subscriptionData, tenantId) {
        try {
            // Validar que el plan existe
            const plan = await subscriptionPlansCollection.findOne({
                _id: new ObjectId(subscriptionData.subscriptionPlan),
                tenant: tenantId,
                status: 'active'
            });

            if (!plan) {
                throw new Error('Plan de suscripción no encontrado o inactivo');
            }

            // Validar que el cliente existe
            const client = await clientsCollection.findOne({
                _id: new ObjectId(subscriptionData.client),
                tenant: tenantId
            });

            if (!client) {
                throw new Error('Cliente no encontrado');
            }

            // Calcular fecha de próximo pago
            const nextPaymentDate = this.calculateNextPaymentDate(new Date(), plan.frequency);
            
            // Calcular fecha de fin de periodo de prueba
            let trialEndDate = null;
            if (plan.trialDays > 0) {
                trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + plan.trialDays);
            }

            // Crear suscripción en base de datos
            const subscription = {
                subscriptionPlan: plan._id,
                client: client._id,
                payerEmail: subscriptionData.payerEmail || client.email,
                reason: subscriptionData.reason || plan.description,
                amount: subscriptionData.amount || plan.price,
                currency: plan.currency,
                frequency: plan.frequency,
                nextPaymentDate: nextPaymentDate,
                trialEndDate: trialEndDate,
                backUrl: subscriptionData.backUrl || plan.backUrl,
                externalReference: `sub_${Date.now()}_${tenantId}`,
                tenant: tenantId,
                status: subscriptionData.cardTokenId ? 'authorized' : 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await subscriptionsCollection.insertOne(subscription);
            subscription._id = result.insertedId;

            // Preparar datos para MercadoPago
            const mpSubscriptionData = {
                reason: subscription.reason,
                external_reference: subscription.externalReference,
                payer_email: subscription.payerEmail,
                back_url: subscription.backUrl,
                status: subscription.status
            };

            // Si hay un plan asociado, incluirlo
            if (plan.mpPlanId) {
                mpSubscriptionData.preapproval_plan_id = plan.mpPlanId;
            } else {
                // Suscripción sin plan (configuración manual)
                mpSubscriptionData.auto_recurring = {
                    frequency: plan.frequency === 'monthly' ? 1 : 12,
                    frequency_type: plan.frequency === 'monthly' ? 'months' : 'months',
                    transaction_amount: subscription.amount,
                    currency_id: subscription.currency,
                    ...(trialEndDate && {
                        free_trial: {
                            frequency: plan.trialDays,
                            frequency_type: 'days'
                        }
                    })
                };
            }

            // Si se proporciona token de tarjeta, incluirlo
            if (subscriptionData.cardTokenId) {
                mpSubscriptionData.card_token_id = subscriptionData.cardTokenId;
                subscription.cardTokenId = subscriptionData.cardTokenId;
            }

            // Crear suscripción en MercadoPago
            const mpResponse = await axios.post(
                `${MP_CONFIG.BASE_URL}/preapproval`,
                mpSubscriptionData,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Actualizar suscripción con datos de MercadoPago
            await subscriptionsCollection.updateOne(
                { _id: subscription._id },
                { 
                    $set: { 
                        mpSubscriptionId: mpResponse.data.id,
                        initPoint: mpResponse.data.init_point || null,
                        updatedAt: new Date()
                    }
                }
            );
            
            subscription.mpSubscriptionId = mpResponse.data.id;
            subscription.initPoint = mpResponse.data.init_point;

            // Obtener datos relacionados para la respuesta
            subscription.subscriptionPlan = plan;
            subscription.client = client;

            return {
                success: true,
                subscription: subscription,
                mpData: mpResponse.data,
                checkoutUrl: mpResponse.data.init_point
            };

        } catch (error) {
            console.error('Error creando suscripción:', error);
            throw new Error(`Error creando suscripción: ${error.message}`);
        }
    }

    // Obtener suscripciones de un tenant
    async getSubscriptions(tenantId, filters = {}) {
        try {
            const query = { tenant: tenantId };
            
            if (filters.status) {
                query.status = filters.status;
            }
            if (filters.client) {
                query.client = filters.client;
            }
            if (filters.subscriptionPlan) {
                query.subscriptionPlan = filters.subscriptionPlan;
            }

            const subscriptions = await subscriptionsCollection.find(query)
                .sort({ createdAt: -1 })
                .toArray();

            // Poblar datos relacionados manualmente
            for (let subscription of subscriptions) {
                if (subscription.subscriptionPlan) {
                    subscription.subscriptionPlan = await subscriptionPlansCollection.findOne({
                        _id: subscription.subscriptionPlan
                    });
                }
                if (subscription.client) {
                    subscription.client = await clientsCollection.findOne({
                        _id: subscription.client
                    });
                }
            }

            return subscriptions;
        } catch (error) {
            console.error('Error obteniendo suscripciones:', error);
            throw new Error(`Error obteniendo suscripciones: ${error.message}`);
        }
    }

    // Obtener suscripción por ID
    async getSubscriptionById(subscriptionId, tenantId) {
        try {
            const subscription = await subscriptionsCollection.findOne({
                _id: new ObjectId(subscriptionId),
                tenant: tenantId
            });

            if (!subscription) {
                throw new Error('Suscripción no encontrada');
            }

            // Poblar datos relacionados
            if (subscription.subscriptionPlan) {
                subscription.subscriptionPlan = await subscriptionPlansCollection.findOne({
                    _id: subscription.subscriptionPlan
                });
            }
            if (subscription.client) {
                subscription.client = await clientsCollection.findOne({
                    _id: subscription.client
                });
            }

            return subscription;
        } catch (error) {
            console.error('Error obteniendo suscripción:', error);
            throw new Error(`Error obteniendo suscripción: ${error.message}`);
        }
    }

    // Buscar suscripciones en MercadoPago
    async searchMPSubscriptions(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.q) params.append('q', filters.q);
            if (filters.payer_id) params.append('payer_id', filters.payer_id);
            if (filters.payer_email) params.append('payer_email', filters.payer_email);
            if (filters.preapproval_plan_id) params.append('preapproval_plan_id', filters.preapproval_plan_id);
            if (filters.status) params.append('status', filters.status);
            if (filters.sort) params.append('sort', filters.sort);
            if (filters.offset) params.append('offset', filters.offset);
            if (filters.limit) params.append('limit', filters.limit);

            const response = await axios.get(
                `${MP_CONFIG.BASE_URL}/preapproval/search?${params.toString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error buscando suscripciones en MP:', error);
            throw new Error(`Error buscando suscripciones: ${error.message}`);
        }
    }

    // Obtener suscripción de MercadoPago por ID
    async getMPSubscriptionById(mpSubscriptionId) {
        try {
            const response = await axios.get(
                `${MP_CONFIG.BASE_URL}/preapproval/${mpSubscriptionId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error obteniendo suscripción de MP:', error);
            throw new Error(`Error obteniendo suscripción de MP: ${error.message}`);
        }
    }

    // Actualizar suscripción
    async updateSubscription(subscriptionId, tenantId, updateData) {
        try {
            const subscription = await subscriptionsCollection.findOne({
                _id: new ObjectId(subscriptionId),
                tenant: tenantId
            });

            if (!subscription) {
                throw new Error('Suscripción no encontrada');
            }

            // Actualizar en base de datos
            await subscriptionsCollection.updateOne(
                { _id: new ObjectId(subscriptionId) },
                { 
                    $set: { 
                        ...updateData,
                        version: (subscription.version || 1) + 1,
                        updatedAt: new Date()
                    }
                }
            );

            // Si la suscripción tiene mpSubscriptionId, actualizar en MercadoPago
            if (subscription.mpSubscriptionId) {
                const mpUpdateData = {
                    reason: subscription.reason,
                    external_reference: subscription.externalReference,
                    back_url: subscription.backUrl,
                    status: subscription.status
                };

                // Incluir token de tarjeta si se proporciona
                if (updateData.cardTokenId) {
                    mpUpdateData.card_token_id = updateData.cardTokenId;
                }

                await axios.put(
                    `${MP_CONFIG.BASE_URL}/preapproval/${subscription.mpSubscriptionId}`,
                    mpUpdateData,
                    {
                        headers: {
                            'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
            }

            // Obtener suscripción actualizada con datos relacionados
            const updatedSubscription = await subscriptionsCollection.findOne({
                _id: new ObjectId(subscriptionId)
            });
            
            if (updatedSubscription.subscriptionPlan) {
                updatedSubscription.subscriptionPlan = await subscriptionPlansCollection.findOne({
                    _id: updatedSubscription.subscriptionPlan
                });
            }
            if (updatedSubscription.client) {
                updatedSubscription.client = await clientsCollection.findOne({
                    _id: updatedSubscription.client
                });
            }
            
            return updatedSubscription;
        } catch (error) {
            console.error('Error actualizando suscripción:', error);
            throw new Error(`Error actualizando suscripción: ${error.message}`);
        }
    }

    // Pausar suscripción
    async pauseSubscription(subscriptionId, tenantId) {
        try {
            const subscription = await this.updateSubscription(subscriptionId, tenantId, {
                status: 'paused'
            });
            return subscription;
        } catch (error) {
            console.error('Error pausando suscripción:', error);
            throw new Error(`Error pausando suscripción: ${error.message}`);
        }
    }

    // Reactivar suscripción
    async reactivateSubscription(subscriptionId, tenantId) {
        try {
            const subscription = await this.updateSubscription(subscriptionId, tenantId, {
                status: 'authorized'
            });
            return subscription;
        } catch (error) {
            console.error('Error reactivando suscripción:', error);
            throw new Error(`Error reactivando suscripción: ${error.message}`);
        }
    }

    // Cancelar suscripción
    async cancelSubscription(subscriptionId, tenantId) {
        try {
            const subscription = await this.updateSubscription(subscriptionId, tenantId, {
                status: 'cancelled',
                endDate: new Date()
            });
            return subscription;
        } catch (error) {
            console.error('Error cancelando suscripción:', error);
            throw new Error(`Error cancelando suscripción: ${error.message}`);
        }
    }

    // Exportar suscripciones
    async exportSubscriptions(tenantId, filters = {}) {
        try {
            const params = new URLSearchParams();
            params.append('collector_id', tenantId);
            
            if (filters.preapproval_plan_id) params.append('preapproval_plan_id', filters.preapproval_plan_id);
            if (filters.status) params.append('status', filters.status);
            if (filters.sort) params.append('sort', filters.sort);

            const response = await axios.get(
                `${MP_CONFIG.BASE_URL}/preapproval/export?${params.toString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error exportando suscripciones:', error);
            throw new Error(`Error exportando suscripciones: ${error.message}`);
        }
    }

    // Calcular próxima fecha de pago
    calculateNextPaymentDate(startDate, frequency) {
        const nextDate = new Date(startDate);
        
        if (frequency === 'monthly') {
            nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (frequency === 'annual') {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
        
        return nextDate;
    }

    // Sincronizar estado con MercadoPago
    async syncWithMercadoPago(subscriptionId, tenantId) {
        try {
            const subscription = await subscriptionsCollection.findOne({
                _id: new ObjectId(subscriptionId),
                tenant: tenantId
            });

            if (!subscription || !subscription.mpSubscriptionId) {
                throw new Error('Suscripción no encontrada o no sincronizada con MP');
            }

            const mpData = await this.getMPSubscriptionById(subscription.mpSubscriptionId);
            
            // Actualizar estado local con datos de MP
            await subscriptionsCollection.updateOne(
                { _id: new ObjectId(subscriptionId) },
                { 
                    $set: { 
                        status: mpData.status,
                        version: mpData.version || subscription.version,
                        updatedAt: new Date()
                    }
                }
            );

            return await subscriptionsCollection.findOne({
                _id: new ObjectId(subscriptionId)
            });
        } catch (error) {
            console.error('Error sincronizando con MercadoPago:', error);
            throw new Error(`Error sincronizando: ${error.message}`);
        }
    }
}

export default new SubscriptionService(); 