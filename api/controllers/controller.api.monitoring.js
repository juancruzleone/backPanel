/**
 * Controlador para endpoints de monitoreo de suscripciones
 * Permite ejecutar verificaciones manuales y obtener estadísticas
 */

import subscriptionMonitoringService from '../../services/subscriptionMonitoring.services.js';

// Verificar suscripciones activas manualmente
async function checkActiveSubscriptions(req, res) {
    try {
        console.log('🔄 [MANUAL] Ejecutando verificación de suscripciones activas...');
        
        const result = await subscriptionMonitoringService.checkActiveSubscriptions();
        
        res.status(200).json({
            success: true,
            message: 'Verificación de suscripciones activas completada',
            data: result
        });

    } catch (error) {
        console.error('❌ Error en verificación manual de suscripciones activas:', error);
        res.status(500).json({
            success: false,
            message: 'Error verificando suscripciones activas',
            error: error.message
        });
    }
}

// Verificar suscripciones expiradas manualmente
async function checkExpiredSubscriptions(req, res) {
    try {
        console.log('🔄 [MANUAL] Ejecutando verificación de suscripciones expiradas...');
        
        const result = await subscriptionMonitoringService.checkExpiredSubscriptions();
        
        res.status(200).json({
            success: true,
            message: 'Verificación de suscripciones expiradas completada',
            data: result
        });

    } catch (error) {
        console.error('❌ Error en verificación manual de suscripciones expiradas:', error);
        res.status(500).json({
            success: false,
            message: 'Error verificando suscripciones expiradas',
            error: error.message
        });
    }
}

// Verificar una suscripción específica
async function checkSpecificSubscription(req, res) {
    try {
        const { subscriptionId } = req.params;
        
        if (!subscriptionId) {
            return res.status(400).json({
                success: false,
                message: 'ID de suscripción requerido'
            });
        }

        console.log(`🔍 [MANUAL] Verificando suscripción específica: ${subscriptionId}`);
        
        // Buscar la suscripción en BD
        const { db } = await import('../../db.js');
        const subscriptionCollection = db.collection("subscriptions");
        
        const subscription = await subscriptionCollection.findOne({
            $or: [
                { _id: subscriptionId },
                { externalReference: subscriptionId },
                { mercadoPagoId: subscriptionId },
                { polarSubscriptionId: subscriptionId }
            ]
        });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Suscripción no encontrada'
            });
        }

        let result = null;
        
        // Verificar según el procesador
        if (subscription.mercadoPagoId || subscription.externalReference) {
            result = await subscriptionMonitoringService.checkMercadoPagoSubscriptionStatus(subscription);
        } else if (subscription.polarSubscriptionId) {
            result = await subscriptionMonitoringService.checkPolarSubscriptionStatus(subscription);
        }

        res.status(200).json({
            success: true,
            message: 'Verificación de suscripción específica completada',
            data: {
                subscription: subscription,
                verificationResult: result
            }
        });

    } catch (error) {
        console.error('❌ Error verificando suscripción específica:', error);
        res.status(500).json({
            success: false,
            message: 'Error verificando suscripción específica',
            error: error.message
        });
    }
}

// Obtener estadísticas de monitoreo
async function getMonitoringStats(req, res) {
    try {
        console.log('📊 [MANUAL] Obteniendo estadísticas de monitoreo...');
        
        const { db } = await import('../../db.js');
        const subscriptionCollection = db.collection("subscriptions");
        const tenantCollection = db.collection("tenants");

        // Estadísticas de suscripciones
        const subscriptionStats = await subscriptionCollection.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        // Estadísticas de tenants
        const tenantStats = await tenantCollection.aggregate([
            {
                $group: {
                    _id: {
                        status: "$status",
                        plan: "$plan"
                    },
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        // Suscripciones próximas a vencer (próximos 7 días)
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const expiringSoon = await tenantCollection.find({
            status: 'active',
            subscriptionExpiresAt: {
                $gte: new Date(),
                $lte: sevenDaysFromNow
            }
        }).toArray();

        // Suscripciones ya expiradas
        const expired = await tenantCollection.find({
            status: 'active',
            subscriptionExpiresAt: { $lt: new Date() }
        }).toArray();

        res.status(200).json({
            success: true,
            message: 'Estadísticas de monitoreo obtenidas',
            data: {
                subscriptionsByStatus: subscriptionStats,
                tenantsByStatusAndPlan: tenantStats,
                expiringSoon: {
                    count: expiringSoon.length,
                    tenants: expiringSoon.map(t => ({
                        tenantId: t.tenantId,
                        name: t.name,
                        plan: t.plan,
                        expiresAt: t.subscriptionExpiresAt
                    }))
                },
                alreadyExpired: {
                    count: expired.length,
                    tenants: expired.map(t => ({
                        tenantId: t.tenantId,
                        name: t.name,
                        plan: t.plan,
                        expiresAt: t.subscriptionExpiresAt
                    }))
                },
                timestamp: new Date()
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas de monitoreo:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo estadísticas de monitoreo',
            error: error.message
        });
    }
}

export {
    checkActiveSubscriptions,
    checkExpiredSubscriptions,
    checkSpecificSubscription,
    getMonitoringStats
};
