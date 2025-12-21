import { Router } from "express"
import * as controllers from "../controllers/controller.api.clientViews.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { isClient } from "../../middleware/auth.role.middleware.js"

const route = Router()

// Rutas para clientes - ver sus instalaciones y mantenimientos
route.get("/mis-instalaciones", [validateToken, isClient], controllers.getMyInstallations)
route.get("/mis-instalaciones/:id", [validateToken, isClient], controllers.getInstallationDetail)
route.get("/mis-dispositivos", [validateToken, isClient], controllers.getMyDevices)
route.get("/mis-dispositivos/:id", [validateToken, isClient], controllers.getDeviceDetail)
route.get("/mis-dispositivos/:id/mantenimientos", [validateToken, isClient], controllers.getDeviceMaintenanceHistory)
route.get("/mis-mantenimientos", [validateToken, isClient], controllers.getAllMyMaintenances)

export default route
