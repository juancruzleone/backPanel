import { db } from "../db.js"
import bcrypt from "bcrypt"
import { ObjectId } from "mongodb"

const cuentaCollection = db.collection("cuentas")

async function createAccount(cuenta, adminUser, tenantId) {
  // Verificar que el usuario que crea la cuenta sea admin o super_admin
  if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
    throw new Error("No tienes permisos para crear cuentas")
  }

  // Para super_admin, permitir crear cuentas con o sin tenantId
  if (adminUser.role === "super_admin") {
    // Verificar si ya existe el nombre de usuario
    const query = { userName: cuenta.userName }
    if (tenantId) {
      query.tenantId = tenantId
    }

    const existe = await cuentaCollection.findOne(query)
    if (existe) throw new Error("El nombre de usuario ya existe")

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(cuenta.password, 10)

    // Crear la nueva cuenta
    const nuevaCuenta = {
      userName: cuenta.userName,
      password: hashedPassword,
      role: cuenta.role || "técnico",
      tenantId: tenantId, // Puede ser null para super_admin o el tenantId específico
      isVerified: true,
      status: "active",
      createdAt: new Date(),
      createdBy: adminUser._id,
      updatedAt: new Date(),
    }

    const result = await cuentaCollection.insertOne(nuevaCuenta)

    // Actualizar estadísticas del tenant si se proporciona tenantId
    if (tenantId) {
      console.log("🔄 Super admin: Actualizando estadísticas para tenantId:", tenantId)
      const { updateTenantStats } = await import("./tenants.services.js")
      await updateTenantStats(tenantId)
      console.log("✅ Super admin: Estadísticas actualizadas")
    }

    return {
      message: "Cuenta creada exitosamente",
      cuenta: {
        ...nuevaCuenta,
        _id: result.insertedId,
        password: undefined, // No devolver la contraseña
      },
    }
  }

  // Para admin normal, verificar tenant
  if (adminUser.tenantId !== tenantId) {
    throw new Error("No tienes permisos para crear cuentas en este tenant")
  }

  // Verificar si ya existe el nombre de usuario en el mismo tenant
  const existe = await cuentaCollection.findOne({
    userName: cuenta.userName,
    tenantId: tenantId
  })
  if (existe) throw new Error("El nombre de usuario ya existe en este tenant")

  // Verificar límites del tenant
  const usersCount = await cuentaCollection.countDocuments({ tenantId, status: { $ne: "deleted" } })
  const { checkTenantLimits } = await import("./tenants.services.js")
  await checkTenantLimits(adminUser.tenantId, "users", usersCount)

  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(cuenta.password, 10)

  // Validar que el rol sea válido
  const rolesPermitidos = ["técnico", "tecnico", "cliente"]
  const rol = cuenta.role && rolesPermitidos.includes(cuenta.role) ? cuenta.role : "técnico"

  // Crear la nueva cuenta con el rol especificado
  const nuevaCuenta = {
    userName: cuenta.userName,
    password: hashedPassword,
    name: cuenta.name || cuenta.userName, // Agregar nombre completo si está disponible
    role: rol, // Usar el rol enviado por el frontend (cliente o técnico)
    tenantId: tenantId, // Asignar al tenant correspondiente
    isVerified: true,
    status: "active",
    createdAt: new Date(),
    createdBy: adminUser._id, // Registrar quién creó la cuenta
    updatedAt: new Date(),
  }

  const result = await cuentaCollection.insertOne(nuevaCuenta)

  // Actualizar estadísticas del tenant
  console.log(`🔄 Actualizando estadísticas después de crear cuenta (${rol}) para tenantId:`, tenantId)
  const { updateTenantStats } = await import("./tenants.services.js")
  await updateTenantStats(tenantId)
  console.log("✅ Estadísticas actualizadas después de crear cuenta")

  return {
    message: `Cuenta de ${rol} creada exitosamente`,
    cuenta: {
      ...nuevaCuenta,
      _id: result.insertedId,
      password: undefined, // No devolver la contraseña
    },
  }
}

