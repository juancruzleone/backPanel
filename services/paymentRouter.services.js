/**
 * Payment Router Service
 * Enruta automáticamente los pagos según el país del usuario:
 * - Argentina: MercadoPago
 * - Resto del mundo: Polar.sh
 */

import mercadoPagoService from './mercadopago.services.js';
import polarService from './polar.services.js';
import axios from 'axios';

class PaymentRouterService {
  constructor() {
    this.processors = {
      mercadopago: mercadoPagoService,
      polar: polarService
    };
    
    // Límite máximo de MercadoPago para suscripciones recurrentes
    this.MERCADOPAGO_MAX_AMOUNT = 250000; // ARS
  }

  /**
   * Detectar país del usuario por múltiples métodos
   */
  async detectUserCountry(userIP, userAgent, acceptLanguage) {
    try {
      let detectedCountry = 'US'; // Default
      
      // Método 1: Detección por IP usando ip-api.com (gratuito)
      if (userIP && userIP !== '127.0.0.1' && userIP !== '::1') {
        try {
          console.log(`🌍 Detectando país por IP: ${userIP}`);
          const ipResponse = await axios.get(`http://ip-api.com/json/${userIP}?fields=countryCode,country`, {
            timeout: 5000
          });
          
          if (ipResponse.data && ipResponse.data.countryCode) {
            detectedCountry = ipResponse.data.countryCode;
            console.log(`✅ País detectado por IP: ${detectedCountry} (${ipResponse.data.country})`);
            return detectedCountry;
          }
        } catch (ipError) {
          console.warn('⚠️ Error detectando país por IP:', ipError.message);
        }
      }
      
      // Método 2: Detección por Accept-Language header
      if (acceptLanguage) {
        try {
          const langCountryMap = {
            'es-AR': 'AR', 'es-MX': 'MX', 'es-ES': 'ES', 'es-CL': 'CL', 'es-CO': 'CO',
            'pt-BR': 'BR', 'en-US': 'US', 'en-GB': 'GB', 'en-CA': 'CA', 'en-AU': 'AU',
            'fr-FR': 'FR', 'fr-CA': 'CA', 'de-DE': 'DE', 'it-IT': 'IT', 'ja-JP': 'JP'
          };
          
          const primaryLang = acceptLanguage.split(',')[0].trim();
          if (langCountryMap[primaryLang]) {
            detectedCountry = langCountryMap[primaryLang];
            console.log(`🗣️ País detectado por idioma: ${detectedCountry} (${primaryLang})`);
            return detectedCountry;
          }
        } catch (langError) {
          console.warn('⚠️ Error detectando país por idioma:', langError.message);
        }
      }
      
      console.log(`🌍 País por defecto: ${detectedCountry}`);
      return detectedCountry;
      
    } catch (error) {
      console.error('❌ Error detectando país del usuario:', error);
      return 'US'; // Fallback seguro
    }
  }

  /**
   * Determinar qué procesador usar según el país y monto
   */
  getProcessorForCountry(countryCode, amount = 0) {
    // Si es Argentina pero el monto excede el límite de MercadoPago, usar Polar.sh
    if (countryCode === 'AR') {
      if (amount > this.MERCADOPAGO_MAX_AMOUNT) {
        console.log(`🚨 Monto $${amount} ARS excede límite de MercadoPago ($${this.MERCADOPAGO_MAX_AMOUNT}) - Usando Polar.sh`);
        return 'polar';
      } else {
        console.log('🇦🇷 Usuario de Argentina - Usando MercadoPago');
        return 'mercadopago';
      }
    } else {
      console.log(`🌍 Usuario de ${countryCode} - Usando Polar.sh`);
      return 'polar';
    }
  }

  /**
   * Obtener precio del plan
   */
  async getPlanPrice(planId, billingCycle) {
    try {
      // Importar configuración de planes
      const plansConfig = await import('../config/plans.config.js');
      
      // Mapear planId a nombre de plan
      let planName = planId;
      if (planId.includes('basic')) planName = billingCycle === 'yearly' ? 'basic-yearly' : 'basic';
      if (planId.includes('professional')) planName = billingCycle === 'yearly' ? 'professional-yearly' : 'professional';
      if (planId.includes('enterprise')) planName = billingCycle === 'yearly' ? 'enterprise-yearly' : 'enterprise';
      
      const planConfig = plansConfig.getPlanConfig(planName);
      return planConfig.price || 0;
      
    } catch (error) {
      console.warn('⚠️ Error obteniendo precio del plan:', error.message);
      return 0;
    }
  }

