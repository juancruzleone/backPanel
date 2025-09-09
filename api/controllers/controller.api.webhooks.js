import paymentProcessingService from '../../services/paymentProcessing.services.js';
import { ObjectId } from 'mongodb';

const webhookController = {
    // Webhook de MercadoPago para pagos de suscripciones
    mercadoPagoWebhook: async (req, res) => {
        try {
            console.log('🔔 Webhook recibido:', req.body);
            
            const webhookData = req.body;
            
            // Verificar que el webhook sea válido
            if (!webhookData.type || !webhookData.data) {
                return res.status(400).json({
                    success: false,
                    message: 'Webhook inválido - falta type o data'
                });
            }
            
            // Procesar solo webhooks de pagos
            if (webhookData.type === 'payment') {
                const result = await paymentProcessingService.processWebhook(webhookData);
                
                if (result.processed) {
                    console.log('✅ Webhook procesado exitosamente:', result.result);
                    
                    return res.status(200).json({
                        success: true,
                        message: 'Webhook procesado exitosamente',
                        data: {
                            tenant: result.result.tenant?.tenantId,
                            adminUser: result.result.adminUser?.userName,
                            subscription: result.result.subscription?._id
                        }
                    });
                } else {
                    console.log('ℹ️ Webhook no procesado:', result.reason);
                    
                    return res.status(200).json({
                        success: true,
                        message: 'Webhook recibido pero no procesado',
                        reason: result.reason
                    });
                }
            } else {
                // Otros tipos de webhook (ignorar por ahora)
                console.log('ℹ️ Webhook ignorado - tipo:', webhookData.type);
                
                return res.status(200).json({
                    success: true,
                    message: 'Webhook recibido pero ignorado',
                    type: webhookData.type
                });
            }
            
        } catch (error) {
            console.error('❌ Error procesando webhook:', error);
            
            // Importante: MercadoPago necesita una respuesta 200 para no reenviar
            return res.status(200).json({
                success: false,
                message: 'Error procesando webhook',
                error: error.message
            });
        }
    },
    
    // Endpoint manual para procesar pago exitoso (para testing)
    processSuccessfulPayment: async (req, res) => {
        try {
            const { paymentData } = req.body;
            
            if (!paymentData) {
                return res.status(400).json({
                    success: false,
                    message: 'paymentData es requerido'
                });
            }
            
            const result = await paymentProcessingService.processSuccessfulPayment(paymentData);
            
            res.status(200).json({
                success: true,
                message: 'Pago procesado exitosamente',
                data: result
            });
            
        } catch (error) {
            console.error('❌ Error procesando pago manual:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },
    
    // Verificar estado de suscripción y procesar si es necesario
    checkSubscriptionStatus: async (req, res) => {
        try {
            const { subscriptionId } = req.params;
            
            if (!subscriptionId) {
                return res.status(400).json({
                    success: false,
                    message: 'subscriptionId es requerido'
                });
            }
            
            // Buscar la suscripción
            const { db } = await import('../../db.js');
            const subscription = await db.collection('subscriptions').findOne({
                _id: new ObjectId(subscriptionId)
            });
            
            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'Suscripción no encontrada'
                });
            }
            
            // Si la suscripción ya está autorizada pero no tiene tenant asignado
            if (subscription.status === 'authorized' && !subscription.tenant) {
                console.log('🔄 Procesando suscripción autorizada sin tenant:', subscriptionId);
                
                // Simular un pago exitoso para procesar la creación del tenant
                const mockPaymentData = {
                    external_reference: subscription.externalReference,
                    status: 'approved'
                };
                
                const result = await paymentProcessingService.processSuccessfulPayment(mockPaymentData);
                
                return res.status(200).json({
                    success: true,
                    message: 'Suscripción procesada exitosamente',
                    data: result
                });
            }
            
            res.status(200).json({
                success: true,
                message: 'Estado de suscripción verificado',
                data: {
                    subscription,
                    hasTenan: !!subscription.tenant,
                    status: subscription.status
                }
            });
            
        } catch (error) {
            console.error('❌ Error verificando suscripción:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    }
};

export default webhookController; 