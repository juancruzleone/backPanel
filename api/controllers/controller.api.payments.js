/**
 * Controlador unificado de pagos
 * Maneja checkout con MercadoPago (Argentina) y Polar.sh (Internacional)
 */

import paymentRouterService from '../../services/paymentRouter.services.js';
import { validateToken } from '../../services/token.service.js';

class PaymentsController {
  
  /**
   * Crear checkout unificado con detección automática de país
   * POST /api/payments/checkout
   */
  async createCheckout(req, res) {
    try {
      console.log('🚀 POST /api/payments/checkout - Iniciando checkout unificado');
      
      const { planId, billingCycle = 'monthly', country } = req.body;
      
      if (!planId) {
        return res.status(400).json({
          success: false,
          message: 'planId es requerido'
        });
      }
      
      // Validar token de autenticación
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Token de autorización requerido'
        });
      }
      
      const token = authHeader.split(' ')[1];
      const tokenData = await validateToken(token);
      
      if (!tokenData) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido o expirado'
        });
      }
      
      // Extraer datos del usuario del token
      const userEmail = tokenData.email;
      const userName = tokenData.name || tokenData.userName || 'Usuario';
      const userCountry = tokenData.country || country || 'US'; // Usar país del usuario o fallback
      const tenantId = tokenData.tenantId; // Obtener tenantId del token
      
      console.log('👤 Usuario autenticado:', { email: userEmail, name: userName, country: userCountry });
      
      // Preparar datos simplificados (país del usuario tiene prioridad)
      const requestData = {
        country: userCountry, // País del usuario desde BD
        tenantId: tenantId, // Agregar tenantId
        userEmail: userEmail, // Agregar email del usuario
        ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
        acceptLanguage: req.headers['accept-language']
      };
      
      console.log('🌍 Datos del usuario:', requestData);
      
      // Crear checkout unificado
      const checkoutResult = await paymentRouterService.createUnifiedCheckout(
        planId,
        userEmail,
        userName,
        billingCycle,
        requestData
      );
      
      console.log('✅ Checkout creado:', {
        processor: checkoutResult.processor,
        country: checkoutResult.userCountry,
        hasUrl: !!checkoutResult.checkoutUrl
      });
      
      res.json({
        success: true,
        data: {
          checkoutUrl: checkoutResult.checkoutUrl,
          init_point: checkoutResult.checkoutUrl, // Compatibilidad con frontend existente
          processor: checkoutResult.processor,
          currency: checkoutResult.currency,
          userCountry: checkoutResult.userCountry,
          detectionMethod: checkoutResult.detectionMethod
        }
      });
      
    } catch (error) {
      console.error('❌ Error en checkout unificado:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }
  
  /**
   * Webhook de MercadoPago
   * POST /api/payments/webhook/mercadopago
   */
  async webhookMercadoPago(req, res) {
    try {
      console.log('🔔 Webhook MercadoPago recibido');
      console.log('📋 Datos completos del webhook:', JSON.stringify(req.body, null, 2));
      console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
      
      // Responder inmediatamente a MercadoPago
      res.status(200).json({ success: true, message: 'Webhook recibido' });
      
      // Procesar el webhook de forma asíncrona
      setImmediate(async () => {
        try {
          console.log('🔄 Iniciando procesamiento asíncrono del webhook...');
          
          const result = await paymentRouterService.processWebhook(
            'mercadopago',
            req.body.type || 'payment',
            req.body,
            null,
            JSON.stringify(req.body)
          );
          
          console.log('✅ Webhook procesado exitosamente:', JSON.stringify(result, null, 2));
          
        } catch (error) {
          console.error('❌ Error procesando webhook de forma asíncrona:', error);
          console.error('Stack trace:', error.stack);
        }
      });
      
    } catch (error) {
      console.error('❌ Error en webhook MercadoPago:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Webhook de Polar.sh
   * POST /api/payments/webhook/polar
   */
  async webhookPolar(req, res) {
    try {
      console.log('🔔 Webhook Polar.sh recibido');
      
      const signature = req.headers['polar-signature'] || req.headers['x-polar-signature'];
      const eventType = req.headers['polar-event'] || req.body.type;
      
      const result = await paymentRouterService.processWebhook(
        'polar',
        eventType,
        req.body,
        signature,
        JSON.stringify(req.body)
      );
      
      res.json({ success: true, result });
      
    } catch (error) {
      console.error('❌ Error en webhook Polar.sh:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Obtener información de suscripción
   * GET /api/payments/subscription/:processor/:id
   */
  async getSubscription(req, res) {
    try {
      const { processor, id } = req.params;
      
      if (!['mercadopago', 'polar'].includes(processor)) {
        return res.status(400).json({
          success: false,
          message: 'Procesador no válido'
        });
      }
      
      const subscription = await paymentRouterService.getSubscription(processor, id);
      
      res.json({
        success: true,
        data: subscription
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo suscripción:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Cancelar suscripción
   * POST /api/payments/subscription/cancel
   */
  async cancelSubscription(req, res) {
    try {
      const { processor, subscriptionId } = req.body;
      
      if (!processor || !subscriptionId) {
        return res.status(400).json({
          success: false,
          message: 'processor y subscriptionId son requeridos'
        });
      }
      
      // Validar token de autenticación
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Token de autorización requerido'
        });
      }
      
      const token = authHeader.split(' ')[1];
      const tokenData = await validateToken(token);
      
      if (!tokenData) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido o expirado'
        });
      }
      
      const result = await paymentRouterService.cancelSubscription(processor, subscriptionId);
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('❌ Error cancelando suscripción:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Obtener estadísticas de pagos
   * GET /api/payments/stats
   */
  async getPaymentStats(req, res) {
    try {
      const stats = await paymentRouterService.getPaymentStats();
      
      res.json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Validar configuración de procesadores
   * GET /api/payments/validate
   */
  async validateProcessors(req, res) {
    try {
      const validation = await paymentRouterService.validateProcessors();
      
      res.json({
        success: true,
        data: validation
      });
      
    } catch (error) {
      console.error('❌ Error validando procesadores:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Detectar país del usuario
   * GET /api/payments/detect-country
   */
  async detectCountry(req, res) {
    try {
      const requestData = {
        ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
        acceptLanguage: req.headers['accept-language']
      };
      
      const country = await paymentRouterService.detectUserCountry(
        requestData.ip,
        requestData.userAgent,
        requestData.acceptLanguage
      );
      
      const processor = paymentRouterService.getProcessorForCountry(country);
      
      res.json({
        success: true,
        data: {
          country,
          processor,
          detectionData: requestData
        }
      });
      
    } catch (error) {
      console.error('❌ Error detectando país:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new PaymentsController();