  /**
   * Crear checkout unificado que enruta según el país del usuario y monto
   */
  async createUnifiedCheckout(planId, userEmail, userName, billingCycle = 'monthly', requestData = {}) {
    try {
      console.log('🚀 Iniciando checkout unificado:', { planId, userEmail, billingCycle });
      
      // Usar país del usuario directamente (sin detección automática)
      const userCountry = requestData.country || 'US';
      console.log('🌍 País del usuario:', userCountry);
      
      // Obtener precio del plan para determinar el procesador
      const planPrice = await this.getPlanPrice(planId, billingCycle);
      console.log('💰 Precio del plan:', planPrice, 'ARS');
      
      // Determinar procesador basado en país y monto
      const processor = this.getProcessorForCountry(userCountry, planPrice);
      
      let checkoutResult;
      
      // Enrutar según el procesador determinado
      if (processor === 'mercadopago') {
        console.log('💳 Creando checkout con MercadoPago');
        checkoutResult = await this.createMercadoPagoCheckout(planId, userEmail, userName, billingCycle, userCountry, requestData);
      } else {
        console.log('🌐 Creando checkout con Polar.sh');
        checkoutResult = await this.createPolarCheckout(planId, userEmail, userName, billingCycle, userCountry);
      }
      
      // Agregar información del procesador al resultado
      return {
        ...checkoutResult,
        userCountry: userCountry,
        processor: processor,
        planPrice: planPrice
      };
      
    } catch (error) {
      console.error('❌ Error en checkout unificado:', error);
      throw error;
    }
  }

  /**
   * Crear checkout con MercadoPago
   */
  async createMercadoPagoCheckout(planId, userEmail, userName, billingCycle, userCountry, requestData) {
    try {
      console.log('💳 Creando checkout con MercadoPago');
      
      // Usar el servicio existente de MercadoPago
      const subscriptionsService = await import('./subscriptions.services.js');
      
      // Obtener tenantId del usuario desde requestData
      const tenantId = requestData?.tenantId;
      
      const result = await subscriptionsService.createMercadoPagoCheckout({
        planId: planId,
        tenantId: tenantId,
        userEmail: requestData?.userEmail,
        successUrl: `${process.env.FRONTEND_URL || 'https://panelmantenimiento.netlify.app'}/subscription/success?lang=es`,
        failureUrl: `${process.env.FRONTEND_URL || 'https://panelmantenimiento.netlify.app'}/subscription/failed?lang=es`,
        pendingUrl: `${process.env.FRONTEND_URL || 'https://panelmantenimiento.netlify.app'}/subscription/pending?lang=es`
      });
      
      return {
        checkoutUrl: result.data?.checkoutUrl || result.data?.init_point,
        processor: 'mercadopago',
        currency: 'ARS'
      };
      
    } catch (error) {
      console.error('❌ Error creando checkout MercadoPago:', error);
      throw error;
    }
  }

  /**
   * Crear checkout con Polar.sh
   */
  async createPolarCheckout(planId, userEmail, userName, billingCycle, userCountry) {
    try {
      console.log('🌐 Creando checkout con Polar.sh');
      
      const result = await polarService.createCheckout(
        planId, 
        userEmail, 
        userName, 
        billingCycle, 
        userCountry
      );
      
      return {
        checkoutUrl: result.checkoutUrl,
        checkoutId: result.checkoutId,
        processor: 'polar',
        currency: 'USD'
      };
      
    } catch (error) {
      console.error('❌ Error creando checkout Polar.sh:', error);
      throw error;
    }
  }

  /**
   * Obtener información de suscripción unificada
   */
  async getSubscription(processor, subscriptionId) {
    try {
      console.log(`📋 Obteniendo suscripción ${processor}: ${subscriptionId}`);
      
      if (processor === 'mercadopago') {
        return await mercadoPagoService.getSubscription(subscriptionId);
      } else if (processor === 'polar') {
        return await polarService.getSubscription(subscriptionId);
      } else {
        throw new Error(`Procesador no soportado: ${processor}`);
      }
      
    } catch (error) {
      console.error('❌ Error obteniendo suscripción:', error);
      throw error;
    }
  }

