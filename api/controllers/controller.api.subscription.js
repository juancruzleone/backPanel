import { cancelSubscription as cancelSubscriptionService, updateTenantPlan } from '../../services/subscriptions.services.js';
import mercadopagoService from '../../services/mercadopago.services.js';
import polarService from '../../services/polar.services.js';

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

    let cancelResult = { success: false };

    if (paymentProvider === 'mercadopago') {
      if (!preapprovalId) {
        return res.status(400).json({
          success: false,
          message: 'ID de preapproval requerido para MercadoPago'
        });
      }

      // Intentar cancelar en MercadoPago
      cancelResult = await mercadopagoService.cancelPreapproval(preapprovalId);
      
      // Si falla porque el ID es un payment ID en lugar de preapproval ID
      if (!cancelResult.success && cancelResult.error?.status === 404) {
        console.log('⚠️ ID no es un preapproval, intentando obtener preapproval desde payment ID...');
        
        // Intentar obtener el preapproval ID desde el payment ID
        const preapprovalResult = await mercadopagoService.getPreapprovalFromPayment(preapprovalId);
        
        if (preapprovalResult.success && preapprovalResult.preapprovalId) {
          console.log('✅ Preapproval ID encontrado:', preapprovalResult.preapprovalId);
          
          // Intentar cancelar con el preapproval ID correcto
          cancelResult = await mercadopagoService.cancelPreapproval(preapprovalResult.preapprovalId);
          
          if (cancelResult.success) {
            await cancelSubscriptionService(tenantId, 'mercadopago');
          }
        } else {
          // Si no se encuentra preapproval, cancelar solo localmente
          console.log('⚠️ No se encontró preapproval ID, cancelando localmente...');
          await cancelSubscriptionService(tenantId, 'mercadopago');
          
          cancelResult = {
            success: true,
            message: 'Suscripción cancelada localmente',
            localCancellation: true
          };
        }
      } else if (cancelResult.success) {
        // Cancelación exitosa en MercadoPago
        await cancelSubscriptionService(tenantId, 'mercadopago');
      }

    } else if (paymentProvider === 'polar') {
      // Buscar la suscripción activa de Polar.sh para este tenant
      const { db } = await import('../../db.js');
      const subscriptionsCollection = db.collection('subscriptions');
      
      // Buscar la suscripción más reciente de Polar.sh con subscriptionId válido
      const subscription = await subscriptionsCollection.findOne({ 
        tenantId: tenantId,
        processor: 'polar',
        status: 'active',
        subscriptionId: { $ne: null, $exists: true }
      }, { sort: { createdAt: -1 } });
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró una suscripción activa de Polar.sh'
        });
      }
      
      console.log('🔍 Usando subscriptionId de Polar.sh:', subscription.subscriptionId);

      // Cancelar en Polar.sh usando el UUID correcto
      cancelResult = await polarService.cancelSubscription(subscription.subscriptionId);
      
      if (cancelResult.success) {
        // Actualizar estado en la base de datos (ya actualiza tenant internamente)
        await cancelSubscriptionService(tenantId, 'polar');
        
        // También actualizar el estado de la suscripción específica
        await subscriptionsCollection.updateOne(
          { _id: subscription._id },
          { 
            $set: { 
              status: 'cancelled',
              cancelledAt: new Date(),
              updatedAt: new Date()
            }
          }
        );
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

export default {
  cancelSubscription
};