async function login(cuenta, tenantId = null) {
  // Construir query según si se proporciona tenantId o no
  const query = { userName: cuenta.userName }
  if (tenantId) {
    query.tenantId = tenantId
  }

  const existe = await cuentaCollection.findOne(query)
  if (!existe) throw new Error("Credenciales inválidas")

  // Verificar que la cuenta esté activa
  if (existe.status !== "active") {
    throw new Error("La cuenta no está activa. Contacte al administrador.")
  }

  // Verificar la contraseña
  const esValido = await bcrypt.compare(cuenta.password, existe.password)
  if (!esValido) throw new Error("Credenciales inválidas")

  // VALIDAR TENANT Y PLAN PARA ACCESO AL PANEL GMAO
  // Permitir super_admin sin validación de tenant/plan
  if (existe.role === "super_admin") {
    console.log('👑 [LOGIN] Super admin detectado - acceso permitido sin validación de tenant')
  } else {
    // Para otros usuarios, validar tenant y plan
    if (!existe.tenantId || existe.tenantId === "default") {
      throw new Error("Acceso denegado. Se requiere una cuenta asociada a una organización válida.")
    }

    try {
      const { getTenantByTenantId } = await import("./tenants.services.js")
      const tenant = await getTenantByTenantId(existe.tenantId)

      console.log('🏢 [LOGIN] Validando tenant:', {
        tenantId: tenant.tenantId,
        plan: tenant.plan,
        status: tenant.status
      })

      // Verificar que el tenant esté activo
      if (tenant.status !== 'active') {
        throw new Error(`Cuenta suspendida (${tenant.status}). Contacte al administrador.`)
      }

      // Verificar que el tenant tenga un plan válido (no gratuito)
      if (!tenant.plan || tenant.plan === 'free' || tenant.plan === 'trial') {
        throw new Error("Se requiere un plan de suscripción activo para acceder al panel GMAO.")
      }

      // Verificar fecha de expiración si existe
      if (tenant.subscriptionExpiresAt) {
        const now = new Date()
        const expirationDate = new Date(tenant.subscriptionExpiresAt)

        if (now > expirationDate) {
          throw new Error("Su suscripción ha expirado. Renueve su plan para continuar.")
        }
      }

      console.log('✅ [LOGIN] Tenant con plan válido - acceso permitido')

    } catch (error) {
      console.error('❌ [LOGIN] Error validando tenant:', error.message)
      throw new Error(error.message)
    }
  }

  // Actualizar último login
  await cuentaCollection.updateOne(
    { _id: existe._id },
    {
      $set: {
        lastLogin: new Date(),
        updatedAt: new Date(),
      },
    },
  )

  return { ...existe, password: undefined }
}

async function getAllAccounts(tenantId) {
  const query = tenantId ? { tenantId } : {}
  return cuentaCollection
    .find(query, { projection: { password: 0 } }) // Excluir contraseñas y filtrar por tenant
    .sort({ createdAt: -1 })
    .toArray()
}

async function getAccountById(id) {
  if (!ObjectId.isValid(id)) {
    throw new Error("ID de usuario inválido")
  }

  const cuenta = await cuentaCollection.findOne(
    { _id: new ObjectId(id) },
    { projection: { password: 0 } }, // Excluir contraseña
  )

  return cuenta
}

