import axios from 'axios';
import { MP_CONFIG } from '../config/mercadopago.config.js';

class MercadoPagoService {
    
    // Crear checkout directo (pago único) en MercadoPago
    async createDirectCheckout(checkoutData) {
        try {
            const {
                title,
                description,
                price,
                currency_id = 'ARS',
                payer_email,
                external_reference,
                back_urls
            } = checkoutData;

            // Validar y corregir back_urls para evitar localhost en producción
            let validBackUrls = back_urls;
            
            // Si no hay back_urls o contienen localhost, usar URLs por defecto
            if (!validBackUrls || 
                validBackUrls.success?.includes('localhost') || 
                validBackUrls.failure?.includes('localhost') || 
                validBackUrls.pending?.includes('localhost')) {
                
                validBackUrls = {
                    success: process.env.FRONTEND_URL ? 
                        `${process.env.FRONTEND_URL}/subscription/success?lang=es` : 
                        'https://panelmantenimiento.netlify.app/subscription/success',
                    failure: process.env.FRONTEND_URL ? 
                        `${process.env.FRONTEND_URL}/subscription/failure` : 
                        'https://panelmantenimiento.netlify.app/subscription/failure',
                    pending: process.env.FRONTEND_URL ? 
                        `${process.env.FRONTEND_URL}/subscription/pending` : 
                        'https://panelmantenimiento.netlify.app/subscription/pending'
                };
            }

            const mpData = {
                items: [
                    {
                        title: title,
                        description: description,
                        quantity: 1,
                        currency_id: currency_id,
                        unit_price: price
                    }
                ],
                payer: {
                    email: payer_email
                },
                external_reference: external_reference,
                back_urls: validBackUrls,
                auto_return: 'approved',
                payment_methods: {
                    excluded_payment_methods: [],
                    excluded_payment_types: [],
                    installments: 12
                },
                notification_url: `${process.env.BACKEND_URL || 'https://backpanel-d4em.onrender.com'}/api/webhooks/mercadopago`
            };

            console.log('🚀 Creando checkout directo en MercadoPago:', mpData);

            const response = await axios.post(
                `${MP_CONFIG.BASE_URL}/checkout/preferences`,
                mpData,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Checkout directo creado en MercadoPago:', response.data);

            return {
                success: true,
                data: {
                    id: response.data.id,
                    init_point: response.data.init_point,
                    sandbox_init_point: response.data.sandbox_init_point,
                    external_reference: response.data.external_reference
                }
            };

        } catch (error) {
            console.error('❌ Error creando checkout directo en MercadoPago:', error.response?.data || error.message);
            
            return {
                success: false,
                error: error.response?.data || error.message,
                message: 'Error al crear checkout directo en MercadoPago'
            };
        }
    }
    
    // Crear suscripción (preapproval) en MercadoPago
    async createSubscription(subscriptionData) {
        try {
            const {
                reason,
                external_reference,
                payer_email,
                back_url,
                auto_recurring,
                status = 'pending'
            } = subscriptionData;

            // Validar y corregir back_url para MercadoPago
            let validBackUrl = back_url;
            if (!validBackUrl || validBackUrl.startsWith('http://localhost')) {
                validBackUrl = 'https://leonix.vercel.app/subscription/success';
            }

            // Datos para crear la suscripción en MercadoPago
            const mpData = {
                reason: reason,
                external_reference: external_reference,
                payer_email: payer_email,
                back_url: validBackUrl,
                auto_recurring: {
                    ...auto_recurring,
                    currency_id: 'ARS' // Forzar ARS para Argentina
                },
                status: status
            };

            console.log('🚀 Creando suscripción en MercadoPago:', mpData);

            const response = await axios.post(
                `${MP_CONFIG.BASE_URL}/preapproval`,
                mpData,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Suscripción creada en MercadoPago:', response.data);

            return {
                success: true,
                data: {
                    id: response.data.id,
                    init_point: response.data.init_point,
                    sandbox_init_point: response.data.sandbox_init_point,
                    status: response.data.status,
                    external_reference: response.data.external_reference
                }
            };

        } catch (error) {
            console.error('❌ Error creando suscripción en MercadoPago:', error.response?.data || error.message);
            
            return {
                success: false,
                error: error.response?.data || error.message,
                message: 'Error al crear suscripción en MercadoPago'
            };
        }
    }

    // Crear plan de suscripción en MercadoPago
    async createSubscriptionPlan(planData) {
        try {
            const {
                reason,
                auto_recurring,
                payment_methods_allowed,
                back_url
            } = planData;

            const mpPlanData = {
                reason: reason,
                auto_recurring: auto_recurring,
                payment_methods_allowed: payment_methods_allowed || {
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
                back_url: back_url
            };

            console.log('🚀 Creando plan en MercadoPago:', mpPlanData);

            const response = await axios.post(
                `${MP_CONFIG.BASE_URL}/preapproval_plan`,
                mpPlanData,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Plan creado en MercadoPago:', response.data);

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('❌ Error creando plan en MercadoPago:', error.response?.data || error.message);
            
            return {
                success: false,
                error: error.response?.data || error.message,
                message: 'Error al crear plan en MercadoPago'
            };
        }
    }

    // Obtener suscripción por ID
    async getSubscription(subscriptionId) {
        try {
            const response = await axios.get(
                `${MP_CONFIG.BASE_URL}/preapproval/${subscriptionId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('❌ Error obteniendo suscripción de MercadoPago:', error.response?.data || error.message);
            
            return {
                success: false,
                error: error.response?.data || error.message,
                message: 'Error al obtener suscripción de MercadoPago'
            };
        }
    }

    // Cancelar suscripción
    async cancelSubscription(subscriptionId) {
        try {
            const response = await axios.put(
                `${MP_CONFIG.BASE_URL}/preapproval/${subscriptionId}`,
                { status: 'cancelled' },
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('❌ Error cancelando suscripción en MercadoPago:', error.response?.data || error.message);
            
            return {
                success: false,
                error: error.response?.data || error.message,
                message: 'Error al cancelar suscripción en MercadoPago'
            };
        }
    }

    // Buscar suscripciones
    async searchSubscriptions(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.payer_email) params.append('payer_email', filters.payer_email);
            if (filters.status) params.append('status', filters.status);
            if (filters.external_reference) params.append('external_reference', filters.external_reference);
            if (filters.limit) params.append('limit', filters.limit);
            if (filters.offset) params.append('offset', filters.offset);

            const response = await axios.get(
                `${MP_CONFIG.BASE_URL}/preapproval/search?${params.toString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('❌ Error buscando suscripciones en MercadoPago:', error.response?.data || error.message);
            
            return {
                success: false,
                error: error.response?.data || error.message,
                message: 'Error al buscar suscripciones en MercadoPago'
            };
        }
    }
}

export default new MercadoPagoService();
