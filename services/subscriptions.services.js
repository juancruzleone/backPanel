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

    // 1. Obtener el plan - primero intentar por _id, luego por planId string
    let plan;
    
    // Si planId parece ser un ObjectId válido, buscar por _id
    if (planId && planId.length === 24 && /^[0-9a-fA-F]{24}$/.test(planId)) {
      console.log('🔍 Buscando plan por _id:', planId);
      plan = await subscriptionPlansCollection.findOne({ _id: new ObjectId(planId) });
    }
    
    // Si no se encontró o no es ObjectId válido, buscar por planId string
    if (!plan) {
      console.log('🔍 Buscando plan por planId string:', planId);
      plan = await subscriptionPlansCollection.findOne({ planId: planId });
    }
    
    // Si aún no se encuentra, usar configuración de planes hardcodeada
    if (!plan) {
      console.log('⚠️ Plan no encontrado en BD, usando configuración hardcodeada');
      const { PLANS_CONFIG } = await import('../config/plans.config.js');
      
      // Mapear planId a configuración - incluir soporte para planes anuales
      let planKey = 'basic'; // default
      
      // Detectar si es plan anual por el ID
      if (planId.includes('yearly') || planId.includes('anual')) {
        if (planId.includes('professional')) planKey = 'professional-yearly';
        else if (planId.includes('enterprise')) planKey = 'enterprise-yearly';
        else planKey = 'basic-yearly';
      } else {
        // Planes mensuales
        if (planId.includes('professional')) planKey = 'professional';
        else if (planId.includes('enterprise')) planKey = 'enterprise';
        else planKey = 'basic';
      }
      
      const planConfig = PLANS_CONFIG[planKey];
      if (!planConfig) {
        throw new Error(`Configuración de plan no encontrada para: ${planKey}`);
      }
      
      plan = {
        _id: planId,
        planId: planId,
        name: planConfig.name,
        price: planConfig.price,
        currency: 'ARS',
        frequency: planConfig.frequency || 'monthly',
        description: `Plan ${planConfig.name}`,
        features: planConfig.features,
        limits: planConfig.limits
      };
      
      console.log('✅ Usando plan de configuración:', {
        planId: plan.planId,
        name: plan.name,
        price: plan.price,
        frequency: plan.frequency
      });
    }
    
    if (!plan) {
      throw new Error('Plan no encontrado');
    }

    // 2. Obtener información del tenant
    let tenant;
    
    // Si tenantId parece ser un ObjectId válido, buscar por _id
    if (tenantId && tenantId.length === 24 && /^[0-9a-fA-F]{24}$/.test(tenantId)) {
      console.log('🔍 Buscando tenant por _id:', tenantId);
      tenant = await tenantsCollection.findOne({ _id: new ObjectId(tenantId) });
    }
    
    // Si no se encontró, buscar por tenantId string
    if (!tenant) {
      console.log('🔍 Buscando tenant por tenantId string:', tenantId);
      tenant = await tenantsCollection.findOne({ tenantId: tenantId });
    }
    
    if (!tenant) {
      throw new Error('Tenant no encontrado');
    }

    // 3. Crear suscripción en MercadoPago usando el servicio
    const mercadoPagoService = (await import('./mercadopago.services.js')).default;
    
    // Determinar frecuencia basada en el plan
    const isYearlyPlan = plan.frequency === 'yearly' || planId.includes('yearly');
    const frequency = isYearlyPlan ? 12 : 1;
    const frequencyType = isYearlyPlan ? 'months' : 'months';
    
    console.log('📅 Configuración de frecuencia:', {
      planId,
      planFrequency: plan.frequency,
      isYearlyPlan,
      frequency,
      frequencyType
    });

    const subscriptionData = {
      reason: `Plan ${plan.name} - ${tenant.name}`,
      external_reference: `${tenantId}_${planId}_${Date.now()}`,
      payer_email: 'test_user_622478383@testuser.com',
      back_url: successUrl || 'https://leonix.vercel.app/subscription/success',
      auto_recurring: {
        frequency: frequency,
        frequency_type: frequencyType,
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
    console.log('🔗 URL de checkout obtenida:', checkoutUrl);

    if (!checkoutUrl) {
      console.error('❌ No se obtuvo URL de checkout de MercadoPago');
      console.log('📋 Respuesta completa de MP:', JSON.stringify(mpResult.data, null, 2));
      throw new Error('MercadoPago no devolvió URL de checkout');
    }

    // 5. Guardar registro de intento de suscripción
    const subscriptionAttempt = {
      tenantId,
      planId: planId, // No convertir a ObjectId, guardar como string
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
    console.log('💾 Registro de suscripción guardado en BD');

    return {
      success: true,
      message: 'Checkout creado exitosamente',
      data: {
        checkoutUrl: checkoutUrl,
        init_point: checkoutUrl, // Agregar también como init_point para compatibilidad
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
    const { external_reference, status, status_detail, payer } = paymentData;
    
    if (!external_reference) {
      console.log('⚠️ No hay external_reference en el pago, buscando por preapproval_id');
      // Si no hay external_reference, intentar encontrar la suscripción por preapproval_id
      const preapprovalId = paymentData.preapproval_id;
      if (preapprovalId) {
        const subscription = await subscriptionsCollection.findOne({ 
          mpSubscriptionId: preapprovalId 
        });
        if (subscription) {
          return await processSubscriptionPaymentById(paymentId, subscription.tenantId, subscription.planId);
        }
      }
      throw new Error('No se pudo identificar la suscripción para este pago');
    }

    const [tenantId, planId] = external_reference.split('_');

    // 3. Manejar payer_email vacío - usar email del tenant
    let payerEmail = payer?.email || '';
    if (!payerEmail) {
      console.log('⚠️ payer_email vacío, obteniendo email del tenant');
      const tenant = await tenantsCollection.findOne({ tenantId: tenantId });
      payerEmail = tenant?.email || 'sin-email@leonix.net.ar';
      console.log('📧 Email del tenant usado:', payerEmail);
    }

    // 4. Guardar información del pago
    const paymentRecord = {
      paymentId: paymentId,
      externalReference: external_reference,
      tenantId,
      planId: planId,
      status,
      statusDetail: status_detail,
      amount: paymentData.transaction_amount,
      currency: paymentData.currency_id,
      paymentMethod: paymentData.payment_method_id,
      payerEmail: payerEmail,
      preapprovalId: paymentData.preapproval_id,
      rawData: paymentData,
      processedAt: new Date()
    };

    await paymentsCollection.insertOne(paymentRecord);

    // 5. Actualizar suscripción si el pago fue aprobado
    if (status === 'approved') {
      await activateSubscription(tenantId, planId, paymentData);
    }

    return {
      success: true,
      message: 'Notificación procesada',
      status,
      tenantId,
      planId,
      payerEmail
    };

  } catch (error) {
    console.error('❌ Error procesando notificación:', error);
    throw error;
  }
}

// Procesar notificación de subscription_preapproval
async function processSubscriptionPreapproval(subscriptionId) {
  try {
    console.log('📋 Procesando subscription_preapproval:', subscriptionId);

    // 1. Obtener información de la suscripción desde MercadoPago
    const mpResponse = await fetch(`${MP_CONFIG.BASE_URL}/preapproval/${subscriptionId}`, {
      headers: {
        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
      }
    });

    if (!mpResponse.ok) {
      throw new Error(`Error obteniendo suscripción: ${mpResponse.status}`);
    }

    const subscriptionData = await mpResponse.json();
    console.log('📋 Datos de suscripción:', JSON.stringify(subscriptionData, null, 2));

    // 2. Extraer información relevante
    const { external_reference, status, payer_email } = subscriptionData;
    
    if (!external_reference) {
      throw new Error('No hay external_reference en la suscripción');
    }

    const [tenantId, planId] = external_reference.split('_');

    // 3. Actualizar el registro de suscripción con el ID real de MercadoPago
    await subscriptionsCollection.updateOne(
      { 
        tenantId: tenantId,
        externalReference: external_reference
      },
      {
        $set: {
          mpSubscriptionId: subscriptionId,
          status: status,
          payerEmail: payer_email || '',
          subscriptionData: subscriptionData,
          updatedAt: new Date()
        }
      }
    );

    console.log('✅ Suscripción actualizada con ID de MercadoPago:', subscriptionId);

    return {
      success: true,
      message: 'Subscription preapproval procesado',
      subscriptionId,
      tenantId,
      planId,
      status
    };

  } catch (error) {
    console.error('❌ Error procesando subscription_preapproval:', error);
    throw error;
  }
}

// Procesar pago autorizado de suscripción
async function processSubscriptionPayment(paymentId) {
  try {
    console.log('🔄 Procesando pago de suscripción:', paymentId);
    
    // Usar el mismo flujo que processPaymentNotification pero con lógica específica para suscripciones
    return await processPaymentNotification(paymentId);
    
  } catch (error) {
    console.error('❌ Error procesando pago de suscripción:', error);
    throw error;
  }
}

// Función auxiliar para procesar pagos por ID de suscripción
async function processSubscriptionPaymentById(paymentId, tenantId, planId) {
  try {
    console.log('🔄 Procesando pago por ID de suscripción:', { paymentId, tenantId, planId });

    // Obtener información del pago
    const mpResponse = await fetch(`${MP_CONFIG.BASE_URL}/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
      }
    });

    if (!mpResponse.ok) {
      throw new Error(`Error obteniendo pago: ${mpResponse.status}`);
    }

    const paymentData = await mpResponse.json();
    
    // Activar suscripción si el pago fue aprobado
    if (paymentData.status === 'approved') {
      await activateSubscription(tenantId, planId, paymentData);
    }

    return {
      success: true,
      message: 'Pago de suscripción procesado',
      status: paymentData.status,
      tenantId,
      planId
    };

  } catch (error) {
    console.error('❌ Error procesando pago por ID:', error);
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
  processSubscriptionPreapproval,
  processSubscriptionPayment,
  activateSubscription,
  getSubscriptionStatus 
};