// ✅ NUEVA FUNCIÓN: obtener cuentas por rol
async function getAccountsByRole(role, tenantId) {
  try {
    console.log("🔍 [AUTH SERVICE] Buscando cuentas por rol:", role)
    console.log("🔍 [AUTH SERVICE] TenantId:", tenantId)

    // Buscar tanto "técnico" como "tecnico" para manejar inconsistencias
    const query = {
      $or: [
        { role: "técnico" },
        { role: "tecnico" }
      ]
    }

    if (tenantId) {
      query.tenantId = tenantId
    }

    console.log("🔍 [AUTH SERVICE] Query MongoDB:", JSON.stringify(query))

    const cuentas = await cuentaCollection
      .find(
        query,
        { projection: { password: 0 } }, // Excluir contraseñas
      )
      .sort({ createdAt: -1 })
      .toArray()

    console.log("✅ [AUTH SERVICE] Cuentas encontradas:", cuentas.length)
    console.log("📋 [AUTH SERVICE] Detalle cuentas:", cuentas.map(c => ({
      _id: c._id,
      userName: c.userName,
      role: c.role,
      tenantId: c.tenantId
    })))

    return cuentas
  } catch (error) {
    console.error("❌ [AUTH SERVICE] Error al obtener cuentas por rol:", error)
    throw new Error("Error al obtener cuentas por rol")
  }
}

// Función para actualizar el estado de una cuenta (solo admin)
async function updateAccountStatus(id, status, adminUser) {
  if (!adminUser || adminUser.role !== "admin") {
    throw new Error("No tienes permisos para modificar cuentas")
  }

  if (!ObjectId.isValid(id)) {
    throw new Error("ID de usuario inválido")
  }

  const validStatuses = ["active", "inactive", "suspended"]
  if (!validStatuses.includes(status)) {
    throw new Error("Estado inválido")
  }

  const result = await cuentaCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        updatedAt: new Date(),
        updatedBy: adminUser._id,
      },
    },
  )

  if (result.matchedCount === 0) {
    throw new Error("Usuario no encontrado")
  }

  return { message: "Estado de cuenta actualizado exitosamente" }
}

// Función para eliminar una cuenta (admin y super_admin)
async function deleteAccount(id, adminUser) {
  if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
    throw new Error("No tienes permisos para eliminar cuentas")
  }

  if (!ObjectId.isValid(id)) {
    throw new Error("ID de usuario inválido")
  }

  // No permitir que el usuario se elimine a sí mismo
  if (adminUser._id.toString() === id) {
    throw new Error("No puedes eliminar tu propia cuenta")
  }

  // Obtener el usuario antes de eliminarlo para actualizar estadísticas
  const userToDelete = await cuentaCollection.findOne({ _id: new ObjectId(id) })
  if (!userToDelete) {
    throw new Error("Usuario no encontrado")
  }

  const result = await cuentaCollection.deleteOne({ _id: new ObjectId(id) })

  if (result.deletedCount === 0) {
    throw new Error("Usuario no encontrado")
  }

  // Actualizar estadísticas del tenant si el usuario eliminado tenía tenantId
  if (userToDelete.tenantId) {
    const { updateTenantStats } = await import("./tenants.services.js")
    await updateTenantStats(userToDelete.tenantId)
  }

  return { message: "Cuenta eliminada exitosamente" }
}

// NUEVA FUNCIÓN: Login público para landing (sin validación de planes)
async function publicLogin(cuenta, tenantId = null) {
  // Construir query según si se proporciona tenantId o no
  const query = { userName: cuenta.userName }
  if (tenantId) {
    query.tenantId = tenantId
  }

  const existe = await cuentaCollection.findOne(query)
  if (!existe) throw new Error("Credenciales inválidas")

  // Verificar que la cuenta esté activa
  if (existe.status !== "active") {
    throw new Error("La cuenta no está activa. Contacte al administrador.")
  }

  // Verificar la contraseña
  const esValido = await bcrypt.compare(cuenta.password, existe.password)
  if (!esValido) throw new Error("Credenciales inválidas")

  // SOLO PERMITIR ACCESO A USUARIOS ADMIN (sin validar planes del tenant)
  if (existe.role !== "admin") {
    throw new Error("Acceso denegado. Solo usuarios administradores pueden acceder desde la landing.")
  }

  console.log('🌐 [PUBLIC LOGIN] Login público exitoso para admin:', {
    userName: existe.userName,
    role: existe.role,
    tenantId: existe.tenantId
  })

  // Actualizar último login
  await cuentaCollection.updateOne(
    { _id: existe._id },
    {
      $set: {
        lastLogin: new Date(),
        updatedAt: new Date(),
      },
    },
  )

  return { ...existe, password: undefined }
}

