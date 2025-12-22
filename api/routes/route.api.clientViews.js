import { Router } from "express"
import * as controllers from "../controllers/controller.api.clientViews.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { isClient } from "../../middleware/auth.role.middleware.js"
import { identifyTenantByHeader } from "../../middleware/tenant.middleware.js"

const route = Router()

// Rutas para clientes - ver sus instalaciones y mantenimientos
route.get("/mis-instalaciones", [validateToken, identifyTenantByHeader, isClient], controllers.getMyInstallations)
route.get("/mis-instalaciones/:id", [validateToken, identifyTenantByHeader, isClient], controllers.getInstallationDetail)
route.get("/mis-dispositivos", [validateToken, identifyTenantByHeader, isClient], controllers.getMyDevices)
route.get("/mis-dispositivos/:id", [validateToken, identifyTenantByHeader, isClient], controllers.getDeviceDetail)
route.get("/mis-dispositivos/:id/mantenimientos", [validateToken, identifyTenantByHeader, isClient], controllers.getDeviceMaintenanceHistory)
route.get("/mis-mantenimientos", [validateToken, identifyTenantByHeader, isClient], controllers.getAllMyMaintenances)

// Rutas para órdenes de trabajo
route.get("/mis-ordenes-trabajo", [validateToken, identifyTenantByHeader, isClient], controllers.getMyWorkOrders)
route.get("/mis-ordenes-trabajo/:id", [validateToken, identifyTenantByHeader, isClient], controllers.getWorkOrderDetail)

// Rutas para manuales
route.get("/mis-manuales", [validateToken, identifyTenantByHeader, isClient], controllers.getMyManuals)
route.get("/mis-manuales/:id", [validateToken, identifyTenantByHeader, isClient], controllers.getManualDetail)
route.get("/mis-activos/:assetId/manuales", [validateToken, identifyTenantByHeader, isClient], controllers.getManualsByAsset)

export default route