  /**
   * Cancelar suscripción unificada
   */
  async cancelSubscription(processor, subscriptionId) {
    try {
      console.log(`🚫 Cancelando suscripción ${processor}: ${subscriptionId}`);
      
      // Cancelar en el procesador de pagos
      let cancelResult;
      if (processor === 'mercadopago') {
        cancelResult = await mercadoPagoService.cancelSubscription(subscriptionId);
      } else if (processor === 'polar') {
        cancelResult = await polarService.cancelSubscription(subscriptionId);
      } else {
        throw new Error(`Procesador no soportado: ${processor}`);
      }
      
      // Si la cancelación fue exitosa o la suscripción no existe, actualizar el tenant en la base de datos
      if (cancelResult.success) {
        console.log('✅ Suscripción cancelada en procesador, actualizando tenant...');
        
        const { db } = await import('../db.js');
        const subscriptionsCollection = db.collection('subscriptions');
        const tenantsCollection = db.collection('tenants');
        
        // Buscar la suscripción en la BD
        const subscription = await subscriptionsCollection.findOne({ 
          subscriptionId: subscriptionId 
        });
        
        if (subscription) {
          console.log('📋 Suscripción encontrada en BD:', subscription._id);
          
          // Actualizar estado de la suscripción
          await subscriptionsCollection.updateOne(
            { _id: subscription._id },
            { 
              $set: { 
                status: 'cancelled',
                cancelledAt: new Date(),
                updatedAt: new Date(),
                cancelReason: cancelResult.status || 'user_requested'
              } 
            }
          );
          
          // Actualizar el tenant - buscar por tenantId string
          const tenantId = subscription.tenantId;
          const tenant = await tenantsCollection.findOne({ tenantId: tenantId });
          
          if (tenant) {
            await tenantsCollection.updateOne(
              { _id: tenant._id },
              { 
                $set: { 
                  subscriptionStatus: 'cancelled',
                  plan: 'free',
                  maxUsers: 1,
                  maxAssets: 5,
                  maxWorkOrders: 10,
                  updatedAt: new Date(),
                  updatedBy: 'payment_cancellation_system'
                },
                $unset: {
                  subscriptionExpiresAt: "",
                  subscriptionAmount: "",
                  subscriptionFrequency: ""
                }
              }
            );
            
            console.log('✅ Tenant actualizado a plan free');
          } else {
            console.warn('⚠️ No se encontró el tenant en BD:', tenantId);
          }
        } else {
          console.warn('⚠️ No se encontró la suscripción en BD con subscriptionId:', subscriptionId);
        }
      } else {
        console.error('❌ Error en cancelación del procesador:', cancelResult.error);
      }
      
      return cancelResult;
      
    } catch (error) {
      console.error('❌ Error cancelando suscripción:', error);
      throw error;
    }
  }

  /**
   * Procesar webhook unificado
   */
  async processWebhook(processor, eventType, data, signature, rawBody) {
    try {
      console.log(`🔔 Procesando webhook ${processor}: ${eventType}`);
      
      if (processor === 'mercadopago') {
        // Los webhooks de MercadoPago ya están implementados
        const paymentProcessingService = await import('./paymentProcessing.services.js');
        return await paymentProcessingService.default.processWebhook(data);
        
      } else if (processor === 'polar') {
        // Verificar signature de Polar.sh
        if (!polarService.verifyWebhookSignature(rawBody, signature)) {
          throw new Error('Signature de webhook inválida');
        }
        
        return await polarService.processWebhook(eventType, data);
        
      } else {
        throw new Error(`Procesador no soportado: ${processor}`);
      }
      
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de pagos por procesador
   */
  async getPaymentStats() {
    try {
      const stats = {
        mercadopago: {
          country: 'AR',
          currency: 'ARS',
          active: true
        },
        polar: {
          countries: 'International',
          currency: 'USD',
          active: true
        }
      };
      
      return stats;
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  /**
   * Validar configuración de procesadores
   */
  async validateProcessors() {
    try {
      const validation = {
        mercadopago: false,
        polar: false
      };
      
      // Validar MercadoPago
      try {
        const mpConfig = await import('../config/mercadopago.config.js');
        validation.mercadopago = !!(mpConfig.default.accessToken && mpConfig.default.publicKey);
      } catch (mpError) {
        console.warn('⚠️ Error validando MercadoPago:', mpError.message);
      }
      
      // Validar Polar.sh
      try {
        const polarConfig = await import('../config/polar.config.js');
        validation.polar = !!(polarConfig.default.apiKey);
      } catch (polarError) {
        console.warn('⚠️ Error validando Polar.sh:', polarError.message);
      }
      
      console.log('🔍 Validación de procesadores:', validation);
      return validation;
      
    } catch (error) {
      console.error('❌ Error validando procesadores:', error);
      return { mercadopago: false, polar: false };
    }
  }
}

export default new PaymentRouterService();