// Obtener perfil completo del usuario con información del tenant y suscripción
async function getUserProfile(userId) {
  try {
    // Obtener información del usuario
    const user = await cuentaCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } } // Excluir la contraseña
    );

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    let tenant = null;
    let subscription = null;

    // Si el usuario tiene tenantId, obtener información del tenant
    if (user.tenantId) {
      const { db } = await import("../db.js");
      const tenantsCollection = db.collection("tenants");
      const subscriptionsCollection = db.collection("subscriptions");

      // Obtener información del tenant - buscar por _id o tenantId
      // Verificar si tenantId es un ObjectId válido o un UUID
      const tenantQuery = { tenantId: user.tenantId };

      // Solo intentar buscar por _id si el tenantId parece ser un ObjectId válido (24 caracteres hex)
      if (user.tenantId && user.tenantId.length === 24 && /^[0-9a-fA-F]{24}$/.test(user.tenantId)) {
        tenant = await tenantsCollection.findOne({
          $or: [
            { _id: new ObjectId(user.tenantId) },
            { tenantId: user.tenantId }
          ]
        });
      } else {
        // Si es UUID u otro formato, buscar solo por campo tenantId
        tenant = await tenantsCollection.findOne(tenantQuery);
      }

      // Obtener información de la suscripción activa
      if (tenant) {
        // Buscar suscripción por tenantId (string) o _id del tenant
        subscription = await subscriptionsCollection.findOne({
          $or: [
            { tenantId: tenant._id.toString() },
            { tenantId: tenant.tenantId }
          ],
          status: { $in: ['active', 'authorized'] }
        });

        // Agregar información del proveedor de pago y IDs necesarios para cancelación
        if (subscription) {
          subscription.paymentProvider = subscription.processor || 'mercadopago';
          // Buscar preapprovalId en múltiples campos posibles (incluir mercadoPagoId)
          subscription.preapprovalId = subscription.mpSubscriptionId ||
            subscription.mercadopagoPreapprovalId ||
            subscription.preapprovalId ||
            subscription.mercadoPagoId ||
            null;
          subscription.subscriptionId = subscription._id.toString();

          console.log('🔍 Datos de suscripción encontrados para perfil:', {
            _id: subscription._id,
            status: subscription.status,
            processor: subscription.processor,
            mpSubscriptionId: subscription.mpSubscriptionId,
            mercadopagoPreapprovalId: subscription.mercadopagoPreapprovalId,
            mercadoPagoId: subscription.mercadoPagoId,
            preapprovalId: subscription.preapprovalId,
            finalPreapprovalId: subscription.preapprovalId
          });
        }
      }
    }

    return {
      user,
      tenant,
      subscription,
      plan: tenant?.planDetails || null
    };
  } catch (error) {
    console.error("Error en getUserProfile:", error);
    throw error;
  }
}

