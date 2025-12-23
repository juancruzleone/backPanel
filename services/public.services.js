import { db } from "../db.js"
import bcrypt from "bcrypt"
import { ObjectId } from "mongodb"
import { v4 as uuidv4 } from "uuid"
import mercadoPagoService from "./mercadopago.services.js"
import { sendVerificationEmail } from "./email.services.js"

const cuentaCollection = db.collection("cuentas")
const tenantCollection = db.collection("tenants")
const subscriptionPlansCollection = db.collection("subscriptionplans")
const pendingCollection = db.collection("pendingRegistrations")

async function registerPublicUser(userData) {
  const {
    userName, password, email, country,
    razonSocial, tipoDocumento, numeroDocumento, condicionIVA,
    direccionFiscal, ciudad, provincia, codigoPostal,
    taxIdType, taxIdNumber, addressIntl, cityIntl, postalCodeIntl
  } = userData

  // Validaciones básicas
  if (!userName || !password || !email) {
    throw new Error("Todos los campos obligatorios son requeridos")
  }

  // Verificar si ya existe en cuentas definitivas
  const existingUser = await cuentaCollection.findOne({
    $or: [{ userName }, { email }]
  })
  if (existingUser) {
    if (existingUser.email === email) throw new Error("El email ya está registrado")
    throw new Error("El nombre de usuario ya existe")
  }

  // Hashear la contraseña antes de guardar temporalmente
  const hashedPassword = await bcrypt.hash(password, 10)

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

  // Guardar en colección temporal (si ya existe uno con ese email, lo actualizamos)
  const pendingData = {
    ...userData,
    password: hashedPassword,
    verificationCode,
    verificationExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
    createdAt: new Date()
  }

  await pendingCollection.updateOne(
    { email },
    { $set: pendingData },
    { upsert: true }
  )

  // Enviar email de verificación
  sendVerificationEmail(email, verificationCode).catch(err =>
    console.error("Error enviando email de verificación en registro:", err)
  )

  return {
    message: "Código de verificación enviado a tu email",
    email,
    isPending: true
  }
}

/**
 * Verifica el código enviado al email del usuario
 */
