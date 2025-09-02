import { db } from "../db.js"
import { ObjectId } from "mongodb"
import bcrypt from "bcrypt"
import { v4 as uuidv4 } from "uuid"

const tenantCollection = db.collection("tenants")
const cuentaCollection = db.collection("cuentas")

// Crear un nuevo tenant con onboarding automático
async function createTenant(tenantData, superAdminUser) {
  // Verificar que el usuario sea super admin
  if (!superAdminUser || superAdminUser.role !== "super_admin") {
    throw new Error("No tienes permisos para crear tenants")
  }

  // Verificar que el subdominio sea único
  const existingTenant = await tenantCollection.findOne({ subdomain: tenantData.subdomain })
  if (existingTenant) {
    throw new Error("Este subdominio ya está en uso")
  }

  // Generar tenantId único
  const tenantId = uuidv4()

  // Crear el tenant
  const newTenant = {
    _id: new ObjectId(),
    tenantId,
    name: tenantData.name,
    subdomain: tenantData.subdomain,
    email: tenantData.email,
    phone: tenantData.phone || "",
    address: tenantData.address || "",
    plan: tenantData.plan || "basic",
    maxUsers: tenantData.maxUsers || 10,
    maxAssets: tenantData.maxAssets || 100,
    features: {
      workOrders: true,
      assets: true,
      reports: true,
      pdfGeneration: true,
      apiAccess: false,
      customBranding: false,
      prioritySupport: false,
      ...tenantData.features
    },
    status: "active",
    createdAt: new Date(),
    createdBy: superAdminUser._id,
    updatedAt: new Date(),
    // Estadísticas
    stats: {
      totalUsers: 0,
      totalAssets: 0,
      totalWorkOrders: 0,
      lastActivity: new Date()
    }
  }

  const result = await tenantCollection.insertOne(newTenant)

  // Crear usuario admin por defecto para el tenant
  const adminPassword = generateRandomPassword()
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  const adminUser = {
    _id: new ObjectId(),
    tenantId,
    userName: `admin_${tenantData.subdomain}`,
    password: hashedPassword,
    email: tenantData.email,
    role: "admin",
    isVerified: true,
    status: "active",
    createdAt: new Date(),
    createdBy: superAdminUser._id,
    updatedAt: new Date(),
    // Datos adicionales del admin
    firstName: "Administrador",
    lastName: tenantData.name,
    phone: tenantData.phone || "",
    permissions: {
      canManageUsers: true,
      canManageAssets: true,
      canManageWorkOrders: true,
      canViewReports: true,
      canManageSettings: true
    }
  }

  await cuentaCollection.insertOne(adminUser)

  // Actualizar estadísticas del tenant
  await tenantCollection.updateOne(
    { _id: newTenant._id },
    { $inc: { "stats.totalUsers": 1 } }
  )

  return {
    message: "Tenant creado exitosamente",
    tenant: {
      ...newTenant,
      _id: result.insertedId
    },
    adminCredentials: {
      userName: adminUser.userName,
      password: adminPassword,
      email: adminUser.email
    }
  }
}

// Obtener todos los tenants (solo super admin)
async function getAllTenants(superAdminUser, filters = {}) {
  if (!superAdminUser || superAdminUser.role !== "super_admin") {
    throw new Error("No tienes permisos para ver todos los tenants")
  }

  const query = {}
  
  if (filters.status) {
    query.status = filters.status
  }
  
  if (filters.plan) {
    query.plan = filters.plan
  }

  const tenants = await tenantCollection
    .find(query)
    .sort({ createdAt: -1 })
    .toArray()

  return tenants
}

// Obtener tenant por ID
async function getTenantById(tenantId, superAdminUser) {
  if (!superAdminUser || superAdminUser.role !== "super_admin") {
    throw new Error("No tienes permisos para ver tenants")
  }

  if (!ObjectId.isValid(tenantId)) {
    throw new Error("ID de tenant inválido")
  }

  const tenant = await tenantCollection.findOne({ _id: new ObjectId(tenantId) })
  if (!tenant) {
    throw new Error("Tenant no encontrado")
  }

  return tenant
}

// Obtener tenant por subdominio
async function getTenantBySubdomain(subdomain) {
  const tenant = await tenantCollection.findOne({ subdomain })
  if (!tenant) {
    throw new Error("Tenant no encontrado")
  }

  return tenant
}

