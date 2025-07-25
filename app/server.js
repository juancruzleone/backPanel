import express from "express"
import ApiAssetsRoutes from "../api/routes/route.api.assets.js"
import ApiClientsRoutes from "../api/routes/route.api.clients.js"
import ApiInstallationsRoutes from "../api/routes/route.api.installations.js"
import ApiAuthRoutes from "../api/routes/route.api.auth.js"
import ApiFormTemplatesRoutes from "../api/routes/route.api.formTemplates.js"
import ApiCategoriesRoute from "../api/routes/route.api.categories.js"
import ApiTypeInstallationRoute from "../api/routes/route.api.installationType.js"
import ApiManualsRoutes from "../api/routes/route.api.manuals.js"
import ApiWorkOrdersRoutes from "../api/routes/route.api.workOders.js"
import { connectDB } from "../db.js"
import cors from "cors"
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
app.use(cors())

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

const PORT = process.env.PORT || 2023

// Iniciar servidor solo después de conectar a la DB
const startServer = async () => {
  try {
    console.log("🚀 Iniciando aplicación...")

    // Conectar a la base de datos
    const dbConnected = await connectDB()

    if (dbConnected) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Servidor escuchando en el puerto ${PORT}`)
        console.log(`🌐 Entorno: ${process.env.NODE_ENV || "development"}`)
        console.log(`🔗 Health check: http://localhost:${PORT}/health`)
      })
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

startServer()
