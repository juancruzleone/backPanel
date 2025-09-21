import { MongoClient } from "mongodb"
import dotenv from "dotenv"

dotenv.config()

// Configuración de opciones de conexión optimizada para escalabilidad
const options = {
  maxPoolSize: 50, // Aumentar pool de conexiones para muchos tenants
  minPoolSize: 10,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4, // Usar IPv4
  retryWrites: true,
  w: "majority",
  // Configuraciones para mejor rendimiento
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 2500,
  // Configuraciones para replicación
  readPreference: "secondaryPreferred", // Leer desde secundarios cuando sea posible
  writeConcern: { w: "majority", j: true }
}

// Configuración TLS - usar opciones compatibles para evitar problemas de certificados
if (process.env.NODE_ENV === "production") {
  options.tls = true
  options.tlsAllowInvalidCertificates = true
  options.tlsAllowInvalidHostnames = true
  options.authSource = "admin"
  // Removido tlsInsecure porque es incompatible con tlsAllowInvalidCertificates
}

// Fallback sin TLS para desarrollo
if (process.env.DISABLE_TLS === "true") {
  options.tls = false
  options.ssl = false
}

const client = new MongoClient(process.env.MONGODB_URI_CUSTOM || process.env.MONGODB_URI, options)
const db = client.db("PanelMantenimiento")

let isConnected = false

// Función de conexión mejorada con manejo de errores
const connectDB = async () => {
  if (isConnected) {
    console.log("📊 Ya conectado a MongoDB")
    return true
  }

  try {
    console.log("🔄 Conectando a MongoDB...")
    console.log("🔧 Entorno:", process.env.NODE_ENV || "development")

    await client.connect()

    // Verificar la conexión
    await client.db("admin").command({ ping: 1 })

    isConnected = true
    console.log("✅ Conectado a la base de datos")
    console.log(`📊 Base de datos: PanelMantenimiento`)

    // Crear índices para optimizar consultas multi-tenant
    await createIndexes()

    return true
  } catch (error) {
    console.error("❌ Error al conectar a la base de datos:", error.message)

    // Retry logic para producción
    if (process.env.NODE_ENV === "production") {
      console.log("🔄 Reintentando conexión en 5 segundos...")
      setTimeout(() => {
        connectDB()
      }, 5000)
    }

    return false
  }
}

// Crear índices para optimización multi-tenant
async function createIndexes() {
  try {
    console.log("🔧 Creando índices para optimización multi-tenant...")
    
    // Índices para cuentas
    await db.collection("cuentas").createIndex({ tenantId: 1 })
    await db.collection("cuentas").createIndex({ tenantId: 1, role: 1 })
    await db.collection("cuentas").createIndex({ tenantId: 1, status: 1 })
    await db.collection("cuentas").createIndex({ tenantId: 1, createdAt: -1 })
    
    // Índices para instalaciones
    await db.collection("instalaciones").createIndex({ tenantId: 1 })
    await db.collection("instalaciones").createIndex({ tenantId: 1, status: 1 })
    await db.collection("instalaciones").createIndex({ tenantId: 1, createdAt: -1 })
    await db.collection("instalaciones").createIndex({ tenantId: 1, installationType: 1 })
    
    // Índices para activos
    await db.collection("activos").createIndex({ tenantId: 1 })
    await db.collection("activos").createIndex({ tenantId: 1, eliminado: 1 })
    await db.collection("activos").createIndex({ tenantId: 1, templateId: 1 })
    await db.collection("activos").createIndex({ tenantId: 1, createdAt: -1 })
    
    // Índices para plantillas de formularios
    await db.collection("formTemplates").createIndex({ tenantId: 1 })
    await db.collection("formTemplates").createIndex({ tenantId: 1, categoria: 1 })
    await db.collection("formTemplates").createIndex({ tenantId: 1, createdAt: -1 })
    
    // Índices para manuales
    await db.collection("manuales").createIndex({ tenantId: 1 })
    await db.collection("manuales").createIndex({ tenantId: 1, assetId: 1 })
    await db.collection("manuales").createIndex({ tenantId: 1, createdAt: -1 })
    
    // Índices para órdenes de trabajo
    await db.collection("workOrders").createIndex({ tenantId: 1 })
    await db.collection("workOrders").createIndex({ tenantId: 1, estado: 1 })
    await db.collection("workOrders").createIndex({ tenantId: 1, tecnicoId: 1 })
    await db.collection("workOrders").createIndex({ tenantId: 1, createdAt: -1 })
    await db.collection("workOrders").createIndex({ tenantId: 1, instalacionId: 1 })
    
    // Índices para tipos de instalación
    await db.collection("installationTypes").createIndex({ tenantId: 1 })
    await db.collection("installationTypes").createIndex({ tenantId: 1, activo: 1 })
    
    // Índices para categorías
    await db.collection("categories").createIndex({ tenantId: 1 })
    await db.collection("categories").createIndex({ tenantId: 1, activo: 1 })
    await db.collection("categories").createIndex({ tenantId: 1, createdAt: -1 })
    
    // Índices para tenants
    await db.collection("tenants").createIndex({ tenantId: 1 }, { unique: true })
    await db.collection("tenants").createIndex({ subdomain: 1 }, { unique: true })
    await db.collection("tenants").createIndex({ status: 1 })
    await db.collection("tenants").createIndex({ plan: 1 })
    await db.collection("tenants").createIndex({ createdAt: -1 })
    
    // Índices para tokens
    await db.collection("tokens").createIndex({ token: 1 })
    await db.collection("tokens").createIndex({ tenantId: 1 })
    await db.collection("tokens").createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 }) // TTL 24h
    
    console.log("✅ Índices creados exitosamente")
  } catch (error) {
    console.error("❌ Error creando índices:", error)
  }
}

// Manejo de cierre graceful
const closeConnection = async () => {
  if (isConnected) {
    console.log("🔄 Cerrando conexión a MongoDB...")
    await client.close()
    isConnected = false
    console.log("✅ Conexión cerrada")
  }
}

process.on("SIGINT", async () => {
  await closeConnection()
  process.exit(0)
})

process.on("SIGTERM", async () => {
  await closeConnection()
  process.exit(0)
})

// NO conectar automáticamente aquí - solo exportar las funciones
export { client, db, connectDB, closeConnection }