// Obtener tenant por tenantId
async function getTenantByTenantId(tenantId) {
  const tenant = await tenantCollection.findOne({ tenantId })
  if (!tenant) {
    throw new Error("Tenant no encontrado")
  }

  return tenant
}

// Actualizar tenant
async function updateTenant(tenantId, updateData, superAdminUser) {
  if (!superAdminUser || superAdminUser.role !== "super_admin") {
    throw new Error("No tienes permisos para actualizar tenants")
  }

  if (!ObjectId.isValid(tenantId)) {
    throw new Error("ID de tenant inválido")
  }

  // Verificar que el subdominio sea único si se está actualizando
  if (updateData.subdomain) {
    const existingTenant = await tenantCollection.findOne({
      subdomain: updateData.subdomain,
      _id: { $ne: new ObjectId(tenantId) }
    })
    if (existingTenant) {
      throw new Error("Este subdominio ya está en uso")
    }
  }

  const result = await tenantCollection.updateOne(
    { _id: new ObjectId(tenantId) },
    {
      $set: {
        ...updateData,
        updatedAt: new Date(),
        updatedBy: superAdminUser._id
      }
    }
  )

  if (result.matchedCount === 0) {
    throw new Error("Tenant no encontrado")
  }

  return { message: "Tenant actualizado exitosamente" }
}

// Eliminar tenant (soft delete)
async function deleteTenant(tenantId, superAdminUser) {
  if (!superAdminUser || superAdminUser.role !== "super_admin") {
    throw new Error("No tienes permisos para eliminar tenants")
  }

  if (!ObjectId.isValid(tenantId)) {
    throw new Error("ID de tenant inválido")
  }

  const result = await tenantCollection.updateOne(
    { _id: new ObjectId(tenantId) },
    {
      $set: {
        status: "cancelled",
        deletedAt: new Date(),
        deletedBy: superAdminUser._id,
        updatedAt: new Date()
      }
    }
  )

  if (result.matchedCount === 0) {
    throw new Error("Tenant no encontrado")
  }

  return { message: "Tenant eliminado exitosamente" }
}

// Obtener estadísticas de un tenant
async function getTenantStats(tenantId, superAdminUser) {
  if (!superAdminUser || superAdminUser.role !== "super_admin") {
    throw new Error("No tienes permisos para ver estadísticas")
  }

  if (!ObjectId.isValid(tenantId)) {
    throw new Error("ID de tenant inválido")
  }

  const tenant = await tenantCollection.findOne({ _id: new ObjectId(tenantId) })
  if (!tenant) {
    throw new Error("Tenant no encontrado")
  }

  // Obtener estadísticas reales de las colecciones
  const [usersCount, assetsCount, workOrdersCount] = await Promise.all([
    cuentaCollection.countDocuments({ tenantId: tenant.tenantId }),
    db.collection("assets").countDocuments({ tenantId: tenant.tenantId }),
    db.collection("workOrders").countDocuments({ tenantId: tenant.tenantId })
  ])

  return {
    tenant: tenant.name,
    stats: {
      totalUsers: usersCount,
      totalAssets: assetsCount,
      totalWorkOrders: workOrdersCount,
      plan: tenant.plan,
      maxUsers: tenant.maxUsers,
      maxAssets: tenant.maxAssets,
      usage: {
        users: Math.round((usersCount / tenant.maxUsers) * 100),
        assets: Math.round((assetsCount / tenant.maxAssets) * 100)
      }
    }
  }
}

