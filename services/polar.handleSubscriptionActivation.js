/**
 * Método adicional para manejar activación de suscripciones de Polar.sh
 * Este archivo se importa en polar.services.js
 */

export async function handleSubscriptionActivation(subscriptionData) {
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
