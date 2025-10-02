/**
 * Servicio de Polar.sh para pagos internacionales
 * Maneja productos, precios, checkouts y suscripciones
 */

import axios from 'axios';
import POLAR_CONFIG from '../config/polar.config.js';

class PolarService {
  constructor() {
    this.apiKey = POLAR_CONFIG.apiKey;
    this.apiUrl = POLAR_CONFIG.apiUrl;
    this.organizationName = POLAR_CONFIG.organizationName;
    
    // Configurar axios con headers por defecto
    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: POLAR_CONFIG.timeout,
      headers: {
        ...POLAR_CONFIG.defaultHeaders,
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
  }

  /**
   * Crear o actualizar productos en Polar.sh
   */
  async createProducts() {
    try {
      console.log('🏗️ Creando productos en Polar.sh...');
      
      const products = [];
      
      for (const [planKey, planConfig] of Object.entries(POLAR_CONFIG.defaultProducts)) {
        try {
          // Crear producto
          const productData = {
            name: planConfig.name,
            description: planConfig.description,
            type: 'individual', // Tipo de producto
            is_recurring: true,
            organization_name: this.organizationName
          };
          
          console.log(`📦 Creando producto: ${planConfig.name}`);
          
          const productResponse = await this.client.post('/v1/products', productData);
          const product = productResponse.data;
          
          console.log(`✅ Producto creado: ${product.id}`);
          
          // Crear precios mensuales y anuales
          const monthlyPrice = await this.createPrice(product.id, planConfig.monthlyPrice, 'month');
          const yearlyPrice = await this.createPrice(product.id, planConfig.yearlyPrice, 'year');
          
          products.push({
            planKey,
            product,
            prices: {
              monthly: monthlyPrice,
              yearly: yearlyPrice
            }
          });
          
        } catch (productError) {
          console.error(`❌ Error creando producto ${planKey}:`, productError.response?.data || productError.message);
        }
      }
      
      console.log(`✅ Productos creados en Polar.sh: ${products.length}`);
      return products;
      
    } catch (error) {
      console.error('❌ Error creando productos en Polar.sh:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Crear precio para un producto
   */
  async createPrice(productId, amount, interval) {
    try {
      const priceData = {
        product_id: productId,
        price_amount: Math.round(amount * 100), // Convertir a centavos
        price_currency: 'USD',
        type: 'recurring',
        recurring_interval: interval
      };
      
      console.log(`💰 Creando precio ${interval} para producto ${productId}: $${amount} USD`);
      
      const response = await this.client.post('/v1/products/prices', priceData);
      
      console.log(`✅ Precio ${interval} creado: ${response.data.id}`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Error creando precio ${interval}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtener productos existentes
   */
  async getProducts() {
    try {
      const response = await this.client.get(`/v1/products?organization_name=${this.organizationName}`);
      return response.data.items || [];
    } catch (error) {
      console.error('❌ Error obteniendo productos:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Obtener precios de un producto
   */
  async getProductPrices(productId) {
    try {
      const response = await this.client.get(`/v1/products/${productId}/prices`);
      return response.data.items || [];
    } catch (error) {
      console.error('❌ Error obteniendo precios:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Crear checkout session para Polar.sh
   */
  async createCheckout(planId, userEmail, userName, billingCycle = 'monthly', userCountry = 'US') {
    try {
      console.log('🛒 Creando checkout en Polar.sh:', { planId, userEmail, billingCycle, userCountry });
      
      // Mapear planId de MongoDB a ID de producto de Polar.sh
      // NOTA: El ID del Starter fue actualizado
      const productIdMap = {
        '68c0e78c8569f3bd38159b24': 'da90ff1e-3a99-4406-a01a-05e37a406666', // Starter Anual
        '68c0e78c8569f3bd38159b25': '08f0bc5f-eba0-4843-a165-f3b7162466de', // Starter Mensual
        '68c0e78c8569f3bd38159b26': 'ad058d5a-152c-4011-8704-e889d7c0bf20', // Professional  
        '68c0e78c8569f3bd38159b27': 'fab7e903-49d2-49de-8996-165f1b900102', // Enterprise
        'starter-plan-fallback': '08f0bc5f-eba0-4843-a165-f3b7162466de', // Starter Mensual
        'professional-plan-fallback': 'ad058d5a-152c-4011-8704-e889d7c0bf20',
        'enterprise-plan-fallback': 'fab7e903-49d2-49de-8996-165f1b900102',
        // Planes anuales fallback que faltan
        'starter-plan-yearly-fallback': 'da90ff1e-3a99-4406-a01a-05e37a406666',
        'professional-plan-yearly-fallback': '3bab8c02-e3f3-41a6-aedf-4f43c62a96f8',
        'enterprise-plan-yearly-fallback': '2cb93169-d27c-40b6-a3f6-0745171f2a72',
        // IDs específicos de Polar.sh para planes anuales
        'da90ff1e-3a99-4406-a01a-05e37a406666': 'da90ff1e-3a99-4406-a01a-05e37a406666', // Starter Anual
        '3bab8c02-e3f3-41a6-aedf-4f43c62a96f8': '3bab8c02-e3f3-41a6-aedf-4f43c62a96f8', // Professional Anual
        '2cb93169-d27c-40b6-a3f6-0745171f2a72': '2cb93169-d27c-40b6-a3f6-0745171f2a72'  // Enterprise Anual
      };
      
      const polarProductId = productIdMap[planId];
      if (!polarProductId) {
        console.log('❌ Plan ID no encontrado:', planId);
        console.log('📋 IDs disponibles:', Object.keys(productIdMap));
        throw new Error(`Plan ID no válido: ${planId}`);
      }
      
      console.log(`🔄 Mapeando planId ${planId} → ${polarProductId}`);
      
      // Crear checkout session directamente con el ID del producto
      const checkoutData = {
        products: [polarProductId],
        success_url: `${POLAR_CONFIG.successUrl}?lang=es&plan=${planId}&billing=${billingCycle}`,
        customer_email: userEmail,
        customer_name: userName,
        metadata: {
          planId: planId,
          billingCycle: billingCycle,
          userCountry: userCountry,
          source: 'leonix-web'
        }
      };
      
      console.log('📋 Datos del checkout:', checkoutData);
      
      const response = await this.client.post('/v1/checkouts', checkoutData);
      const checkout = response.data;
      
      console.log('✅ Checkout creado en Polar.sh:', checkout.id);
      
      return {
        checkoutId: checkout.id,
        checkoutUrl: checkout.url,
        processor: 'polar'
      };
      
    } catch (error) {
      console.error('❌ Error creando checkout en Polar.sh:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verificar el estado de un checkout
   */
  async getCheckoutStatus(checkoutId) {
    try {
      const response = await this.client.get(`/v1/checkouts/${checkoutId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo estado del checkout:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtener suscripción por ID
   */
  async getSubscription(subscriptionId) {
    try {
      const response = await this.client.get(`/v1/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo suscripción:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Cancelar suscripción
   */
  async cancelSubscription(subscriptionId) {
    try {
      console.log(`🚫 Cancelando suscripción en Polar.sh: ${subscriptionId}`);
      
      // Primero verificar si la suscripción existe
      let subscription;
      try {
        const getResponse = await this.client.get(`/v1/subscriptions/${subscriptionId}`);
        subscription = getResponse.data;
        console.log('📋 Suscripción encontrada:', subscription.id, 'Estado:', subscription.status);
      } catch (getError) {
        console.error('❌ Suscripción no encontrada en Polar.sh:', subscriptionId);
        console.error('Error details:', getError.response?.data || getError.message);
        
        // Si la suscripción no existe en Polar.sh, considerarla como ya cancelada
        if (getError.response?.status === 404) {
          console.log('ℹ️ Suscripción no encontrada en Polar.sh - considerando como ya cancelada');
          return {
            success: true,
            message: 'Suscripción no encontrada en Polar.sh - ya cancelada o no existe',
            status: 'not_found_assumed_cancelled'
          };
        }
        
        throw new Error(`Error verificando suscripción en Polar.sh: ${getError.response?.data?.detail || getError.message}`);
      }
      
      // Verificar si ya está cancelada
      if (subscription.status === 'cancelled' || subscription.status === 'canceled') {
        console.log('ℹ️ Suscripción ya está cancelada en Polar.sh');
        return {
          success: true,
          message: 'Suscripción ya estaba cancelada en Polar.sh',
          status: 'already_cancelled'
        };
      }
      
      // Usar DELETE en lugar de POST según la documentación
      const response = await this.client.delete(`/v1/subscriptions/${subscriptionId}`);
      
      console.log('✅ Suscripción cancelada exitosamente en Polar.sh:', response.data);
      return {
        success: true,
        data: response.data,
        message: 'Suscripción cancelada exitosamente en Polar.sh'
      };
      
    } catch (error) {
      console.error('❌ Error cancelando suscripción en Polar.sh:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Error al cancelar suscripción en Polar.sh'
      };
    }
  }

  /**
   * Verificar webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', POLAR_CONFIG.webhookSecret)
        .update(payload)
        .digest('hex');
      
      return signature === `sha256=${expectedSignature}`;
    } catch (error) {
      console.error('❌ Error verificando webhook signature:', error);
      return false;
    }
  }

  /**
   * Procesar webhook de Polar.sh
   */
  async processWebhook(eventType, data) {
    try {
      console.log('🔔 Procesando webhook de Polar.sh:', eventType);
      
      switch (eventType) {
        case 'checkout.created':
          console.log('🛒 Checkout creado:', data.id);
          break;
          
        case 'checkout.updated':
          console.log('🔄 Checkout actualizado:', data.id, 'Estado:', data.status);
          
          if (data.status === 'confirmed') {
            // Checkout completado exitosamente
            return await this.handleSuccessfulPayment(data);
          }
          break;

        case 'order.updated':
          console.log('📦 Orden actualizada:', data.id, 'Estado:', data.status);
          
          // Verificar si la orden tiene una suscripción activa
          if (data.subscription && data.subscription.status === 'active') {
            console.log('💰 Orden con suscripción activa - procesando pago...');
            return await this.handleSuccessfulOrderPayment(data);
          }
          break;
          
        case 'subscription.created':
          console.log('📅 Suscripción creada:', data.id);
          break;
          
        case 'subscription.updated':
          console.log('🔄 Suscripción actualizada:', data.id, 'Estado:', data.status);
          
          // Procesar cambios de estado de suscripción
          const subscriptionMonitoringService = await import('./subscriptionMonitoring.services.js');
          return await subscriptionMonitoringService.default.processPolarSubscriptionWebhook(eventType, data);
          
        case 'subscription.canceled':
        case 'subscription.past_due':
          console.log('🚫 Suscripción con problema:', data.id, 'Evento:', eventType);
          
          // Procesar cancelación o pago vencido
          const monitoringService = await import('./subscriptionMonitoring.services.js');
          return await monitoringService.default.processPolarSubscriptionWebhook(eventType, data);
          
        default:
          console.log('ℹ️ Evento no manejado:', eventType);
      }
      
      return { success: true, eventType };
      
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
      throw error;
    }
  }

  /**
   * Manejar pago exitoso
   */
  async handleSuccessfulPayment(checkoutData) {
    try {
      console.log('💰 Procesando pago exitoso de Polar.sh:', checkoutData.id);
      
      const metadata = checkoutData.metadata || {};
      const planId = metadata.planId;
      const billingCycle = metadata.billingCycle || 'monthly';
      
      // Intentar obtener el email del cliente de diferentes campos
      const userEmail = checkoutData.customer_email || 
                       checkoutData.customer?.email ||
                       checkoutData.email ||
                       metadata.userEmail;
      
      console.log('📧 Email detectado:', userEmail);
      console.log('🔍 Datos disponibles para email:', {
        customer_email: checkoutData.customer_email,
        customer: checkoutData.customer,
        email: checkoutData.email,
        metadata_userEmail: metadata.userEmail
      });
      
      if (!planId) {
        throw new Error('No se encontró planId en los metadatos del checkout');
      }
      
      if (!userEmail) {
        throw new Error('No se encontró email del cliente en el checkout. Campos disponibles: ' + Object.keys(checkoutData).join(', '));
      }
      
      // Importar el servicio de procesamiento de pagos
      const paymentProcessingService = await import('./paymentProcessing.services.js');
      
      // Procesar el pago exitoso (asignar plan al tenant)
      const result = await paymentProcessingService.default.processSuccessfulPayment({
        processor: 'polar',
        checkoutId: checkoutData.id,
        subscriptionId: checkoutData.subscription?.id,
        planId: planId,
        userEmail: userEmail,
        billingCycle: billingCycle,
        amount: checkoutData.amount,
        currency: checkoutData.currency || 'USD',
        metadata: metadata
      });
      
      console.log('✅ Pago procesado exitosamente:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error procesando pago exitoso:', error);
      throw error;
    }
  }

  /**
   * Manejar pago exitoso desde order.updated
   */
  async handleSuccessfulOrderPayment(orderData) {
    try {
      console.log('💰 Procesando pago exitoso desde orden de Polar.sh:', orderData.id);
      
      const metadata = orderData.metadata || {};
      const subscription = orderData.subscription;
      const planId = metadata.planId;
      const billingCycle = metadata.billingCycle || 'monthly';
      const userEmail = orderData.customer?.email;
      
      if (!planId || !userEmail || !subscription) {
        throw new Error('Datos insuficientes en la orden para procesar el pago');
      }
      
      // Importar el servicio de procesamiento de pagos
      const paymentProcessingService = await import('./paymentProcessing.services.js');
      
      // Procesar el pago exitoso (asignar plan al tenant)
      const result = await paymentProcessingService.default.processSuccessfulPayment({
        processor: 'polar',
        orderId: orderData.id,
        subscriptionId: subscription.id,
        planId: planId,
        userEmail: userEmail,
        billingCycle: billingCycle,
        amount: orderData.amount,
        currency: subscription.currency || 'USD',
        metadata: metadata
      });
      
      console.log('✅ Pago desde orden procesado exitosamente:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error procesando pago desde orden:', error);
      throw error;
    }
  }

  /**
   * Obtener información de facturación del cliente
   */
  async getCustomerBilling(customerId) {
    try {
      const response = await this.client.get(`/v1/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo información del cliente:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Detectar país del usuario por IP (usando un servicio externo)
   */
  async detectUserCountry(userIP) {
    try {
      // Usar un servicio gratuito para detectar país por IP
      const response = await axios.get(`http://ip-api.com/json/${userIP}?fields=countryCode`);
      return response.data.countryCode || 'US';
    } catch (error) {
      console.error('Error detectando país del usuario:', error);
      return 'US'; // País por defecto
    }
  }
  /**
   * Procesar webhook de Polar.sh
   */
  async processWebhook(eventType, data) {
    try {
      console.log('🔔 Procesando webhook de Polar.sh:', eventType);
      console.log('📋 Datos del webhook:', JSON.stringify(data, null, 2));
      
      switch (eventType) {
        case 'checkout.created':
          console.log('🛒 Checkout creado:', data.id);
          break;
        
        case 'checkout.updated':
          console.log('🔄 Checkout actualizado:', data.id, 'Estado:', data.status);
          
          if (data.status === 'confirmed') {
            // Checkout completado exitosamente
            console.log('✅ Checkout confirmado - procesando pago...');
            return await this.handleSuccessfulPayment(data);
          }
          break;

        case 'order.created':
          console.log('📦 Orden creada:', data.id);
          break;

        case 'order.paid':
          console.log('💰 Orden pagada:', data.id);
          // Procesar pago exitoso desde orden
          return await this.handleSuccessfulOrderPayment(data);

        case 'order.updated':
          console.log('📦 Orden actualizada:', data.id, 'Estado:', data.status);
          
          // Verificar si la orden tiene una suscripción activa
          if (data.subscription && data.subscription.status === 'active') {
            console.log('💰 Orden con suscripción activa - procesando pago...');
            return await this.handleSuccessfulOrderPayment(data);
          }
          break;
        
        case 'subscription.created':
          console.log('📅 Suscripción creada:', data.id);
          break;

        case 'subscription.active':
          console.log('✅ Suscripción activada:', data.id);
          // Procesar activación de suscripción
          return await this.handleSubscriptionActivation(data);
        
        case 'subscription.updated':
          console.log('🔄 Suscripción actualizada:', data.id, 'Estado:', data.status);
          
          // Si la suscripción se activó, procesarla
          if (data.status === 'active') {
            console.log('✅ Suscripción ahora activa - procesando...');
            return await this.handleSubscriptionActivation(data);
          }
          
          // Procesar cambios de estado de suscripción
          const subscriptionMonitoringService = await import('./subscriptionMonitoring.services.js');
          return await subscriptionMonitoringService.default.processPolarSubscriptionWebhook(eventType, data);
        
        case 'subscription.canceled':
        case 'subscription.past_due':
          console.log('🚫 Suscripción con problema:', data.id, 'Evento:', eventType);
          
          // Procesar cancelación o pago vencido
          const monitoringService = await import('./subscriptionMonitoring.services.js');
          return await monitoringService.default.processPolarSubscriptionWebhook(eventType, data);

        case 'customer.created':
          console.log('👤 Cliente creado:', data.id);
          break;

        case 'customer.state_changed':
          console.log('👤 Estado del cliente cambiado:', data.id);
          break;
        
        default:
          console.log('ℹ️ Evento no manejado:', eventType);
      }
      
      return { success: true, eventType };
      
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
      throw error;
    }
  }

  /**
   * Manejar pago exitoso
   */
  async handleSuccessfulPayment(checkoutData) {
    try {
      console.log('💰 Procesando pago exitoso de Polar.sh:', checkoutData.id);
      
      const metadata = checkoutData.metadata || {};
      const planId = metadata.planId;
      const billingCycle = metadata.billingCycle || 'monthly';
      
      // Intentar obtener el email del cliente de diferentes campos
      const userEmail = checkoutData.customer_email || 
                       checkoutData.customer?.email ||
                       checkoutData.email ||
                       metadata.userEmail;
      
      console.log('📧 Email detectado:', userEmail);
      console.log('🔍 Datos disponibles para email:', {
        customer_email: checkoutData.customer_email,
        customer: checkoutData.customer,
        email: checkoutData.email,
        metadata_userEmail: metadata.userEmail
      });
      
      if (!planId) {
        throw new Error('No se encontró planId en los metadatos del checkout');
      }
      
      if (!userEmail) {
        throw new Error('No se encontró email del cliente en el checkout. Campos disponibles: ' + Object.keys(checkoutData).join(', '));
      }
      
      // Importar el servicio de procesamiento de pagos
      const paymentProcessingService = await import('./paymentProcessing.services.js');
      
      // Procesar el pago exitoso (asignar plan al tenant)
      const result = await paymentProcessingService.default.processSuccessfulPayment({
        processor: 'polar',
        checkoutId: checkoutData.id,
        subscriptionId: checkoutData.subscription?.id,
        planId: planId,
        userEmail: userEmail,
        billingCycle: billingCycle,
        amount: checkoutData.amount,
        currency: checkoutData.currency || 'USD',
        metadata: metadata
      });
      
      console.log('✅ Pago procesado exitosamente:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error procesando pago exitoso:', error);
      throw error;
    }
  }

  /**
   * Manejar pago exitoso desde order.updated
   */
  async handleSuccessfulOrderPayment(orderData) {
    try {
      console.log('💰 Procesando pago exitoso desde orden de Polar.sh:', orderData.id);
      
      const metadata = orderData.metadata || {};
      const subscription = orderData.subscription;
      const planId = metadata.planId;
      const billingCycle = metadata.billingCycle || 'monthly';
      const userEmail = orderData.customer?.email;
      
      if (!planId || !userEmail || !subscription) {
        throw new Error('Datos insuficientes en la orden para procesar el pago');
      }
      
      // Importar el servicio de procesamiento de pagos
      const paymentProcessingService = await import('./paymentProcessing.services.js');
      
      // Procesar el pago exitoso (asignar plan al tenant)
      const result = await paymentProcessingService.default.processSuccessfulPayment({
        processor: 'polar',
        orderId: orderData.id,
        subscriptionId: subscription.id,
        planId: planId,
        userEmail: userEmail,
        billingCycle: billingCycle,
        amount: orderData.amount,
        currency: subscription.currency || 'USD',
        metadata: metadata
      });
      
      console.log('✅ Pago desde orden procesado exitosamente:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error procesando pago desde orden:', error);
      throw error;
    }
  }

  /**
   * Obtener información de facturación del cliente
   */
  async getCustomerBilling(customerId) {
    try {
      const response = await this.client.get(`/v1/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo información del cliente:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Detectar país del usuario por IP (usando un servicio externo)
   */
  async detectUserCountryByIP(userIP) {
    try {
      // Usar un servicio gratuito para detectar país por IP
      const response = await axios.get(`http://ip-api.com/json/${userIP}?fields=countryCode`);
      return response.data.countryCode || 'US';
    } catch (error) {
      console.warn('⚠️ No se pudo detectar país por IP, usando US por defecto');
      return 'US';
    }
  }


  /**
   * Manejar activación de suscripción
   */
  async handleSubscriptionActivation(subscriptionData) {
    try {
      console.log('✅ Procesando activación de suscripción de Polar.sh:', subscriptionData.id);
      
      const metadata = subscriptionData.metadata || {};
      const planId = metadata.planId;
      const billingCycle = metadata.billingCycle || 'monthly';
      const userEmail = subscriptionData.customer?.email || metadata.userEmail;
      
      if (!planId || !userEmail) {
        console.error('❌ Datos insuficientes:', { planId, userEmail, metadata });
        throw new Error('Datos insuficientes en la suscripción para procesar la activación');
      }
      
      // Importar el servicio de procesamiento de pagos
      const paymentProcessingService = await import('./paymentProcessing.services.js');
      
      // Procesar el pago exitoso (asignar plan al tenant)
      const result = await paymentProcessingService.default.processSuccessfulPayment({
        processor: 'polar',
        subscriptionId: subscriptionData.id,
        planId: planId,
        userEmail: userEmail,
        billingCycle: billingCycle,
        amount: subscriptionData.amount,
        currency: subscriptionData.currency || 'USD',
        metadata: metadata
      });
      
      console.log('✅ Activación de suscripción procesada exitosamente:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error procesando activación de suscripción:', error);
      throw error;
    }
  }
}

export default new PolarService();