// Actualizar estadísticas de un tenant usando agregación
async function updateTenantStats(tenantId) {
  console.log("🔍 Actualizando estadísticas para tenantId:", tenantId)
  
  const tenant = await tenantCollection.findOne({ tenantId })
  if (!tenant) {
    console.log("❌ Tenant no encontrado para tenantId:", tenantId)
    return
  }

  console.log("✅ Tenant encontrado:", tenant.name)

  // Usar agregación para calcular estadísticas de manera más eficiente
  const statsPipeline = [
    {
      $facet: {
        users: [
          { $match: { tenantId: tenant.tenantId } },
          { $count: "total" }
        ],
        assets: [
          { $match: { tenantId: tenant.tenantId, eliminado: { $ne: true } } },
          { $count: "total" }
        ],
        workOrders: [
          { $match: { tenantId: tenant.tenantId } },
          { $count: "total" }
        ]
      }
    }
  ]

  const [userStats, assetStats, workOrderStats] = await Promise.all([
    cuentaCollection.aggregate(statsPipeline).toArray(),
    db.collection("activos").aggregate(statsPipeline).toArray(),
    db.collection("workOrders").aggregate(statsPipeline).toArray()
  ])

  const usersCount = userStats[0]?.users[0]?.total || 0
  const assetsCount = assetStats[0]?.assets[0]?.total || 0
  const workOrdersCount = workOrderStats[0]?.workOrders[0]?.total || 0

  console.log("📊 Estadísticas calculadas:", {
    usersCount,
    assetsCount,
    workOrdersCount,
    tenantId: tenant.tenantId
  })

  await tenantCollection.updateOne(
    { tenantId },
    {
      $set: {
        "stats.totalUsers": usersCount,
        "stats.totalAssets": assetsCount,
        "stats.totalWorkOrders": workOrdersCount,
        "stats.lastActivity": new Date(),
        updatedAt: new Date()
      }
    }
  )

  console.log("✅ Estadísticas actualizadas para tenant:", tenant.name)
}

// Verificar límites del plan
async function checkTenantLimits(tenantId, resourceType, currentCount) {
  const tenant = await tenantCollection.findOne({ tenantId })
  if (!tenant) {
    throw new Error("Tenant no encontrado")
  }

  if (tenant.status !== "active") {
    throw new Error("Tenant inactivo")
  }

  let limit = 0
  switch (resourceType) {
    case "users":
      limit = tenant.maxUsers
      break
    case "assets":
      limit = tenant.maxAssets
      break
    default:
      throw new Error("Tipo de recurso inválido")
  }

  if (currentCount >= limit) {
    throw new Error(`Límite de ${resourceType} alcanzado para el plan ${tenant.plan}`)
  }

  return true
}

// Función para forzar actualización de estadísticas de un tenant específico
async function forceUpdateTenantStats(tenantId) {
  console.log("🔄 Forzando actualización de estadísticas para tenantId:", tenantId)
  
  const tenant = await tenantCollection.findOne({ tenantId })
  if (!tenant) {
    console.log("❌ Tenant no encontrado para tenantId:", tenantId)
    return { error: "Tenant no encontrado" }
  }

  console.log("✅ Tenant encontrado:", tenant.name)

  // Contar usuarios manualmente para debug
  const allUsers = await cuentaCollection.find({ tenantId: tenant.tenantId }).toArray()
  console.log("👥 Todos los usuarios encontrados:", allUsers.map(u => ({ userName: u.userName, role: u.role, tenantId: u.tenantId })))

  const [usersCount, assetsCount, workOrdersCount] = await Promise.all([
    cuentaCollection.countDocuments({ tenantId: tenant.tenantId }),
    db.collection("assets").countDocuments({ tenantId: tenant.tenantId }),
    db.collection("workOrders").countDocuments({ tenantId: tenant.tenantId })
  ])

  console.log("📊 Estadísticas calculadas:", {
    usersCount,
    assetsCount,
    workOrdersCount,
    tenantId: tenant.tenantId
  })

  const result = await tenantCollection.updateOne(
    { tenantId },
    {
      $set: {
        "stats.totalUsers": usersCount,
        "stats.totalAssets": assetsCount,
        "stats.totalWorkOrders": workOrdersCount,
        "stats.lastActivity": new Date(),
        updatedAt: new Date()
      }
    }
  )

  console.log("✅ Resultado de actualización:", result)

  return {
    message: "Estadísticas actualizadas",
    tenant: tenant.name,
    stats: {
      totalUsers: usersCount,
      totalAssets: assetsCount,
      totalWorkOrders: workOrdersCount
    }
  }
}

// Función auxiliar para generar contraseña aleatoria
function generateRandomPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let password = ""
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export {
  createTenant,
  getAllTenants,
  getTenantById,
  getTenantBySubdomain,
  getTenantByTenantId,
  updateTenant,
  deleteTenant,
  getTenantStats,
  updateTenantStats,
  forceUpdateTenantStats,
  checkTenantLimits
} 