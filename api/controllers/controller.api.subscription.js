const subscriptionService = require('../../services/subscriptions.services');
const mercadopagoService = require('../../services/mercadopago.services');
const polarService = require('../../services/polar.services');

/**
 * Cancelar suscripción del usuario
 */
async function cancelSubscription(req, res) {
  try {
    const { paymentProvider, subscriptionId, preapprovalId } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    console.log('🚫 Cancelando suscripción:', { 
      userId, 
      tenantId, 
      paymentProvider, 
      subscriptionId, 
      preapprovalId 
    });

    if (!paymentProvider) {
      return res.status(400).json({
        success: false,
        message: 'Proveedor de pagos requerido'
      });
    }

    let cancelResult;

    if (paymentProvider === 'mercadopago') {
      if (!preapprovalId) {
        return res.status(400).json({
          success: false,
          message: 'ID de preapproval requerido para MercadoPago'
        });
      }

      // Cancelar en MercadoPago
      cancelResult = await mercadopagoService.cancelPreapproval(preapprovalId);
      
      if (cancelResult.success) {
        // Actualizar estado en la base de datos y establecer plan en null
        await subscriptionService.cancelSubscription(tenantId, 'mercadopago');
        await subscriptionService.updateTenantPlan(tenantId, null);
      }

    } else if (paymentProvider === 'polar') {
      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          message: 'ID de suscripción requerido para Polar.sh'
        });
      }

      // Cancelar en Polar.sh
      cancelResult = await polarService.cancelSubscription(subscriptionId);
      
      if (cancelResult.success) {
        // Actualizar estado en la base de datos y establecer plan en null
        await subscriptionService.cancelSubscription(tenantId, 'polar');
        await subscriptionService.updateTenantPlan(tenantId, null);
      }

    } else {
      return res.status(400).json({
        success: false,
        message: 'Proveedor de pagos no soportado'
      });
    }

    if (cancelResult.success) {
      console.log('✅ Suscripción cancelada exitosamente');
      res.json({
        success: true,
        message: 'Suscripción cancelada exitosamente',
        data: cancelResult.data
      });
    } else {
      console.error('❌ Error al cancelar suscripción:', cancelResult.error);
      res.status(400).json({
        success: false,
        message: cancelResult.message || 'Error al cancelar suscripción',
        error: cancelResult.error
      });
    }

  } catch (error) {
    console.error('❌ Error en cancelSubscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
}

module.exports = {
  cancelSubscription
};