// NUEVA FUNCIÓN: Crear cuenta demo completa (tenant + suscripción fake)
async function createDemoAccount(demoData, superAdminUser) {
  // SOLO super_admin puede crear cuentas demo
  if (!superAdminUser || superAdminUser.role !== "super_admin") {
    throw new Error("No tienes permisos para crear cuentas demo")
  }

  const { db } = await import("../db.js")
  const { v4: uuidv4 } = await import("uuid")
  const tenantCollection = db.collection("tenants")
  const subscriptionsCollection = db.collection("subscriptions")
  const { PLANS_CONFIG } = await import("../config/plans.config.js")

  // Validar datos requeridos
  if (!demoData.email || !demoData.password || !demoData.companyName) {
    throw new Error("Email, contraseña y nombre de empresa son obligatorios")
  }

  // Verificar que el email no exista
  const existingUser = await cuentaCollection.findOne({ email: demoData.email })
  if (existingUser) {
    throw new Error("El email ya está registrado")
  }

  // Generar subdominio automático desde el nombre de la empresa
  const baseSubdomain = demoData.companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/[^a-z0-9]/g, "-") // Reemplazar caracteres especiales con guiones
    .replace(/-+/g, "-") // Eliminar guiones duplicados
    .replace(/^-|-$/g, "") // Eliminar guiones al inicio y final
    .substring(0, 30) // Limitar longitud

  // Verificar si el subdominio ya existe y agregar número si es necesario
  let subdomain = baseSubdomain
  let counter = 1
  while (await tenantCollection.findOne({ subdomain })) {
    subdomain = `${baseSubdomain}-${counter}`
    counter++
  }

  // Determinar plan (por defecto professional para demos)
  const plan = demoData.plan || "professional"
  const planConfig = PLANS_CONFIG[plan] || PLANS_CONFIG.professional

  // Determinar duración de la demo (por defecto 30 días)
  const demoDurationDays = demoData.demoDurationDays || 30
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + demoDurationDays)

  // 1. CREAR TENANT
  const tenantId = uuidv4()
  const newTenant = {
    _id: new ObjectId(),
    tenantId,
    name: demoData.companyName,
    subdomain,
    email: demoData.email,
    phone: demoData.phone || "",
    address: demoData.address || "",
    plan: plan,
    status: "active",
    subscriptionExpiresAt: expirationDate,
    isDemo: true, // Marcar como cuenta demo
    demoCreatedAt: new Date(),
    demoExpiresAt: expirationDate,
    // Límites según el plan
    maxUsers: planConfig.maxUsers,
    maxFacilities: planConfig.maxFacilities,
    maxAssets: planConfig.maxAssets,
    maxDevices: planConfig.maxDevices,
    maxFormTemplates: planConfig.maxFormTemplates,
    maxWorkOrders: planConfig.maxWorkOrders,
    maxManuals: planConfig.maxManuals,
    features: planConfig.features,
    limits: planConfig.limits,
    createdAt: new Date(),
    createdBy: superAdminUser._id,
    updatedAt: new Date(),
    stats: {
      totalUsers: 0,
      totalAssets: 0,
      totalWorkOrders: 0,
      lastActivity: new Date()
    }
  }

  await tenantCollection.insertOne(newTenant)
  console.log(`✅ [DEMO] Tenant creado: ${tenantId}`, {
    name: newTenant.name,
    subdomain: newTenant.subdomain,
    plan: newTenant.plan,
    expiresAt: expirationDate
  })

  // 2. CREAR USUARIO ADMIN
  const hashedPassword = await bcrypt.hash(demoData.password, 10)
  const userName = demoData.userName || `admin_${subdomain}`

  const adminUser = {
    _id: new ObjectId(),
    tenantId: tenantId,
    userName: userName,
    email: demoData.email,
    password: hashedPassword,
    role: "admin",
    isVerified: true,
    status: "active",
    isDemo: true, // Marcar como usuario demo
    firstName: demoData.firstName || "Demo",
    lastName: demoData.lastName || "User",
    phone: demoData.phone || "",
    createdAt: new Date(),
    createdBy: superAdminUser._id,
    updatedAt: new Date(),
    permissions: {
      canManageUsers: true,
      canManageAssets: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: true
    }
  }

  await cuentaCollection.insertOne(adminUser)
  console.log(`✅ [DEMO] Usuario admin creado: ${userName}`)

  // 3. CREAR SUSCRIPCIÓN FAKE
  const fakeSubscription = {
    _id: new ObjectId(),
    tenantId: tenantId,
    planId: plan,
    planName: planConfig.name,
    status: "active",
    processor: "demo", // Procesador fake para identificar demos
    frequency: "monthly",
    amount: 0, // Sin costo para demos
    currency: "ARS",
    startDate: new Date(),
    expiresAt: expirationDate,
    autoRenew: false,
    isDemo: true, // Marcar como suscripción demo
    demoSubscriptionId: `demo_${tenantId}_${Date.now()}`,
    createdAt: new Date(),
    createdBy: superAdminUser._id,
    metadata: {
      createdBy: "super_admin",
      demoType: "manual",
      demoDurationDays: demoDurationDays,
      notes: demoData.notes || "Cuenta demo creada manualmente"
    }
  }

  await subscriptionsCollection.insertOne(fakeSubscription)
  console.log(`✅ [DEMO] Suscripción fake creada`, {
    plan: plan,
    expiresAt: expirationDate
  })

  // Actualizar estadísticas del tenant
  await tenantCollection.updateOne(
    { _id: newTenant._id },
    { $inc: { "stats.totalUsers": 1 } }
  )

  return {
    success: true,
    message: `Cuenta demo creada exitosamente. Expira en ${demoDurationDays} días.`,
    tenant: {
      tenantId: newTenant.tenantId,
      name: newTenant.name,
      subdomain: newTenant.subdomain,
      plan: newTenant.plan,
      expiresAt: expirationDate
    },
    user: {
      userName: adminUser.userName,
      email: adminUser.email,
      role: adminUser.role
    },
    credentials: {
      userName: adminUser.userName,
      password: demoData.password, // Devolver la contraseña para que el super admin la pueda compartir
      loginUrl: `https://tudominio.com/login` // Ajustar según tu dominio
    },
    subscription: {
      planName: planConfig.name,
      expiresAt: expirationDate,
      daysRemaining: demoDurationDays
    }
  }
}

