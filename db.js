import { MongoClient } from "mongodb"
import dotenv from "dotenv"

dotenv.config()

// Primero obtenemos la cadena de conexión para determinar si es local o remota
const connectionString = process.env.MONGODB_URI_CUSTOM || process.env.MONGODB_URI || '';
const isProduction = process.env.NODE_ENV === "production";

// Configuración base común
const options = {
  // Configuración básica de conexión
  maxPoolSize: 50,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 30000,  // Aumentar timeout para VPS
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,          // Aumentar timeout de conexión
  family: 4,
  
  // Configuración de escritura
  retryWrites: true,
  w: "majority",
  
  // Configuraciones para mejor rendimiento
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 5000,
  
  // Configuraciones para replicación
  readPreference: "primaryPreferred",
  writeConcern: { w: "majority", j: true },
  
  // Configuración de reconexión
  retryReads: true,
  heartbeatFrequencyMS: 10000,
  minHeartbeatFrequencyMS: 500,
  
  // Configuración de autenticación
  authSource: "admin"
};

// Configuración específica por entorno
if (isProduction) {
  console.log("🔧 Configurando MongoDB para PRODUCCIÓN con TLS optimizado...");
  
  // Configuración TLS específica para contenedores VPS
  options.tls = true;
  options.tlsAllowInvalidCertificates = true;  // Aceptar certificados autofirmados
  options.tlsAllowInvalidHostnames = true;     // Ignorar validación de hostname
  options.authSource = 'admin';
  
  // Timeouts aumentados para VPS/contenedores
  options.serverSelectionTimeoutMS = 60000;   // 60 segundos para VPS
  options.connectTimeoutMS = 60000;           // 60 segundos para handshake TLS
  options.socketTimeoutMS = 90000;            // 90 segundos para operaciones
  
  // No usar directConnection con SRV
  if (!connectionString.includes('mongodb+srv://')) {
    options.directConnection = true;
  }
  
  console.log("🔐 Conexión TLS para VPS configurada (timeouts extendidos para contenedores)");
} else if (process.env.USE_TLS === 'true') {
  console.log("🔧 Configurando MongoDB con TLS para desarrollo...");
  
  // Configuración TLS para desarrollo local
  options.tls = true;
  options.tlsAllowInvalidCertificates = true;
  options.tlsAllowInvalidHostnames = true;
  options.authSource = 'admin';
  
  if (!connectionString.includes('mongodb+srv://')) {
    options.directConnection = true;
  }
  
  console.log("🔐 Conexión segura a MongoDB configurada (TLS con validación flexible)");
} else {
  console.log("🔓 Configurando MongoDB sin TLS...");
  
  // Deshabilitar TLS para pruebas de conectividad
  options.tls = false;
  options.ssl = false;
  
  // Solo usar directConnection si no es una cadena SRV
  if (!connectionString.includes('mongodb+srv://')) {
    options.directConnection = true;
  }
  
  console.log("🔓 Conexión a MongoDB sin TLS");
}

// La configuración ahora está arriba, en la definición de options

const client = new MongoClient(process.env.MONGODB_URI_CUSTOM || process.env.MONGODB_URI, options)
const db = client.db("PanelMantenimiento")

let isConnected = false

// Función de conexión mejorada con manejo de errores
const connectDB = async () => {
  if (isConnected) {
    console.log("📊 Ya conectado a MongoDB")
    return true
  }
  
  // Mostrar información de depuración segura
  const showConnectionString = connectionString
    ? `${connectionString.split('@')[0]}@[MASKED]`
    : 'No se encontró MONGODB_URI'
    
  console.log('🔗 Intentando conectar a MongoDB:', showConnectionString)
  console.log('🔧 Opciones de conexión:', {
    tls: options.tls,
    tlsAllowInvalidCertificates: options.tlsAllowInvalidCertificates,
    directConnection: options.directConnection,
    isProduction: isProduction
  })

  try {
    console.log("🔄 Conectando a MongoDB...")
    console.log("🔧 Entorno:", process.env.NODE_ENV || "development")
    
    // Conectar con opciones explícitas
    await client.connect()
    
    // Verificar la conexión con un comando simple
    console.log("🔍 Verificando conexión con el servidor...")
    const pingResult = await client.db("admin").command({ ping: 1 })
    console.log("✅ Ping exitoso:", pingResult)

    isConnected = true
    console.log("✅ Conectado a la base de datos")
    console.log(`📊 Base de datos: PanelMantenimiento`)

    // Crear índices para optimizar consultas multi-tenant
    await createIndexes()

    return true
  } catch (error) {
    console.error("❌ Error al conectar a la base de datos:")
    console.error("📌 Tipo de error:", error.name)
    console.error("📌 Mensaje:", error.message)
    
    // Mostrar detalles adicionales del error
    if (error.name === 'MongoServerSelectionError') {
      console.error("🔍 Detalles de conexión fallida:", error.errorLabels || 'Sin detalles adicionales')
    }

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
