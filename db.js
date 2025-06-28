import { MongoClient } from "mongodb"
import dotenv from "dotenv"

dotenv.config()

// Configuración de opciones de conexión
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4, // Usar IPv4
  retryWrites: true,
  w: "majority",
}

// Agregar opciones SSL específicas para producción
if (process.env.NODE_ENV === "production") {
  options.ssl = true
  options.sslValidate = false // Para Render
  options.authSource = "admin"
}

const client = new MongoClient(process.env.MONGODB_URI, options)
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
