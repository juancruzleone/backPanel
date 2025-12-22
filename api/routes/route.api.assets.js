import { Router } from "express"
import * as controllers from "../controllers/controller.api.assets.js"
import { validateAsset, validateAssetPatch } from "../../middleware/asset.validate.middleware.js"
import { isAdmin, isAdminOrTechnician, isAdminOrTechnicianOrClient } from "../../middleware/auth.role.middleware.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { identifyTenantByHeader } from "../../middleware/tenant.middleware.js"

const route = Router()

// Rutas básicas para activos
route.get("/activos", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getAssets)
route.get("/activos/:id", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getAssetById)
route.post("/activos", [validateToken, identifyTenantByHeader, validateAsset, isAdmin], controllers.addAsset)
route.put("/activos/:id", [validateToken, identifyTenantByHeader, validateAsset, isAdmin], controllers.putAsset)
route.patch("/activos/:id", [validateToken, identifyTenantByHeader, validateAssetPatch, isAdmin], controllers.patchAsset)
route.delete("/activos/:id", [validateToken, identifyTenantByHeader, isAdmin], controllers.deleteAsset)

// Rutas para gestión de plantillas en activos
route.post("/activos/:id/plantilla", [validateToken, identifyTenantByHeader, isAdmin], controllers.assignTemplateToAsset)
route.delete("/activos/:id/plantilla", [validateToken, identifyTenantByHeader, isAdmin], controllers.removeTemplateFromAsset)
route.get("/activos/:id/formulario", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getAssetFormFields)

export default route
