import { db } from "../db.js"
import bcrypt from "bcrypt"
import { ObjectId } from "mongodb"
import { v4 as uuidv4 } from "uuid"

const cuentaCollection = db.collection("cuentas")
const tenantCollection = db.collection("tenants")
const subscriptionPlansCollection = db.collection("subscriptionplans")

async function registerPublicUser(userData) {
  const { userName, password, name, email, tenantName, tenantAddress } = userData

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

export { registerPublicUser, getPublicPlans }
