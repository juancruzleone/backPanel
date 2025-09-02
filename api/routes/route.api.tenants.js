import { Router } from "express"
import * as controllers from "../controllers/controller.api.tenants.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { isSuperAdmin } from "../../middleware/auth.role.middleware.js"
import { validateTenantCreateData, validateTenantUpdateData } from "../../middleware/tenant.validate.middleware.js"

const route = Router()

// Rutas protegidas (solo super admin)
route.post("/tenants", [validateToken, isSuperAdmin, validateTenantCreateData], controllers.createTenant)
route.get("/tenants", [validateToken, isSuperAdmin], controllers.getAllTenants)
route.get("/tenants/stats/global", [validateToken, isSuperAdmin], controllers.getGlobalStats)
route.get("/tenants/:id", [validateToken, isSuperAdmin], controllers.getTenantById)
route.put("/tenants/:id", [validateToken, isSuperAdmin, validateTenantUpdateData], controllers.updateTenant)
route.delete("/tenants/:id", [validateToken, isSuperAdmin], controllers.deleteTenant)
route.get("/tenants/:id/stats", [validateToken, isSuperAdmin], controllers.getTenantStats)

// Ruta temporal para forzar actualización de estadísticas
route.post("/tenants/:id/force-update-stats", [validateToken, isSuperAdmin], controllers.forceUpdateTenantStats)

// Ruta pública para verificar tenant por subdominio
route.get("/tenant/check/:subdomain", controllers.getTenantBySubdomain)

export default route 