// Función para actualizar perfil del usuario (solo puede actualizar sus propios datos básicos)
async function updateUserProfile(userId, updates) {
  if (!ObjectId.isValid(userId)) {
    throw new Error("ID de usuario inválido")
  }

  // Campos permitidos para actualización
  const allowedFields = ["userName", "name", "firstName", "lastName", "email"]
  const updateData = {}

  // Filtrar solo campos permitidos
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field]
    }
  }

  // Si se actualiza el userName, verificar que no exista en otro usuario
  if (updateData.userName) {
    const existingUser = await cuentaCollection.findOne({
      userName: updateData.userName,
      _id: { $ne: new ObjectId(userId) }
    })
    if (existingUser) {
      throw new Error("El nombre de usuario ya está en uso")
    }
  }

  // Si se actualiza el email, verificar que no exista en otro usuario
  if (updateData.email) {
    const existingUser = await cuentaCollection.findOne({
      email: updateData.email,
      _id: { $ne: new ObjectId(userId) }
    })
    if (existingUser) {
      throw new Error("El email ya está en uso por otro usuario")
    }
  }

  updateData.updatedAt = new Date()

  const result = await cuentaCollection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: updateData }
  )

  if (result.matchedCount === 0) {
    throw new Error("Usuario no encontrado")
  }

  return {
    success: true,
    message: "Perfil actualizado exitosamente"
  }
}

// Función para actualizar contraseña del usuario
async function updateUserPassword(userId, currentPassword, newPassword) {
  if (!ObjectId.isValid(userId)) {
    throw new Error("ID de usuario inválido")
  }

  // Obtener usuario
  const user = await cuentaCollection.findOne({ _id: new ObjectId(userId) })
  if (!user) {
    throw new Error("Usuario no encontrado")
  }

  // Verificar contraseña actual
  const isValid = await bcrypt.compare(currentPassword, user.password)
  if (!isValid) {
    throw new Error("La contraseña actual es incorrecta")
  }

  // Hash de la nueva contraseña
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  // Actualizar contraseña
  const result = await cuentaCollection.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    }
  )

  if (result.matchedCount === 0) {
    throw new Error("Usuario no encontrado")
  }

  return {
    success: true,
    message: "Contraseña actualizada exitosamente"
  }
}

