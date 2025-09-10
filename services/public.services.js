import { db } from "../db.js"
import bcrypt from "bcrypt"
import { ObjectId } from "mongodb"
import { v4 as uuidv4 } from "uuid"

const cuentaCollection = db.collection("cuentas")
const tenantCollection = db.collection("tenants")
const subscriptionPlansCollection = db.collection("subscriptionplans")

async function registerPublicUser(userData) {
  const { userName, password, name, email, tenantName, tenantAddress, country } = userData

  // Validaciones
  if (!userName || !password || !name || !email || !tenantName) {
    throw new Error("Todos los campos obligatorios son requeridos")
  }

  // Verificar si ya existe el userName globalmente
  const existingUser = await cuentaCollection.findOne({ userName })
  if (existingUser) {
    throw new Error("El nombre de usuario ya existe")
  }

  // Verificar si ya existe el email globalmente
  const existingEmail = await cuentaCollection.findOne({ email })
  if (existingEmail) {
    throw new Error("El email ya está registrado")
  }

  // Generar tenantId único
  const tenantId = uuidv4()

  // Generar un subdomain único basado en el nombre
  const safeTenantName = tenantName.toLowerCase().replace(/[^a-z0-9]/g, "-")
  const subdomain = `${safeTenantName}-${Date.now()}`

  // Crear el tenant primero
  const newTenant = {
    _id: new ObjectId(),
    tenantId,
    name: tenantName,
    address: tenantAddress || "",
    subdomain, // 👈 agregado para evitar null duplicados
    status: "active",
    subscriptionStatus: "trial",
    maxUsers: 5,
    maxProjects: 3,
    plan: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    stats: {
      totalUsers: 0,
      totalProjects: 0,
      activeUsers: 0
    }
  }

  const tenantResult = await tenantCollection.insertOne(newTenant)
  const tenantIdString = tenantResult.insertedId.toString()

  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(password, 10)

  // Crear el usuario admin
  const newUser = {
    userName,
    password: hashedPassword,
    name,
    email,
    role: "admin",
    tenantId: tenantIdString,
    country: country || 'AR', // Guardar país del usuario
    isVerified: true,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const userResult = await cuentaCollection.insertOne(newUser)

  // Actualizar estadísticas del tenant
  await tenantCollection.updateOne(
    { _id: new ObjectId(tenantIdString) },
    {
      $set: {
        "stats.totalUsers": 1,
        "stats.activeUsers": 1,
        updatedAt: new Date()
      }
    }
  )

  return {
    message: "Registro exitoso",
    tenant: {
      _id: tenantIdString,
      name: tenantName,
      address: tenantAddress || "",
      subdomain,
      status: "active"
    },
    user: {
      _id: userResult.insertedId,
      userName,
      name,
      email,
      role: "admin",
      tenantId: tenantIdString
    }
  }
}

async function getPublicPlans(status = "active") {
  try {
    const query = {
      tenant: "public",
      status: status || "active"
    }

    let plans = await subscriptionPlansCollection
      .find(query)
      .sort({ price: 1 })
      .toArray()

    if (plans.length === 0) {
      plans = await createDefaultPublicPlans()
    }

    return plans
  } catch (error) {
    console.error("Error obteniendo planes públicos:", error)
    throw new Error(`Error obteniendo planes públicos: ${error.message}`)
  }
}

async function createDefaultPublicPlans() {
  try {
    const defaultPlans = [
      {
        name: "Starter",
        description: "Perfecto para comenzar",
        price: 29,
        currency: "ARS",
        frequency: "monthly",
        frequencyType: 1,
        discountPercentage: 0,
        features: [
          "Hasta 5 usuarios",
          "3 paneles personalizados",
          "Soporte por email",
          "Actualizaciones mensuales",
          "Backup automático"
        ],
        maxUsers: 5,
        maxProjects: 3,
        trialDays: 0,
        status: "active",
        backUrl: "https://tu-frontend.com/subscription/success",
        tenant: "public",
        externalReference: `public_starter_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Professional",
        description: "Para equipos en crecimiento",
        price: 79,
        currency: "ARS",
        frequency: "monthly",
        frequencyType: 1,
        discountPercentage: 0,
        features: [
          "Hasta 25 usuarios",
          "Paneles ilimitados",
          "Soporte prioritario",
          "Integraciones avanzadas",
          "Analytics detallados",
          "API personalizada"
        ],
        maxUsers: 25,
        maxProjects: null,
        trialDays: 0,
        status: "active",
        backUrl: "https://tu-frontend.com/subscription/success",
        tenant: "public",
        externalReference: `public_professional_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Enterprise",
        description: "Solución completa para empresas",
        price: 199,
        currency: "ARS",
        frequency: "monthly",
        frequencyType: 1,
        discountPercentage: 0,
        features: [
          "Usuarios ilimitados",
          "Paneles ilimitados",
          "Soporte 24/7",
          "Implementación personalizada",
          "Seguridad avanzada",
          "Compliance y auditoría",
          "Entrenamiento incluido"
        ],
        maxUsers: null,
        maxProjects: null,
        trialDays: 0,
        status: "active",
        backUrl: "https://tu-frontend.com/subscription/success",
        tenant: "public",
        externalReference: `public_enterprise_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    const result = await subscriptionPlansCollection.insertMany(defaultPlans)
    console.log("✅ Planes públicos por defecto creados:", result.insertedCount)

    return defaultPlans
  } catch (error) {
    console.error("Error creando planes públicos por defecto:", error)
    throw error
  }
}

// Función para asegurar que existan los planes por defecto
async function ensureDefaultPlansExist() {
  try {
    const existingPlans = await subscriptionPlansCollection.find({
      tenant: "public",
      status: "active"
    }).toArray();

    if (existingPlans.length === 0) {
      console.log('📋 No hay planes públicos, creando planes por defecto...');
      await createDefaultPublicPlans();
    }
  } catch (error) {
    console.error('Error verificando planes por defecto:', error);
  }
}

// Función para crear checkout público (sin autenticación)
async function createPublicCheckout(planId, userData) {
  try {
    const { payerEmail, payerName, backUrl } = userData;
    
    // Mapeo de IDs fallback a nombres de planes
    const fallbackMapping = {
      'starter-plan-fallback': 'Starter',
      'professional-plan-fallback': 'Professional', 
      'enterprise-plan-fallback': 'Enterprise'
    };
    
    let plan;
    
    // Si es un ID fallback, buscar por nombre
    if (fallbackMapping[planId]) {
      console.log(`🔄 Buscando plan por nombre fallback: ${planId} -> ${fallbackMapping[planId]}`);
      plan = await subscriptionPlansCollection.findOne({
        name: fallbackMapping[planId],
        tenant: 'public',
        status: 'active'
      });
    } else {
      // Si es un ObjectId válido, buscar por _id
      try {
        console.log(`🔍 Buscando plan por ObjectId: ${planId}`);
        plan = await subscriptionPlansCollection.findOne({
          _id: new ObjectId(planId),
          status: 'active'
        });
      } catch (objectIdError) {
        console.log(`⚠️ ID no es ObjectId válido, intentando buscar por nombre: ${planId}`);
        // Si falla el ObjectId, intentar buscar por nombre directamente
        plan = await subscriptionPlansCollection.findOne({
          name: planId,
          tenant: 'public',
          status: 'active'
        });
      }
    }

    if (!plan) {
      throw new Error(`Plan de suscripción no encontrado: ${planId}`);
    }
    
    console.log(`✅ Plan encontrado: ${plan.name} (${plan._id})`);
    
    // Asegurar que el plan tenga todos los planes por defecto si no existen
    await ensureDefaultPlansExist();

    // Crear cliente temporal para la suscripción
    const tempClient = {
      _id: new ObjectId(),
      name: payerName || 'Cliente Temporal',
      email: payerEmail,
      phone: '',
      address: '',
      tenant: 'public',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insertar cliente temporal
    await db.collection('clients').insertOne(tempClient);

    // Crear suscripción temporal
    const subscription = {
      _id: new ObjectId(),
      subscriptionPlan: plan._id,
      client: tempClient._id,
      payerEmail: payerEmail,
      reason: plan.description,
      amount: plan.price,
      currency: plan.currency,
      frequency: plan.frequency,
      backUrl: backUrl || `${process.env.FRONTEND_URL || 'https://leonix.vercel.app'}/subscription/success`,
      externalReference: `public_sub_${Date.now()}`,
      tenant: 'public',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insertar suscripción
    await db.collection('subscriptions').insertOne(subscription);

    // Crear checkout real en MercadoPago
    const mercadoPagoService = (await import('./mercadopago.services.js')).default;
    
    const mpData = {
      reason: subscription.reason,
      external_reference: subscription.externalReference,
      payer_email: subscription.payerEmail,
      back_url: subscription.backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plan.price,
        currency_id: plan.currency
      },
      status: 'pending'
    };

    console.log('🚀 Creando checkout real en MercadoPago para plan:', plan.name);
    
    const mpResult = await mercadoPagoService.createSubscription(mpData);
    
    if (!mpResult.success) {
      throw new Error(`Error en MercadoPago: ${mpResult.message}`);
    }

    // Actualizar suscripción con ID de MercadoPago
    await db.collection('subscriptions').updateOne(
      { _id: subscription._id },
      { 
        $set: { 
          mpSubscriptionId: mpResult.data.id,
          initPoint: mpResult.data.init_point || mpResult.data.sandbox_init_point,
          updatedAt: new Date()
        }
      }
    );

    const checkoutUrl = mpResult.data.init_point || mpResult.data.sandbox_init_point;

    return {
      success: true,
      data: {
        subscriptionId: subscription._id,
        checkoutUrl: checkoutUrl,
        initPoint: checkoutUrl,
        mpSubscriptionId: mpResult.data.id
      }
    };

  } catch (error) {
    console.error('Error en createPublicCheckout:', error);
    throw new Error(`Error creando checkout público: ${error.message}`);
  }
}

export { registerPublicUser, getPublicPlans, createPublicCheckout }
