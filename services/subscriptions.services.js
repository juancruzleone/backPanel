// services/subscription.services.js
import { db } from "../db.js"
import { ObjectId } from "mongodb"
import { MP_CONFIG } from "../config/mercadopago.config.js"

const subscriptionPlansCollection = db.collection("subscriptionplans")
const tenantsCollection = db.collection("tenants")
const subscriptionsCollection = db.collection("subscriptions")
const paymentsCollection = db.collection("payments")

// Crear checkout de MercadoPago
async function createMercadoPagoCheckout({ planId, tenantId, successUrl, failureUrl, pendingUrl }) {
  try {
    console.log('🛒 Creando checkout para:', { planId, tenantId });

    // 1. Obtener el plan
    const plan = await subscriptionPlansCollection.findOne({ _id: new ObjectId(planId) });
    if (!plan) {
      throw new Error('Plan no encontrado');
    }

    // 2. Obtener información del tenant
    const tenant = await tenantsCollection.findOne({ 
      $or: [
        { _id: new ObjectId(tenantId) },
        { tenantId: tenantId }
      ]
    });
    if (!tenant) {
      throw new Error('Tenant no encontrado');
    }

    // 3. Crear suscripción en MercadoPago usando el servicio
    const mercadoPagoService = (await import('./mercadopago.services.js')).default;
    
    const subscriptionData = {
      reason: `Plan ${plan.name} - ${tenant.name}`,
      external_reference: `${tenantId}_${planId}_${Date.now()}`,
      payer_email: tenant.email || 'contacto@leonix.net.ar',
      back_url: successUrl || 'https://leonix.vercel.app/subscription/success',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plan.price,
        currency_id: plan.currency || 'ARS'
      },
      status: 'pending'
    };

    console.log('📋 Datos de suscripción MercadoPago:', JSON.stringify(subscriptionData, null, 2));

    // 4. Crear suscripción en MercadoPago
    const mpResult = await mercadoPagoService.createSubscription(subscriptionData);

    if (!mpResult.success) {
      const errorData = mpResult.error;
      console.error('❌ Error MercadoPago:', errorData);
      throw new Error(`Error de MercadoPago: ${mpResult.message}`);
    }

    console.log('✅ Suscripción creada:', mpResult.data.id);

    const checkoutUrl = mpResult.data.init_point || mpResult.data.sandbox_init_point;

    // 5. Guardar registro de intento de suscripción
    const subscriptionAttempt = {
      tenantId,
      planId: new ObjectId(planId),
      mpSubscriptionId: mpResult.data.id,
      externalReference: subscriptionData.external_reference,
      amount: plan.price,
      currency: plan.currency || 'ARS',
      status: 'pending',
      checkoutUrl: checkoutUrl,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await subscriptionsCollection.insertOne(subscriptionAttempt);

    return {
      success: true,
      message: 'Checkout creado exitosamente',
      data: {
        checkoutUrl: checkoutUrl,
        subscriptionId: mpResult.data.id,
        externalReference: subscriptionData.external_reference
      }
    };

  } catch (error) {
    console.error('❌ Error creando checkout:', error);
    throw new Error(`Error creando checkout: ${error.message}`);
  }
}

// Procesar notificación de pago
async function processPaymentNotification(paymentId) {
  try {
    console.log('🔔 Procesando notificación de pago:', paymentId);

    // 1. Obtener información del pago desde MercadoPago
    const mpResponse = await fetch(`${MP_CONFIG.BASE_URL}/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
      }
    });

    if (!mpResponse.ok) {
      throw new Error(`Error obteniendo pago: ${mpResponse.status}`);
    }

    const paymentData = await mpResponse.json();
    console.log('💳 Datos del pago:', JSON.stringify(paymentData, null, 2));

    // 2. Extraer información relevante
    const { external_reference, status, status_detail } = paymentData;
    const [tenantId, planId] = external_reference.split('_');

    // 3. Guardar información del pago
    const paymentRecord = {
      paymentId: paymentId,
      externalReference: external_reference,
      tenantId,
      planId: new ObjectId(planId),
      status,
      statusDetail: status_detail,
      amount: paymentData.transaction_amount,
      currency: paymentData.currency_id,
      paymentMethod: paymentData.payment_method_id,
      rawData: paymentData,
      processedAt: new Date()
    };

    await paymentsCollection.insertOne(paymentRecord);

    // 4. Actualizar suscripción si el pago fue aprobado
    if (status === 'approved') {
      await activateSubscription(tenantId, planId, paymentData);
    }

    return {
      success: true,
      message: 'Notificación procesada',
      status,
      tenantId,
      planId
    };

  } catch (error) {
    console.error('❌ Error procesando notificación:', error);
    throw error;
  }
}

// Activar suscripción después del pago
async function activateSubscription(tenantId, planId, paymentData) {
  try {
    console.log('🎯 Activando suscripción para:', { tenantId, planId });

    // 1. Obtener el plan
    const plan = await subscriptionPlansCollection.findOne({ _id: new ObjectId(planId) });
    if (!plan) {
      throw new Error('Plan no encontrado');
    }

    // 2. Actualizar el tenant con el nuevo plan
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // Suscripción mensual por defecto

    await tenantsCollection.updateOne(
      { tenantId: tenantId },
      {
        $set: {
          subscriptionStatus: 'active',
          plan: {
            _id: plan._id,
            name: plan.name,
            price: plan.price,
            maxUsers: plan.maxUsers,
            maxProjects: plan.maxProjects,
            activatedAt: startDate,
            expiresAt: endDate
          },
          maxUsers: plan.maxUsers || 999,
          maxProjects: plan.maxProjects || 999,
          updatedAt: new Date()
        }
      }
    );

    // 3. Actualizar registro de suscripción
    await subscriptionsCollection.updateOne(
      { 
        tenantId: tenantId,
        planId: new ObjectId(planId),
        status: 'pending'
      },
      {
        $set: {
          status: 'active',
          activatedAt: startDate,
          expiresAt: endDate,
          paymentId: paymentData.id,
          updatedAt: new Date()
        }
      }
    );

    console.log('✅ Suscripción activada exitosamente');

    return {
      success: true,
      message: 'Suscripción activada',
      subscription: {
        tenantId,
        planName: plan.name,
        activatedAt: startDate,
        expiresAt: endDate
      }
    };

  } catch (error) {
    console.error('❌ Error activando suscripción:', error);
    throw error;
  }
}

// Obtener estado de suscripción
async function getSubscriptionStatus(tenantId) {
  try {
    const tenant = await tenantsCollection.findOne({ 
      $or: [
        { _id: new ObjectId(tenantId) },
        { tenantId: tenantId }
      ]
    });

    if (!tenant) {
      throw new Error('Tenant no encontrado');
    }

    const subscription = await subscriptionsCollection.findOne({ 
      tenantId: tenantId,
      status: 'active'
    });

    return {
      success: true,
      message: 'Estado de suscripción obtenido',
      data: {
        tenantId: tenant.tenantId,
        tenantName: tenant.name,
        subscriptionStatus: tenant.subscriptionStatus,
        plan: tenant.plan,
        maxUsers: tenant.maxUsers,
        maxProjects: tenant.maxProjects,
        subscription: subscription
      }
    };

  } catch (error) {
    console.error('Error obteniendo estado de suscripción:', error);
    throw error;
  }
}

export { 
  createMercadoPagoCheckout, 
  processPaymentNotification, 
  activateSubscription,
  getSubscriptionStatus 
};