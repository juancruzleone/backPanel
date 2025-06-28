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
import cors from "cors"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

dotenv.config()

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.urlencoded({ extended: true }))
app.use("/", express.static("public"))
app.use("/uploads", express.static(path.join(__dirname, "uploads")))
app.use("/pdfs", express.static(path.join(__dirname, "..", "public", "pdfs")))
app.use(express.json())
app.use(cors())

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

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`)
})
