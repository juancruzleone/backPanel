/**
 * Servicio para monitorear suscripciones y suspender planes por falta de pago
 * Maneja webhooks de MercadoPago y Polar.sh para pagos fallidos/cancelados
 */

import { db } from '../db.js';
import { getTenantByTenantId } from './tenants.services.js';

const tenantCollection = db.collection("tenants");
const subscriptionCollection = db.collection("subscriptions");

class SubscriptionMonitoringService {

    /**
     * Procesar webhook de pago fallido/cancelado
     */
    async processFailedPayment(webhookData) {
        try {
            console.log('💳 Procesando pago fallido:', webhookData);

            const { processor, subscriptionId, reason, payerEmail } = webhookData;

            // Buscar suscripción en la base de datos
            let subscription;
            if (subscriptionId) {
                subscription = await subscriptionCollection.findOne({
                    $or: [
                        { externalReference: subscriptionId },
                        { mercadoPagoId: subscriptionId },
                        { polarSubscriptionId: subscriptionId }
                    ]
                });
            }

            // Si no se encuentra por ID, buscar por email del pagador
            if (!subscription && payerEmail) {
                subscription = await subscriptionCollection.findOne({
                    payerEmail: payerEmail,
                    status: { $in: ['active', 'authorized'] }
                });
            }

            if (!subscription) {
                console.log('⚠️ Suscripción no encontrada para pago fallido');
                return { processed: false, reason: 'Subscription not found' };
            }

            console.log('📋 Suscripción encontrada:', {
                _id: subscription._id,
                tenantId: subscription.tenantId,
                payerEmail: subscription.payerEmail
            });

            // Suspender el plan del tenant
            const result = await this.suspendTenantPlan(subscription.tenantId, reason, processor);

            // Actualizar estado de la suscripción
            await subscriptionCollection.updateOne(
                { _id: subscription._id },
                {
                    $set: {
                        status: 'payment_failed',
                        suspendedAt: new Date(),
                        suspensionReason: reason || 'Payment failed',
                        updatedAt: new Date()
                    }
                }
            );

            console.log('✅ Plan suspendido por falta de pago:', result);
            return { processed: true, result };

        } catch (error) {
            console.error('❌ Error procesando pago fallido:', error);
            throw error;
        }
    }

    /**
     * Suspender plan del tenant por falta de pago
     */
    async suspendTenantPlan(tenantId, reason = 'Payment failed', processor = 'unknown') {
        try {
            console.log('🚫 Suspendiendo plan del tenant:', tenantId);

            // Obtener información del tenant
            const tenant = await getTenantByTenantId(tenantId);
            if (!tenant) {
                throw new Error(`Tenant no encontrado: ${tenantId}`);
            }

            console.log('🏢 Tenant a suspender:', {
                _id: tenant._id,
                tenantId: tenant.tenantId,
                name: tenant.name,
                currentPlan: tenant.plan,
                status: tenant.status
            });

            // Actualizar tenant a plan suspendido
            const updateData = {
                plan: 'suspended',
                status: 'suspended',
                suspendedAt: new Date(),
                suspensionReason: reason,
                previousPlan: tenant.plan, // Guardar el plan anterior para restaurar
                updatedAt: new Date(),
                updatedBy: `payment_system_${processor}`
            };

            const result = await tenantCollection.updateOne(
                { _id: tenant._id },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                throw new Error('No se pudo suspender el tenant');
            }

            console.log('✅ Tenant suspendido exitosamente:', {
                tenantId: tenant.tenantId,
                previousPlan: tenant.plan,
                newStatus: 'suspended',
                reason: reason
            });

            // TODO: Enviar notificación por email al admin del tenant
            await this.sendSuspensionNotification(tenant, reason);

            return {
                success: true,
                tenant: {
                    ...tenant,
                    ...updateData
                },
                message: `Plan suspendido por: ${reason}`
            };

        } catch (error) {
            console.error('❌ Error suspendiendo plan del tenant:', error);
            throw error;
        }
    }

