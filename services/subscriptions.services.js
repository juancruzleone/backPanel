// services/subscription.services.js
import { db } from "../db.js"
import { ObjectId } from "mongodb"
import { MP_CONFIG } from "../config/mercadopago.config.js"

const subscriptionPlansCollection = db.collection("subscriptionplans")
const tenantsCollection = db.collection("tenants")
const subscriptionsCollection = db.collection("subscriptions")
const paymentsCollection = db.collection("payments")

/**
 * Actualizar el plan del tenant
 */
async function updateTenantPlan(tenantId, planId) {
  try {
    console.log('🔄 Actualizando plan del tenant:', { tenantId, planId });
    
    const result = await tenantsCollection.updateOne(
      { tenantId: tenantId },
      { 
        $set: { 
          plan: planId,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('No se pudo actualizar el plan del tenant');
    }

    console.log('✅ Plan del tenant actualizado exitosamente');
    return { success: true };
  } catch (error) {
    console.error('❌ Error actualizando plan del tenant:', error);
    throw error;
  }
}

// Crear checkout de MercadoPago
async function createMercadoPagoCheckout({ planId, tenantId, userEmail, successUrl, failureUrl, pendingUrl }) {
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

    // VALIDACIÓN PREVIA: Verificar que el usuario confirme su email de MercadoPago
    console.log('⚠️ IMPORTANTE: El email debe coincidir con la cuenta de MercadoPago del usuario');
    console.log('📧 Email del usuario:', userEmail);
    
    // USAR SIEMPRE EL EMAIL REAL DEL USUARIO - MercadoPago requiere que coincida
    const payerEmail = userEmail;
    
    const subscriptionData = {
      reason: `Plan ${plan.name} - ${tenant.name}`,
      external_reference: `${tenantId}_${planId}_${Date.now()}`,
      payer_email: payerEmail,
      back_url: successUrl || 'https://leonix.vercel.app/subscription/success',
      auto_recurring: {
        frequency: frequency,
        frequency_type: frequencyType,
        transaction_amount: plan.price,
        currency_id: plan.currency || 'ARS'
      },
      status: 'pending'
    };
    
    console.log('📧 Email usado para MercadoPago:', payerEmail);
    
    console.log('📋 Datos de suscripción MercadoPago:', JSON.stringify(subscriptionData, null, 2));

    // 4. Intentar crear suscripción con plan predefinido primero
    console.log('🔄 Intentando usar preapproval_plan (validación de email menos estricta)');
    
    // Importar configuración de planes de MercadoPago
    const { getMercadoPagoPlanId } = await import('../config/mercadopago.plans.config.js');
    
    // Determinar clave del plan
    let planKey = planId;
    if (planId.includes('starter') || planId.includes('basic')) planKey = isYearlyPlan ? 'starter-yearly' : 'starter';
    if (planId.includes('professional')) planKey = isYearlyPlan ? 'professional-yearly' : 'professional';
    if (planId.includes('enterprise')) planKey = isYearlyPlan ? 'enterprise-yearly' : 'enterprise';
    
    const mercadoPagoPlanId = getMercadoPagoPlanId(planKey);
    
    let mpResult;
    
    if (mercadoPagoPlanId) {
        // Usar plan predefinido (preapproval_plan)
        console.log('✅ Usando plan predefinido:', { planKey, mercadoPagoPlanId });
        
        const planSubscriptionData = {
            preapproval_plan_id: mercadoPagoPlanId,
            payer_email: payerEmail,
            external_reference: subscriptionData.external_reference,
            back_url: subscriptionData.back_url || successUrl
        };
        
        mpResult = await mercadoPagoService.createSubscriptionWithPlan(planSubscriptionData);
        
    } else {
        // Fallback: usar método tradicional (preapproval directo)
        console.log('⚠️ Plan predefinido no encontrado, usando método tradicional');
        mpResult = await mercadoPagoService.createSubscription(subscriptionData);
    }

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

    // 5. NO crear suscripción en BD hasta que el pago sea exitoso
    // El webhook creará la suscripción solo cuando MercadoPago confirme el pago
    console.log('⏳ Suscripción NO creada en BD - Se creará solo si el pago es exitoso');
    console.log('🔗 External reference para webhook:', subscriptionData.external_reference);
    console.log('🆔 MercadoPago ID:', mpResult.data.id);

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

    // 4. ACTIVAR EL PLAN DEL TENANT automáticamente
    if (status === 'authorized' || status === 'active') {
      console.log('🎯 Activando plan del tenant automáticamente...');
      
      try {
        const activationResult = await activateSubscription(tenantId, planId, {
          preapproval_id: subscriptionId,
          id: subscriptionId,
          external_reference: external_reference,
          transaction_amount: subscriptionData.auto_recurring?.transaction_amount,
          currency_id: subscriptionData.auto_recurring?.currency_id
        });
        
        console.log('✅ Plan del tenant activado automáticamente:', activationResult.subscription.planName);
        
        return {
          success: true,
          message: 'Subscription preapproval procesado y tenant activado',
          subscriptionId,
          tenantId,
          planId,
          status,
          tenantActivated: true,
          activationResult
        };
        
      } catch (activationError) {
        console.error('❌ Error activando tenant:', activationError);
        
        return {
          success: true,
          message: 'Subscription preapproval procesado pero error activando tenant',
          subscriptionId,
          tenantId,
          planId,
          status,
          tenantActivated: false,
          activationError: activationError.message
        };
      }
    } else {
      console.log('⏳ Suscripción no está autorizada aún, status:', status);
      
      return {
        success: true,
        message: 'Subscription preapproval procesado',
        subscriptionId,
        tenantId,
        planId,
        status,
        tenantActivated: false,
        reason: `Status ${status} no permite activación`
      };
    }

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

// Crear y activar suscripción después del pago exitoso
async function activateSubscription(tenantId, planId, paymentData) {
  try {
    console.log('🎯 Creando y activando suscripción para:', { tenantId, planId });

    // 1. Obtener el plan
    let plan;
    
    // Si planId parece ser un ObjectId válido, buscar por _id
    if (planId && planId.length === 24 && /^[0-9a-fA-F]{24}$/.test(planId)) {
      plan = await subscriptionPlansCollection.findOne({ _id: new ObjectId(planId) });
    }
    
    // Si no se encontró o no es ObjectId válido, buscar por planId string
    if (!plan) {
      plan = await subscriptionPlansCollection.findOne({ planId: planId });
    }
    
    // Si aún no se encuentra, usar configuración de planes hardcodeada
    if (!plan) {
      const { PLANS_CONFIG } = await import('../config/plans.config.js');
      
      let planKey = 'basic';
      if (planId.includes('yearly') || planId.includes('anual')) {
        if (planId.includes('professional')) planKey = 'professional-yearly';
        else if (planId.includes('enterprise')) planKey = 'enterprise-yearly';
        else planKey = 'basic-yearly';
      } else {
        if (planId.includes('professional')) planKey = 'professional';
        else if (planId.includes('enterprise')) planKey = 'enterprise';
        else planKey = 'basic';
      }
      
      const planConfig = PLANS_CONFIG[planKey];
      if (planConfig) {
        plan = {
          _id: planId,
          planId: planId,
          name: planConfig.name,
          price: planConfig.price,
          currency: 'ARS',
          frequency: planConfig.frequency || 'monthly',
          maxUsers: planConfig.limits?.maxUsers || 10,
          maxProjects: planConfig.limits?.maxAssets || 100,
          features: planConfig.features,
          limits: planConfig.limits
        };
      }
    }

    if (!plan) {
      throw new Error('Plan no encontrado');
    }

    // 2. Calcular fechas de activación y expiración
    const startDate = new Date();
    const endDate = new Date();
    
    // Determinar duración basada en la frecuencia del plan
    const isYearlyPlan = plan.frequency === 'yearly' || planId.includes('yearly');
    if (isYearlyPlan) {
      endDate.setFullYear(endDate.getFullYear() + 1); // +1 año para planes anuales
    } else {
      endDate.setMonth(endDate.getMonth() + 1); // +1 mes para planes mensuales
    }

    // 3. Actualizar el tenant con el nuevo plan
    // Mapear nombre del plan a string simple
    let planName = 'starter'; // default
    if (plan.name.toLowerCase().includes('professional')) planName = 'professional';
    else if (plan.name.toLowerCase().includes('enterprise')) planName = 'enterprise';
    else if (plan.name.toLowerCase().includes('starter')) planName = 'starter';
    
    console.log('📋 Actualizando tenant con plan:', planName);
    
    await tenantsCollection.updateOne(
      { tenantId: tenantId },
      {
        $set: {
          subscriptionStatus: 'active',
          plan: planName, // String simple: "starter", "professional", "enterprise"
          
          // Información detallada del plan en campo separado
          planDetails: {
            _id: plan._id,
            name: plan.name,
            price: plan.price,
            frequency: plan.frequency,
            activatedAt: startDate,
            expiresAt: endDate
          },
          
          // Límites del plan
          maxUsers: plan.maxUsers || 10,
          maxProjects: plan.maxProjects || 100,
          
          // Fecha de expiración para validación
          subscriptionExpiresAt: endDate,
          updatedAt: new Date()
        }
      }
    );
    
    console.log('✅ Tenant actualizado con plan:', planName);

    // 4. CREAR la suscripción en BD (ahora que el pago fue exitoso)
    const newSubscription = {
      tenantId: tenantId,
      planId: planId, // Guardar como string
      mpSubscriptionId: paymentData.preapproval_id || paymentData.id,
      externalReference: paymentData.external_reference,
      amount: paymentData.transaction_amount || plan.price,
      currency: paymentData.currency_id || plan.currency || 'ARS',
      status: 'active', // Directamente activa
      paymentId: paymentData.id,
      activatedAt: startDate,
      expiresAt: endDate,
      frequency: plan.frequency || 'monthly',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const insertResult = await subscriptionsCollection.insertOne(newSubscription);
    console.log('✅ Suscripción creada en BD con status active:', insertResult.insertedId);

    console.log('✅ Suscripción activada exitosamente');

    return {
      success: true,
      message: 'Suscripción creada y activada',
      subscription: {
        _id: insertResult.insertedId,
        tenantId,
        planName: plan.name,
        frequency: plan.frequency,
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