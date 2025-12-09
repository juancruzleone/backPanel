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
// import ApiMonitoringRoutes from "../api/routes/route.api.monitoring.js" // Comentado temporalmente
import ApiSubscriptionRoutes from "../api/routes/route.api.subscription.js"
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
    'http://localhost:5174',
    'https://localhost:5174',
    'http://127.0.0.1:5174',
    'https://127.0.0.1:5174',
    'https://leonix.netlify.app',
    'https://panelmantenimiento.netlify.app',
    'https://leonix.net.ar',
    'https://www.leonix.net.ar',
    'https://cmms.leonix.net.ar',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-ID'],
  exposedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
}

app.use(cors(corsOptions))

// Manejar preflight requests (OPTIONS) para todas las rutas
app.options('*', cors(corsOptions))

// Middleware de debugging para ver headers
app.use((req, res, next) => {
  if (req.path.includes('/dispositivos')) {
    console.log('🔍 [DEBUG] Request a dispositivos:', {
      method: req.method,
      path: req.path,
      headers: {
        authorization: req.headers.authorization ? 'Presente ✅' : 'Ausente ❌',
        'x-tenant-id': req.headers['x-tenant-id'] || 'Ausente',
        'content-type': req.headers['content-type'],
        origin: req.headers.origin
      }
    });
  }
  next();
})

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
// app.use("/api/monitoring", ApiMonitoringRoutes) // Comentado temporalmente
app.use("/api/subscription", ApiSubscriptionRoutes)
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
      // await initializeSubscriptionMonitoring() // Comentado temporalmente
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
// Comentado temporalmente hasta que se suban los archivos de monitoreo

startServer()
