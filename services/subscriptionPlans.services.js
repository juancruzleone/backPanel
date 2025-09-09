import axios from 'axios';
import { db } from '../db.js';
import { ObjectId } from 'mongodb';
import { MP_CONFIG } from '../config/mercadopago.config.js';

const subscriptionPlansCollection = db.collection('subscriptionplans');

class SubscriptionPlanService {
    
    // Crear plan de suscripción en base de datos y MercadoPago
    async createPlan(planData, tenantId) {
        try {
            // Crear plan en base de datos primero
            const plan = {
                ...planData,
                tenant: tenantId,
                externalReference: `plan_${Date.now()}_${tenantId}`,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            const result = await subscriptionPlansCollection.insertOne(plan);
            plan._id = result.insertedId;

            // Preparar datos para MercadoPago
            const mpPlanData = {
                reason: plan.description,
                auto_recurring: {
                    frequency: plan.frequency === 'monthly' ? 1 : 12,
                    frequency_type: plan.frequency === 'monthly' ? 'months' : 'months',
                    transaction_amount: plan.price,
                    currency_id: plan.currency,
                    ...(plan.trialDays > 0 && {
                        free_trial: {
                            frequency: plan.trialDays,
                            frequency_type: 'days'
                        }
                    })
                },
                payment_methods_allowed: {
                    payment_types: [
                        { id: 'credit_card' },
                        { id: 'debit_card' }
                    ],
                    payment_methods: [
                        { id: 'visa' },
                        { id: 'master' },
                        { id: 'amex' }
                    ]
                },
                back_url: plan.backUrl,
                external_reference: plan.externalReference
            };

            // Crear plan en MercadoPago
            const mpResponse = await axios.post(
                `${MP_CONFIG.BASE_URL}/preapproval_plan`,
                mpPlanData,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Actualizar plan con ID de MercadoPago
            await subscriptionPlansCollection.updateOne(
                { _id: plan._id },
                { 
                    $set: { 
                        mpPlanId: mpResponse.data.id,
                        updatedAt: new Date()
                    }
                }
            );
            plan.mpPlanId = mpResponse.data.id;

            return {
                success: true,
                plan: plan,
                mpData: mpResponse.data
            };

        } catch (error) {
            console.error('Error creando plan de suscripción:', error);
            throw new Error(`Error creando plan: ${error.message}`);
        }
    }

    // Obtener todos los planes de un tenant
    async getPlans(tenantId, status = null) {
        try {
            const query = { tenant: tenantId };
            if (status) {
                query.status = status;
            }

            const plans = await subscriptionPlansCollection.find(query).sort({ createdAt: -1 }).toArray();
            return plans;
        } catch (error) {
            console.error('Error obteniendo planes:', error);
            throw new Error(`Error obteniendo planes: ${error.message}`);
        }
    }

    // Obtener plan por ID
    async getPlanById(planId, tenantId) {
        try {
            const plan = await subscriptionPlansCollection.findOne({ 
                _id: new ObjectId(planId), 
                tenant: tenantId 
            });
            
            if (!plan) {
                throw new Error('Plan no encontrado');
            }

            return plan;
        } catch (error) {
            console.error('Error obteniendo plan:', error);
            throw new Error(`Error obteniendo plan: ${error.message}`);
        }
    }

    // Buscar planes en MercadoPago
    async searchMPPlans(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.status) params.append('status', filters.status);
            if (filters.q) params.append('q', filters.q);
            if (filters.sort) params.append('sort', filters.sort);
            if (filters.offset) params.append('offset', filters.offset);
            if (filters.limit) params.append('limit', filters.limit);

            const response = await axios.get(
                `${MP_CONFIG.BASE_URL}/preapproval_plan/search?${params.toString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error buscando planes en MP:', error);
            throw new Error(`Error buscando planes: ${error.message}`);
        }
    }

    // Obtener plan de MercadoPago por ID
    async getMPPlanById(mpPlanId) {
        try {
            const response = await axios.get(
                `${MP_CONFIG.BASE_URL}/preapproval_plan/${mpPlanId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error obteniendo plan de MP:', error);
            throw new Error(`Error obteniendo plan de MP: ${error.message}`);
        }
    }

    // Actualizar plan
    async updatePlan(planId, tenantId, updateData) {
        try {
            const plan = await subscriptionPlansCollection.findOne({ 
                _id: new ObjectId(planId), 
                tenant: tenantId 
            });
            
            if (!plan) {
                throw new Error('Plan no encontrado');
            }

            // Actualizar en base de datos
            await subscriptionPlansCollection.updateOne(
                { _id: new ObjectId(planId) },
                { 
                    $set: { 
                        ...updateData,
                        updatedAt: new Date()
                    }
                }
            );
            
            // Obtener plan actualizado
            const updatedPlan = await subscriptionPlansCollection.findOne({ 
                _id: new ObjectId(planId) 
            });

            // Si el plan tiene mpPlanId, actualizar en MercadoPago
            if (plan.mpPlanId) {
                const mpUpdateData = {
                    reason: plan.description,
                    auto_recurring: {
                        frequency: plan.frequency === 'monthly' ? 1 : 12,
                        frequency_type: plan.frequency === 'monthly' ? 'months' : 'months',
                        transaction_amount: plan.price,
                        currency_id: plan.currency
                    },
                    payment_methods_allowed: {
                        payment_types: [
                            { id: 'credit_card' },
                            { id: 'debit_card' }
                        ]
                    },
                    back_url: plan.backUrl
                };

                await axios.put(
                    `${MP_CONFIG.BASE_URL}/preapproval_plan/${plan.mpPlanId}`,
                    mpUpdateData,
                    {
                        headers: {
                            'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
            }

            return updatedPlan;
        } catch (error) {
            console.error('Error actualizando plan:', error);
            throw new Error(`Error actualizando plan: ${error.message}`);
        }
    }

    // Calcular precio con descuento
    calculateDiscountedPrice(price, discountPercentage, frequency) {
        let finalPrice = price;
        
        // Aplicar descuento por porcentaje
        if (discountPercentage > 0) {
            finalPrice = price * (1 - discountPercentage / 100);
        }
        
        // Aplicar descuento adicional para planes anuales (ejemplo: 10% extra)
        if (frequency === 'annual') {
            finalPrice = finalPrice * 0.9; // 10% descuento adicional para anuales
        }
        
        return Math.round(finalPrice * 100) / 100; // Redondear a 2 decimales
    }

    // Eliminar plan (marcar como cancelado)
    async deletePlan(planId, tenantId) {
        try {
            const plan = await subscriptionPlansCollection.findOne({ 
                _id: new ObjectId(planId), 
                tenant: tenantId 
            });
            
            if (!plan) {
                throw new Error('Plan no encontrado');
            }

            // Marcar como cancelado en lugar de eliminar
            await subscriptionPlansCollection.updateOne(
                { _id: new ObjectId(planId) },
                { 
                    $set: { 
                        status: 'cancelled',
                        updatedAt: new Date()
                    }
                }
            );

            return { ...plan, status: 'cancelled' };
        } catch (error) {
            console.error('Error eliminando plan:', error);
            throw new Error(`Error eliminando plan: ${error.message}`);
        }
    }
}

export default new SubscriptionPlanService(); 