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
  const usersCount = await cuentaCollection.countDocuments({ tenantId })
  const { checkTenantLimits } = await import("./tenants.services.js")
  await checkTenantLimits(adminUser.tenantId, "users", usersCount)

  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(cuenta.password, 10)

  // Crear la nueva cuenta con rol de técnico
  const nuevaCuenta = {
    userName: cuenta.userName,
    password: hashedPassword,
    role: "técnico", // Todas las cuentas creadas por admin son técnicos
    tenantId: tenantId, // Asignar al tenant correspondiente
    isVerified: true,
    status: "active",
    createdAt: new Date(),
    createdBy: adminUser._id, // Registrar quién creó la cuenta
    updatedAt: new Date(),
  }

  const result = await cuentaCollection.insertOne(nuevaCuenta)

  // Actualizar estadísticas del tenant
  console.log("🔄 Actualizando estadísticas después de crear cuenta para tenantId:", tenantId)
  const { updateTenantStats } = await import("./tenants.services.js")
  await updateTenantStats(tenantId)
  console.log("✅ Estadísticas actualizadas después de crear cuenta")

  return {
    message: "Cuenta de técnico creada exitosamente",
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
    const query = { role: role }
    if (tenantId) {
      query.tenantId = tenantId
    }
    
    const cuentas = await cuentaCollection
      .find(
        query,
        { projection: { password: 0 } }, // Excluir contraseñas
      )
      .sort({ createdAt: -1 })
      .toArray()

    return cuentas
  } catch (error) {
    console.error("Error al obtener cuentas por rol:", error)
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
      tenant = await tenantsCollection.findOne({ 
        $or: [
          { _id: new ObjectId(user.tenantId) },
          { tenantId: user.tenantId }
        ]
      });

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
          subscription.preapprovalId = subscription.mpSubscriptionId || subscription.mercadopagoPreapprovalId;
          subscription.subscriptionId = subscription._id.toString();
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

export {
  createAccount,
  login,
  publicLogin, // ✅ NUEVA FUNCIÓN EXPORTADA
  getAllAccounts,
  getAccountById,
  updateAccountStatus,
  deleteAccount,
  getAccountsByRole, // ✅ EXPORTAR la nueva función
  getUserProfile, // ✅ NUEVA FUNCIÓN EXPORTADA
}
