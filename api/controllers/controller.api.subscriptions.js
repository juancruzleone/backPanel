// api/controllers/controller.api.subscriptions.js
import * as subscriptionServices from "../../services/subscriptions.services.js"

// Crear checkout de MercadoPago para suscripción
async function createCheckout(req, res) {
  console.log('🎯 [CHECKOUT] Iniciando proceso de checkout');
  console.log('🔍 [CHECKOUT] Headers recibidos:', {
    authorization: req.headers.authorization ? 'Bearer ***' : 'No existe',
    contentType: req.headers['content-type']
  });
  
  try {
    // Verificar autenticación
    console.log('🔐 [CHECKOUT] Verificando autenticación...');
    console.log('🔐 [CHECKOUT] req.user:', req.user ? 'Existe' : 'No existe');
    
    if (!req.user) {
      console.log('❌ [CHECKOUT] Usuario no autenticado');
      return res.status(401).json({
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Debe iniciar sesión para continuar con la compra'
      });
    }

    console.log('✅ [CHECKOUT] Usuario autenticado:', {
      id: req.user._id,
      userName: req.user.userName,
      email: req.user.email,
      tenantId: req.user.tenantId,
      role: req.user.role
    });

    const { planId, successUrl, failureUrl, pendingUrl } = req.body;
    console.log('📋 [CHECKOUT] Datos del request:', { planId, successUrl, failureUrl, pendingUrl });
    
    // Obtener tenantId desde el usuario autenticado
    const tenantId = req.user.tenantId;
    
    if (!tenantId) {
      console.log('❌ [CHECKOUT] TenantId no encontrado');
      return res.status(400).json({
        success: false,
        code: 'INVALID_TENANT',
        message: 'No se pudo identificar la organización'
      });
    }

    console.log('🏢 [CHECKOUT] TenantId válido:', tenantId);

    if (!planId || !successUrl) {
      return res.status(400).json({
        success: false,
        message: 'planId y successUrl son requeridos'
      });
    }

    console.log('💳 [CHECKOUT] Creando checkout de MercadoPago...');
    const result = await subscriptionServices.createMercadoPagoCheckout({
      planId,
      tenantId,
      successUrl,
      failureUrl: failureUrl || `${successUrl.split('/subscription')[0]}/subscription/failure`,
      pendingUrl: pendingUrl || `${successUrl.split('/subscription')[0]}/subscription/pending`
    });

    console.log('✅ [CHECKOUT] Checkout creado exitosamente:', {
      checkoutUrl: result.data?.checkoutUrl || result.data?.init_point ? 'Generado' : 'No generado',
      preferenceId: result.data?.subscriptionId || 'No disponible'
    });

    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('❌ [CHECKOUT] Error en createCheckout:', error.message);
    console.error('❌ [CHECKOUT] Stack trace:', error.stack);
    
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      success: false,
      code: error.code || 'CHECKOUT_ERROR',
      message: error.message || 'Error al procesar el pago',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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