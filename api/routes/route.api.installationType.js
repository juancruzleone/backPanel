import { Router } from "express"
import * as controllers from "../controllers/controller.api.installationTypes.js"
import { validateInstallationType, validateInstallationTypePatch } from "../../middleware/installationType.validate.middleware.js"
import { isAdmin, isAdminOrTechnician } from "../../middleware/auth.role.middleware.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { identifyTenantByHeader } from "../../middleware/tenant.middleware.js"

const route = Router()

route.get("/tipos-instalacion", [validateToken, identifyTenantByHeader, isAdminOrTechnician], controllers.getInstallationTypes)
route.get("/tipos-instalacion/:id", [validateToken, identifyTenantByHeader, isAdminOrTechnician], controllers.getInstallationTypeById)
route.post("/tipos-instalacion", [validateToken, identifyTenantByHeader, validateInstallationType, isAdmin], controllers.addInstallationType)
route.put("/tipos-instalacion/:id", [validateToken, identifyTenantByHeader, validateInstallationType, isAdmin], controllers.updateInstallationType)
route.patch("/tipos-instalacion/:id", [validateToken, identifyTenantByHeader, validateInstallationTypePatch, isAdmin], controllers.updateInstallationType)
route.delete("/tipos-instalacion/:id", [validateToken, identifyTenantByHeader, isAdmin], controllers.deleteInstallationType)

export default route