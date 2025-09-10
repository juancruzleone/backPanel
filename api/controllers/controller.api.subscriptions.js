// api/controllers/controller.api.subscriptions.js
import * as subscriptionServices from "../../services/subscriptions.services.js"

// Crear checkout de MercadoPago para suscripción
async function createCheckout(req, res) {
  try {
    const { planId, successUrl, failureUrl, pendingUrl } = req.body;
    
    // Obtener tenantId desde el middleware
    const tenantId = req.user?.tenantId || req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo identificar el tenant'
      });
    }

    if (!planId || !successUrl) {
      return res.status(400).json({
        success: false,
        message: 'planId y successUrl son requeridos'
      });
    }

    const result = await subscriptionServices.createMercadoPagoCheckout({
      planId,
      tenantId,
      successUrl,
      failureUrl: failureUrl || `${successUrl.split('/subscription')[0]}/subscription/failure`,
      pendingUrl: pendingUrl || `${successUrl.split('/subscription')[0]}/subscription/pending`
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error en createCheckout:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
}

// Webhook de MercadoPago
async function mercadoPagoWebhook(req, res) {
  try {
    const { type, data } = req.body;
    
    console.log('🔔 Webhook MercadoPago recibido:', { type, data });

    if (type === 'payment') {
      const result = await subscriptionServices.processPaymentNotification(data.id);
      console.log('✅ Pago procesado:', result);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error en webhook MercadoPago:', error);
    res.status(500).send('Error');
  }
}

// Obtener estado de suscripción del usuario
async function getSubscriptionStatus(req, res) {
  try {
    // Obtener tenantId desde el middleware
    const tenantId = req.user?.tenantId || req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo identificar el tenant'
      });
    }
    
    const result = await subscriptionServices.getSubscriptionStatus(tenantId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error en getSubscriptionStatus:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
}

export { 
  createCheckout, 
  mercadoPagoWebhook, 
  getSubscriptionStatus 
};