async function verifyPublicUser(email, code) {
  if (!email || !code) {
    throw new Error("Email y código son requeridos")
  }

  // Buscar en la colección temporal
  const pendingUser = await pendingCollection.findOne({ email })

  if (!pendingUser) {
    // Verificar si ya existe en la definitiva (por si ya se verificó)
    const alreadyExists = await cuentaCollection.findOne({ email })
    if (alreadyExists) {
      return { message: "El usuario ya está verificado", alreadyVerified: true }
    }
    throw new Error("No se encontró una solicitud de registro pendiente para este email")
  }

  if (pendingUser.verificationCode !== code) {
    throw new Error("Código de verificación inválido")
  }

  if (new Date() > pendingUser.verificationExpires) {
    throw new Error("El código ha expirado. Por favor solicita uno nuevo.")
  }

  // --- PROCESO DE CREACIÓN DEFINITIVA ---
  const {
    userName, password, country,
    razonSocial, tipoDocumento, numeroDocumento, condicionIVA,
    direccionFiscal, ciudad, provincia, codigoPostal,
    taxIdType, taxIdNumber, addressIntl, cityIntl, postalCodeIntl
  } = pendingUser

  // 1. Generar tenantId único
  const tenantId = uuidv4()
  const baseName = razonSocial || userName
  const safeTenantName = baseName.toLowerCase().replace(/[^a-z0-9]/g, "-")
  const subdomain = `${safeTenantName}-${Date.now()}`

  // 2. Crear el tenant
  const newTenant = {
    _id: new ObjectId(),
    tenantId,
    name: razonSocial || `Empresa de ${userName}`,
    address: direccionFiscal || addressIntl || "",
    subdomain,
    status: "active",
    subscriptionStatus: "trial",
    maxUsers: 5,
    maxProjects: 3,
    plan: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    stats: {
      totalUsers: 1,
      totalProjects: 0,
      activeUsers: 1
    }
  }

  const tenantResult = await tenantCollection.insertOne(newTenant)

  // 3. Crear el usuario admin
  const newUser = {
    userName,
    password, // Ya viene hasheado de la colección temporal
    email,
    role: "admin",
    tenantId: tenantId,
    country: country || 'AR',
    ...(country === 'AR' ? {
      razonSocial, tipoDocumento, numeroDocumento, condicionIVA,
      direccionFiscal, ciudad, provincia, codigoPostal
    } : {
      razonSocial, taxIdType, taxIdNumber, addressIntl, cityIntl, postalCodeIntl
    }),
    isVerified: true,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const userResult = await cuentaCollection.insertOne(newUser)

  // 4. Eliminar de la colección temporal
  await pendingCollection.deleteOne({ _id: pendingUser._id })

  return {
    success: true,
    message: "Email verificado con éxito. Tu cuenta ha sido creada.",
    user: {
      _id: userResult.insertedId,
      userName,
      email,
      role: "admin",
      tenantId: tenantId
    }
  }
}

/**
 * Reenvía el código de verificación
 */
async function resendVerificationCode(email) {
  const pendingUser = await pendingCollection.findOne({ email })

  if (!pendingUser) {
    // Verificar si ya existe en la definitiva
    const alreadyExists = await cuentaCollection.findOne({ email })
    if (alreadyExists) {
      throw new Error("El usuario ya está verificado y activo")
    }
    throw new Error("No se encontró una solicitud de registro pendiente para este email")
  }

  const newCode = Math.floor(100000 + Math.random() * 900000).toString()
  const expires = new Date(Date.now() + 15 * 60 * 1000)

  await pendingCollection.updateOne(
    { _id: pendingUser._id },
    {
      $set: {
        verificationCode: newCode,
        verificationExpires: expires,
        updatedAt: new Date()
      }
    }
  )

  await sendVerificationEmail(email, newCode)

  return { success: true, message: "Nuevo código enviado a tu email" }
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
    const { payerEmail, payerName, backUrl, billingCycle } = userData;

    // Buscar el plan directamente por ID (ya no necesitamos mapeo fallback)
    let plan;
    try {
      plan = await subscriptionPlansCollection.findOne({
        _id: new ObjectId(planId),
        tenant: 'public',
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

    // Determinar precio según el ciclo de facturación
    let finalPrice = plan.price;
    let frequencyType = 'months';
    let frequency = 1;
    let isAnnualPayment = false;

    if (billingCycle === 'yearly') {
      // Aplicar descuento del 20% para planes anuales (equivalente a 10 meses)
      finalPrice = Math.round(plan.price * 10); // 10 meses de precio
      isAnnualPayment = true; // Marcar como pago único anual
      console.log(`💰 Precio anual calculado: ${finalPrice} (descuento aplicado - PAGO ÚNICO)`);
    }

    // Determinar proveedor de pago basado en el país del usuario
    const userCountry = userData.country || 'AR'; // Default a Argentina si no se especifica
    console.log('🌍 País del usuario:', userCountry);

    let checkoutUrl;
    let subscriptionResult;

    // Determinar procesador de pago según país
    if (userCountry === 'AR') {
      console.log('🇦🇷 Usando MercadoPago para Argentina');

      // VERIFICAR PAÍS REAL DE LAS CREDENCIALES MERCADOPAGO
      console.log('🔍 Verificando país real de las credenciales MercadoPago...');
      const accountInfo = await mercadoPagoService.getAccountInfo();

      if (!accountInfo.success) {
        console.error('❌ Error obteniendo información de cuenta MercadoPago:', accountInfo.message);
        throw new Error('Error verificando credenciales de MercadoPago');
      }

      const realCountry = accountInfo.data.country_id;
      const realCurrency = accountInfo.data.currency_id;
      const mercadoPagoAccountEmail = accountInfo.data.email; // Email de la cuenta MercadoPago

      console.log('✅ País real de credenciales MercadoPago:', realCountry);
      console.log('✅ Moneda real de credenciales MercadoPago:', realCurrency);
      console.log('📧 Email de cuenta MercadoPago:', mercadoPagoAccountEmail);

      let mpResult;

      if (isAnnualPayment) {
        // PAGO ÚNICO ANUAL - Usar preference en lugar de suscripción
        console.log('💰 Creando PAGO ÚNICO ANUAL en MercadoPago para plan:', plan.name);

        const checkoutData = {
          title: `${plan.name} - Plan Anual (12 meses)`,
          description: `${plan.description} - Facturación anual con descuento. Precio mensual equivalente: $${Math.round(finalPrice / 12)} ARS/mes`,
          price: finalPrice,
          currency_id: realCurrency,
          payer_email: payerEmail,
          external_reference: `annual_${subscription._id}`,
          back_urls: {
            success: `${process.env.FRONTEND_URL || 'https://panelmantenimiento.netlify.app'}/subscription/success?lang=es`,
            failure: `${process.env.FRONTEND_URL || 'https://panelmantenimiento.netlify.app'}/subscription/failure?lang=es`,
            pending: `${process.env.FRONTEND_URL || 'https://panelmantenimiento.netlify.app'}/subscription/pending?lang=es`
          }
        };

        console.log('💳 Datos de pago único anual:', {
          amount: finalPrice,
          monthlyEquivalent: Math.round(finalPrice / 12),
          billingCycle: 'yearly',
          currency: realCurrency,
          country: realCountry,
          title: checkoutData.title
        });

        mpResult = await mercadoPagoService.createDirectCheckout(checkoutData);

      } else {
        // SUSCRIPCIÓN MENSUAL RECURRENTE
        const subscriptionData = {
          reason: plan.description,
          external_reference: `subscription_${subscription._id}`,
          payer_email: payerEmail,
          back_url: `${process.env.FRONTEND_URL || 'https://panelmantenimiento.netlify.app'}/subscription/success?lang=es`,
          auto_recurring: {
            frequency: frequency,
            frequency_type: frequencyType,
            transaction_amount: finalPrice,
            currency_id: realCurrency
          },
          status: 'pending'
        };

        console.log('🔄 Creando SUSCRIPCIÓN MENSUAL RECURRENTE en MercadoPago para plan:', plan.name);
        console.log('💳 Datos de suscripción recurrente:', {
          amount: finalPrice,
          billingCycle,
          frequency,
          frequencyType,
          currency: realCurrency,
          country: realCountry,
          reason: subscriptionData.reason
        });

        mpResult = await mercadoPagoService.createSubscription(subscriptionData);
      }

      if (!mpResult.success) {
        throw new Error(`Error en MercadoPago: ${mpResult.message}`);
      }

      // Actualizar suscripción con ID de MercadoPago
      const updateData = {
        billingCycle: billingCycle,
        updatedAt: new Date()
      };

      if (isAnnualPayment) {
        // Pago único anual
        updateData.mpPreferenceId = mpResult.data.id;
        updateData.initPoint = mpResult.data.init_point || mpResult.data.sandbox_init_point;
        updateData.subscriptionType = 'annual_payment';
        console.log('💾 Guardando como pago único anual');
      } else {
        // Suscripción mensual recurrente
        updateData.mpPreapprovalId = mpResult.data.id;
        updateData.initPoint = mpResult.data.init_point || mpResult.data.sandbox_init_point;
        updateData.subscriptionType = 'recurring';
        console.log('💾 Guardando como suscripción recurrente');
      }

      await db.collection('subscriptions').updateOne(
        { _id: subscription._id },
        { $set: updateData }
      );

      checkoutUrl = mpResult.data.init_point || mpResult.data.sandbox_init_point;
      subscriptionResult = {
        subscriptionId: subscription._id,
        checkoutUrl: checkoutUrl,
        initPoint: checkoutUrl,
        mpPreapprovalId: mpResult.data.id,
        subscriptionType: 'recurring'
      };

    } else {
      // Para otros países, usar Polar.sh (por ahora retornar error informativo)
      console.log('🌍 País no soportado actualmente:', userCountry);
      throw new Error(`Pagos desde ${userCountry} no están disponibles temporalmente. Solo se acepta Argentina por el momento.`);
    }

    return {
      success: true,
      data: subscriptionResult
    };

  } catch (error) {
    console.error('Error en createPublicCheckout:', error);
    throw new Error(`Error creando checkout público: ${error.message}`);
  }
}

export {
  registerPublicUser,
  getPublicPlans,
  createPublicCheckout,
  verifyPublicUser,
  resendVerificationCode
}