    /**
     * Restaurar plan del tenant después de pago exitoso
     */
    async restoreTenantPlan(tenantId, newPlan) {
        try {
            console.log('🔄 Restaurando plan del tenant:', tenantId);

            const tenant = await getTenantByTenantId(tenantId);
            if (!tenant) {
                throw new Error(`Tenant no encontrado: ${tenantId}`);
            }

            // Determinar el plan a restaurar
            const planToRestore = newPlan || tenant.previousPlan || 'basic';

            const updateData = {
                plan: planToRestore,
                status: 'active',
                restoredAt: new Date(),
                suspendedAt: null,
                suspensionReason: null,
                previousPlan: null,
                updatedAt: new Date(),
                updatedBy: 'payment_system_restore'
            };

            const result = await tenantCollection.updateOne(
                { _id: tenant._id },
                { $set: updateData, $unset: { suspendedAt: "", suspensionReason: "", previousPlan: "" } }
            );

            if (result.matchedCount === 0) {
                throw new Error('No se pudo restaurar el tenant');
            }

            // Actualizar suscripción a activa
            await subscriptionCollection.updateOne(
                { tenantId: tenant.tenantId },
                {
                    $set: {
                        status: 'active',
                        restoredAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            );

            console.log('✅ Tenant restaurado exitosamente:', {
                tenantId: tenant.tenantId,
                restoredPlan: planToRestore,
                newStatus: 'active'
            });

            return {
                success: true,
                tenant: {
                    ...tenant,
                    ...updateData
                },
                message: `Plan restaurado: ${planToRestore}`
            };

        } catch (error) {
            console.error('❌ Error restaurando plan del tenant:', error);
            throw error;
        }
    }

    /**
     * Procesar webhook de MercadoPago para suscripciones
     */
    async processMercadoPagoSubscriptionWebhook(webhookData) {
        try {
            console.log('🔔 Webhook MercadoPago suscripción:', webhookData);

            if (webhookData.type === 'preapproval') {
                const preapprovalId = webhookData.data.id;
                
                // Obtener información de la suscripción desde MercadoPago
                const mercadoPagoService = await import('./mercadopago.services.js');
                const subscriptionInfo = await mercadoPagoService.default.getSubscription(preapprovalId);

                if (!subscriptionInfo.success) {
                    console.log('❌ Error obteniendo suscripción de MercadoPago');
                    return { processed: false, reason: 'Could not fetch subscription info' };
                }

                const subscription = subscriptionInfo.data;
                console.log('📋 Estado de suscripción MercadoPago:', subscription.status);

                // Procesar según el estado
                switch (subscription.status) {
                    case 'cancelled':
                    case 'paused':
                        return await this.processFailedPayment({
                            processor: 'mercadopago',
                            subscriptionId: preapprovalId,
                            reason: `Subscription ${subscription.status}`,
                            payerEmail: subscription.payer_email
                        });

                    case 'authorized':
                        // Suscripción activa - no hacer nada
                        console.log('✅ Suscripción MercadoPago activa');
                        return { processed: false, reason: 'Subscription is active' };

                    default:
                        console.log('ℹ️ Estado de suscripción no manejado:', subscription.status);
                        return { processed: false, reason: `Unhandled status: ${subscription.status}` };
                }
            }

            return { processed: false, reason: 'Not a preapproval webhook' };

        } catch (error) {
            console.error('❌ Error procesando webhook MercadoPago suscripción:', error);
            throw error;
        }
    }

    /**
     * Procesar webhook de Polar.sh para suscripciones
     */
    async processPolarSubscriptionWebhook(eventType, data) {
        try {
            console.log('🔔 Webhook Polar suscripción:', eventType, data.id);

            switch (eventType) {
                case 'subscription.canceled':
                case 'subscription.past_due':
                    return await this.processFailedPayment({
                        processor: 'polar',
                        subscriptionId: data.id,
                        reason: `Subscription ${eventType.split('.')[1]}`,
                        payerEmail: data.customer_email
                    });

                case 'subscription.updated':
                    if (data.status === 'active') {
                        // Restaurar plan si la suscripción se reactivó
                        const subscription = await subscriptionCollection.findOne({
                            polarSubscriptionId: data.id
                        });
                        
                        if (subscription && subscription.tenantId) {
                            return await this.restoreTenantPlan(subscription.tenantId);
                        }
                    }
                    break;

                default:
                    console.log('ℹ️ Evento Polar no manejado:', eventType);
                    return { processed: false, reason: `Unhandled event: ${eventType}` };
            }

            return { processed: false, reason: 'Event processed but no action taken' };

        } catch (error) {
            console.error('❌ Error procesando webhook Polar suscripción:', error);
            throw error;
        }
    }

    /**
     * Verificar suscripciones expiradas (cron job)
     */
    async checkExpiredSubscriptions() {
        try {
            console.log('🔍 Verificando suscripciones expiradas...');

            const now = new Date();
            
            // Buscar tenants con suscripciones expiradas
            const expiredTenants = await tenantCollection.find({
                status: 'active',
                subscriptionExpiresAt: { $lt: now }
            }).toArray();

            console.log(`📋 Encontrados ${expiredTenants.length} tenants con suscripciones expiradas`);

            const results = [];
            for (const tenant of expiredTenants) {
                try {
                    const result = await this.suspendTenantPlan(
                        tenant.tenantId, 
                        'Subscription expired', 
                        'system_check'
                    );
                    results.push(result);
                } catch (error) {
                    console.error(`❌ Error suspendiendo tenant ${tenant.tenantId}:`, error);
                }
            }

            return {
                success: true,
                processed: results.length,
                results
            };

        } catch (error) {
            console.error('❌ Error verificando suscripciones expiradas:', error);
            throw error;
        }
    }

    /**
     * Enviar notificación de suspensión (placeholder)
     */
    async sendSuspensionNotification(tenant, reason) {
        try {
            // TODO: Implementar envío de email real
            console.log('📧 Notificación de suspensión enviada:', {
                tenant: tenant.name,
                email: tenant.email,
                reason: reason
            });

            // Aquí puedes integrar con tu servicio de email
            
        } catch (error) {
            console.error('❌ Error enviando notificación de suspensión:', error);
            // No fallar el proceso completo por un error de email
        }
    }
}

export default new SubscriptionMonitoringService();