// Función para que admin actualice datos de técnicos de su tenant
async function updateTechnicianByAdmin(technicianId, updates, adminUser) {
  if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
    throw new Error("No tienes permisos para actualizar técnicos")
  }

  if (!ObjectId.isValid(technicianId)) {
    throw new Error("ID de técnico inválido")
  }

  // Obtener el técnico
  const technician = await cuentaCollection.findOne({ _id: new ObjectId(technicianId) })
  if (!technician) {
    throw new Error("Técnico no encontrado")
  }

  // Verificar que sea un técnico
  if (technician.role !== "técnico" && technician.role !== "tecnico") {
    throw new Error("Solo se pueden editar usuarios con rol técnico")
  }

  // Verificar que el admin solo pueda editar técnicos de su tenant (excepto super_admin)
  if (adminUser.role !== "super_admin" && technician.tenantId !== adminUser.tenantId) {
    throw new Error("No tienes permisos para editar este técnico")
  }

  // Campos permitidos para actualización por admin
  const allowedFields = ["userName", "password", "name", "email"]
  const updateData = {}

  // Filtrar solo campos permitidos
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (field === "password") {
        // Hash de la contraseña
        updateData.password = await bcrypt.hash(updates.password, 10)
      } else if (field === "userName") {
        // Verificar que el userName no exista en otro usuario del mismo tenant
        const existingUser = await cuentaCollection.findOne({
          userName: updates.userName,
          tenantId: technician.tenantId,
          _id: { $ne: new ObjectId(technicianId) }
        })
        if (existingUser) {
          throw new Error("El nombre de usuario ya está en uso en este tenant")
        }
        updateData.userName = updates.userName
      } else if (field === "email") {
        // Verificar que el email no exista en otro usuario
        const existingUser = await cuentaCollection.findOne({
          email: updates.email,
          _id: { $ne: new ObjectId(technicianId) }
        })
        if (existingUser) {
          throw new Error("El email ya está en uso por otro usuario")
        }
        updateData.email = updates.email
      } else {
        updateData[field] = updates[field]
      }
    }
  }

  updateData.updatedAt = new Date()
  updateData.updatedBy = adminUser._id

  const result = await cuentaCollection.updateOne(
    { _id: new ObjectId(technicianId) },
    { $set: updateData }
  )

  if (result.matchedCount === 0) {
    throw new Error("Técnico no encontrado")
  }

  return {
    success: true,
    message: "Técnico actualizado exitosamente"
  }
}

// Función para actualizar datos de facturación del tenant (solo admin)
async function updateTenantBillingInfo(tenantId, updates, adminUser) {
  if (!adminUser || adminUser.role !== "admin") {
    throw new Error("No tienes permisos para actualizar datos de facturación")
  }

  // Verificar que el admin solo pueda editar su propio tenant
  if (adminUser.tenantId !== tenantId) {
    throw new Error("No tienes permisos para editar este tenant")
  }

  const tenantsCollection = db.collection("tenants")

  // Campos permitidos para actualización
  const allowedFields = [
    "email", "address", "name",
    "razonSocial", "tipoDocumento", "numeroDocumento",
    "condicionIVA", "direccionFiscal", "ciudad",
    "provincia", "codigoPostal",
    "taxIdType", "taxIdNumber", "addressIntl",
    "cityIntl", "postalCodeIntl"
  ]

  const updateData = {}

  // Filtrar solo campos permitidos
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field]
    }
  }

  updateData.updatedAt = new Date()

  // Buscar por tenantId string o por _id
  const result = await tenantsCollection.updateOne(
    {
      $or: [
        { tenantId: tenantId },
        { _id: tenantId }
      ]
    },
    { $set: updateData }
  )

  if (result.matchedCount === 0) {
    throw new Error("Tenant no encontrado")
  }

  return {
    success: true,
    message: "Datos de facturación actualizados exitosamente"
  }
}

export {
  createAccount,
  login,
  publicLogin,
  getAllAccounts,
  getAccountById,
  getAccountsByRole,
  updateAccountStatus,
  deleteAccount,
  getUserProfile,
  createDemoAccount,
  updateUserProfile,
  updateUserPassword,
  updateTechnicianByAdmin,
  updateTenantBillingInfo
}
