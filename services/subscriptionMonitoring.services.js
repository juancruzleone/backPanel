/**
 * Servicio para monitorear suscripciones y suspender planes por falta de pago
 * Maneja webhooks de MercadoPago y Polar.sh para pagos fallidos/cancelados
 * Verifica periódicamente el estado de suscripciones activas
 */

import { db } from '../db.js';
import { getTenantByTenantId } from './tenants.services.js';
import { MP_CONFIG } from '../config/mercadopago.config.js';
import axios from 'axios';

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
     * Verificar estado de suscripciones activas en MercadoPago/Polar
     * Esta función se ejecuta periódicamente para sincronizar estados
     */
    async checkActiveSubscriptions() {
        try {
            console.log('🔄 Verificando estado de suscripciones activas...');

            // Buscar todas las suscripciones activas o autorizadas
            const activeSubscriptions = await subscriptionCollection.find({
                status: { $in: ['active', 'authorized', 'pending'] }
            }).toArray();

            console.log(`📋 Encontradas ${activeSubscriptions.length} suscripciones para verificar`);

            const results = [];
            for (const subscription of activeSubscriptions) {
                try {
                    let result;
                    
                    // Verificar según el procesador de pagos
                    if (subscription.mercadoPagoId || subscription.externalReference) {
                        result = await this.checkMercadoPagoSubscriptionStatus(subscription);
                    } else if (subscription.polarSubscriptionId) {
                        result = await this.checkPolarSubscriptionStatus(subscription);
                    } else {
                        console.log(`⚠️ Suscripción sin procesador identificado: ${subscription._id}`);
                        continue;
                    }

                    if (result) {
                        results.push(result);
                    }
                } catch (error) {
                    console.error(`❌ Error verificando suscripción ${subscription._id}:`, error);
                }
            }

            console.log(`✅ Verificación completada: ${results.length} suscripciones procesadas`);
            return {
                success: true,
                processed: results.length,
                results
            };

        } catch (error) {
            console.error('❌ Error verificando suscripciones activas:', error);
            throw error;
        }
    }

    /**
     * Verificar estado de suscripción en MercadoPago
     */
    async checkMercadoPagoSubscriptionStatus(subscription) {
        try {
            console.log(`🔍 Verificando suscripción MercadoPago: ${subscription.mercadoPagoId || subscription.externalReference}`);

            // Si tiene mercadoPagoId, verificar directamente la suscripción
            if (subscription.mercadoPagoId) {
                const mpResponse = await axios.get(
                    `${MP_CONFIG.BASE_URL}/preapproval/${subscription.mercadoPagoId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
                        },
                        timeout: 10000
                    }
                );

                const mpSubscription = mpResponse.data;
                console.log(`📋 Estado MercadoPago: ${mpSubscription.status}`);

                return await this.updateSubscriptionStatus(subscription, mpSubscription.status, 'mercadopago', mpSubscription);
            }

            // Si no tiene mercadoPagoId pero tiene externalReference, buscar pagos recientes
            if (subscription.externalReference) {
                // Buscar pagos de los últimos 30 días para esta suscripción
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const paymentsResponse = await axios.get(
                    `${MP_CONFIG.BASE_URL}/v1/payments/search`,
                    {
                        headers: {
                            'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
                        },
                        params: {
                            external_reference: subscription.externalReference,
                            begin_date: thirtyDaysAgo.toISOString(),
                            end_date: new Date().toISOString()
                        },
                        timeout: 10000
                    }
                );

                const payments = paymentsResponse.data.results || [];
                console.log(`📋 Encontrados ${payments.length} pagos para external_reference: ${subscription.externalReference}`);

                if (payments.length > 0) {
                    // Obtener el pago más reciente
                    const latestPayment = payments.sort((a, b) => new Date(b.date_created) - new Date(a.date_created))[0];
                    console.log(`💳 Último pago: ${latestPayment.status} - ${latestPayment.date_created}`);

                    return await this.updateSubscriptionStatus(subscription, latestPayment.status, 'mercadopago', latestPayment);
                } else {
                    // No hay pagos recientes - verificar si la suscripción debería estar vencida
                    const daysSinceCreated = Math.floor((new Date() - new Date(subscription.createdAt)) / (1000 * 60 * 60 * 24));
                    
                    if (daysSinceCreated > 35) { // Más de 35 días sin pagos
                        console.log(`⚠️ Suscripción sin pagos por ${daysSinceCreated} días`);
                        return await this.updateSubscriptionStatus(subscription, 'no_payment', 'mercadopago', { reason: 'No payments found' });
                    }
                }
            }

            return null;

        } catch (error) {
            console.error(`❌ Error verificando MercadoPago para suscripción ${subscription._id}:`, error);
            
            // Si es error 404 o 400, la suscripción puede estar cancelada
            if (error.response?.status === 404 || error.response?.status === 400) {
                console.log(`🚫 Suscripción no encontrada en MercadoPago - marcando como cancelada`);
                return await this.updateSubscriptionStatus(subscription, 'cancelled', 'mercadopago', { error: error.response.data });
            }
            
            return null;
        }
    }

    /**
     * Verificar estado de suscripción en Polar.sh
     */
    async checkPolarSubscriptionStatus(subscription) {
        try {
            console.log(`🔍 Verificando suscripción Polar: ${subscription.polarSubscriptionId}`);

            // TODO: Implementar verificación con Polar.sh API
            // const polarService = await import('./polar.services.js');
            // const status = await polarService.default.getSubscriptionStatus(subscription.polarSubscriptionId);
            
            console.log('ℹ️ Verificación Polar.sh pendiente de implementación');
            return null;

        } catch (error) {
            console.error(`❌ Error verificando Polar para suscripción ${subscription._id}:`, error);
            return null;
        }
    }

    /**
     * Actualizar estado de suscripción según resultado de verificación
     */
    async updateSubscriptionStatus(subscription, newStatus, processor, externalData = {}) {
        try {
            console.log(`🔄 Actualizando suscripción ${subscription._id}: ${subscription.status} → ${newStatus}`);

            let subscriptionUpdate = {
                updatedAt: new Date(),
                lastCheckedAt: new Date(),
                processor: processor
            };

            let tenantAction = null;
            let actionReason = '';

            // Determinar acción según el nuevo estado
            switch (newStatus) {
                case 'approved':
                case 'authorized':
                case 'active':
                    // Pago exitoso - asegurar que el tenant esté activo
                    if (subscription.status !== 'active') {
                        subscriptionUpdate.status = 'active';
                        subscriptionUpdate.activatedAt = new Date();
                        
                        // Extender expiración según frecuencia
                        const isYearly = subscription.frequency === 'yearly' || subscription.billingCycle === 'yearly';
                        const extensionDays = isYearly ? 365 : 30;
                        subscriptionUpdate.expiresAt = new Date(Date.now() + extensionDays * 24 * 60 * 60 * 1000);
                        
                        tenantAction = 'activate';
                        actionReason = `Payment successful - ${processor}`;
                    }
                    break;

                case 'cancelled':
                case 'paused':
                case 'rejected':
                    // Pago fallido o cancelado - suspender tenant
                    subscriptionUpdate.status = 'cancelled';
                    subscriptionUpdate.cancelledAt = new Date();
                    tenantAction = 'suspend';
                    actionReason = `Subscription ${newStatus} - ${processor}`;
                    break;

                case 'pending':
                    // Pago pendiente - mantener estado actual pero actualizar timestamp
                    subscriptionUpdate.status = 'pending';
                    break;

                case 'no_payment':
                    // Sin pagos recientes - suspender si está activa
                    if (subscription.status === 'active') {
                        subscriptionUpdate.status = 'payment_failed';
                        subscriptionUpdate.suspendedAt = new Date();
                        tenantAction = 'suspend';
                        actionReason = 'No recent payments found';
                    }
                    break;

                default:
                    console.log(`⚠️ Estado no manejado: ${newStatus}`);
                    break;
            }

            // Actualizar suscripción en BD
            await subscriptionCollection.updateOne(
                { _id: subscription._id },
                { $set: subscriptionUpdate }
            );

            // Ejecutar acción en el tenant si es necesaria
            let tenantResult = null;
            if (tenantAction && subscription.tenantId) {
                if (tenantAction === 'activate') {
                    // Restaurar/activar plan del tenant
                    const paymentProcessingService = await import('./paymentProcessing.services.js');
                    
                    // Mapear planId a configuración de plan
                    const { getPlanConfig } = await import('../config/plans.config.js');
                    let planName = subscription.planId || 'starter';
                    if (planName.includes('professional')) planName = 'professional';
                    else if (planName.includes('enterprise')) planName = 'enterprise';
                    else planName = 'starter';
                    
                    const planConfig = getPlanConfig(planName);
                    if (planConfig) {
                        tenantResult = await paymentProcessingService.default.updateExistingTenantPlan(
                            subscription.tenantId, 
                            planConfig
                        );
                    }
                } else if (tenantAction === 'suspend') {
                    // Suspender plan del tenant
                    tenantResult = await this.suspendTenantPlan(
                        subscription.tenantId,
                        actionReason,
                        processor
                    );
                }
            }

            console.log(`✅ Suscripción actualizada: ${subscription._id} - ${newStatus}`);

            return {
                subscriptionId: subscription._id,
                oldStatus: subscription.status,
                newStatus: subscriptionUpdate.status || subscription.status,
                tenantAction,
                tenantResult,
                processor,
                timestamp: new Date()
            };

        } catch (error) {
            console.error(`❌ Error actualizando estado de suscripción ${subscription._id}:`, error);
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
