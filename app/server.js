import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import { db } from '../db.js'
import ApiAssetsRoutes from "../api/routes/route.api.assets.js"
import ApiClientsRoutes from "../api/routes/route.api.clients.js"
import ApiInstallationsRoutes from "../api/routes/route.api.installations.js"
import ApiAuthRoutes from "../api/routes/route.api.auth.js"
import ApiFormTemplatesRoutes from "../api/routes/route.api.formTemplates.js"
import ApiCategoriesRoute from "../api/routes/route.api.categories.js"
import ApiTypeInstallationRoute from "../api/routes/route.api.installationType.js"
import ApiManualsRoutes from "../api/routes/route.api.manuals.js"
import ApiWorkOrdersRoutes from "../api/routes/route.api.workOders.js"
import ApiTenantsRoutes from "../api/routes/route.api.tenants.js"
import ApiSubscriptionPlansRoutes from "../api/routes/route.api.subscriptionPlans.js"
import ApiSubscriptionsRoutes from "../api/routes/route.api.subscriptions.js"
import ApiWebhooksRoutes from "../api/routes/route.api.webhooks.js"
import ApiPaymentsRoutes from "../api/routes/route.api.payments.js"
import ApiMonitoringRoutes from "../api/routes/route.api.monitoring.js"
import publicRoutes from '../api/routes/route.api.public.js' 
import { connectDB } from "../db.js"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

dotenv.config()

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Middleware
app.use(express.urlencoded({ extended: true }))
app.use("/", express.static("public"))
app.use("/uploads", express.static(path.join(__dirname, "uploads")))
app.use("/pdfs", express.static(path.join(__dirname, "..", "public", "pdfs")))
app.use(express.json())
// Configuración CORS para permitir requests desde el frontend
const corsOptions = {
  origin: [
    'http://localhost:4321',
    'https://localhost:4321', 
    'http://127.0.0.1:4321',
    'https://127.0.0.1:4321',
    'http://localhost:5173',
    'https://localhost:5173',
    'http://127.0.0.1:5173',
    'https://127.0.0.1:5173',
    'https://leonix.netlify.app',
    'https://panelmantenimiento.netlify.app',
    'https://leonix.net.ar',
    'https://www.leonix.net.ar',
    'https://cmms.leonix.net.ar',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-tenant-id']
}

app.use(cors(corsOptions))

// Health check endpoint para Render
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  })
})

// Rutas API
app.use("/api", ApiAssetsRoutes)
app.use("/api", ApiClientsRoutes)
app.use("/api", ApiInstallationsRoutes)
app.use("/api", ApiAuthRoutes)
app.use("/api", ApiFormTemplatesRoutes)
app.use("/api", ApiCategoriesRoute)
app.use("/api", ApiTypeInstallationRoute)
app.use("/api", ApiManualsRoutes)
app.use("/api", ApiWorkOrdersRoutes)
app.use("/api", ApiTenantsRoutes)
app.use("/api/subscription-plans", ApiSubscriptionPlansRoutes)
app.use("/api/subscriptions", ApiSubscriptionsRoutes)
app.use("/api/webhooks", ApiWebhooksRoutes)
app.use("/api/payments", ApiPaymentsRoutes)
app.use("/api/monitoring", ApiMonitoringRoutes)
app.use("/api/public", publicRoutes)


const PORT = process.env.PORT || 3000

// Iniciar servidor solo después de conectar a la DB
const startServer = async () => {
  try {
    console.log("🚀 Iniciando aplicación...")

    // Conectar a la base de datos
    const dbConnected = await connectDB()

    if (dbConnected) {
      // Iniciar servidor
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Servidor escuchando en el puerto ${PORT}`)
        console.log(`🌐 Entorno: ${process.env.NODE_ENV || "development"}`)
        console.log(`🔗 Health check: http://localhost:${PORT}/health`)
      })

      // Inicializar cron jobs para monitoreo de suscripciones
      await initializeSubscriptionMonitoring()
    } else {
      console.error("❌ No se pudo conectar a la base de datos")
      if (process.env.NODE_ENV === "production") {
        // En producción, intentar iniciar el servidor de todas formas
        app.listen(PORT, "0.0.0.0", () => {
          console.log(`⚠️ Servidor iniciado sin DB en puerto ${PORT}`)
        })
      } else {
        process.exit(1)
      }
    }
  } catch (error) {
    console.error("❌ Error al iniciar servidor:", error)
    process.exit(1)
  }
}

// Inicializar sistema de monitoreo automático de suscripciones
async function initializeSubscriptionMonitoring() {
  try {
    console.log('🔄 Inicializando sistema de monitoreo de suscripciones...')
    
    const subscriptionMonitoringService = await import('../services/subscriptionMonitoring.services.js')
    const monitoring = subscriptionMonitoringService.default

    // Cron job cada hora para verificar suscripciones activas
    // Ejecuta a los minutos 15 de cada hora (ej: 1:15, 2:15, 3:15...)
    cron.schedule('15 * * * *', async () => {
      try {
        console.log('⏰ [CRON] Ejecutando verificación automática de suscripciones activas...')
        const result = await monitoring.checkActiveSubscriptions()
        console.log(`✅ [CRON] Verificación completada: ${result.processed} suscripciones procesadas`)
      } catch (error) {
        console.error('❌ [CRON] Error en verificación de suscripciones activas:', error)
      }
    }, {
      timezone: "America/Argentina/Buenos_Aires"
    })

    // Cron job cada 6 horas para verificar suscripciones expiradas
    // Ejecuta a las 00:30, 06:30, 12:30, 18:30
    cron.schedule('30 */6 * * *', async () => {
      try {
        console.log('⏰ [CRON] Ejecutando verificación de suscripciones expiradas...')
        const result = await monitoring.checkExpiredSubscriptions()
        console.log(`✅ [CRON] Verificación de expiradas completada: ${result.processed} tenants procesados`)
      } catch (error) {
        console.error('❌ [CRON] Error en verificación de suscripciones expiradas:', error)
      }
    }, {
      timezone: "America/Argentina/Buenos_Aires"
    })

    // Cron job diario para limpieza y estadísticas (opcional)
    // Ejecuta todos los días a las 3:00 AM
    cron.schedule('0 3 * * *', async () => {
      try {
        console.log('⏰ [CRON] Ejecutando mantenimiento diario del sistema...')
        
        // Aquí puedes agregar tareas de limpieza, estadísticas, etc.
        console.log('🧹 Mantenimiento diario completado')
      } catch (error) {
        console.error('❌ [CRON] Error en mantenimiento diario:', error)
      }
    }, {
      timezone: "America/Argentina/Buenos_Aires"
    })

    console.log('✅ Sistema de monitoreo automático inicializado:')
    console.log('   📅 Verificación de suscripciones activas: cada hora (minuto 15)')
    console.log('   📅 Verificación de suscripciones expiradas: cada 6 horas (minuto 30)')
    console.log('   📅 Mantenimiento diario: 3:00 AM')

  } catch (error) {
    console.error('❌ Error inicializando monitoreo de suscripciones:', error)
  }
}

startServer()
