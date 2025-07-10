import { Router } from "express"
import * as controllers from "../controllers/controller.api.assets.js"
import { validateAsset, validateAssetPatch } from "../../middleware/asset.validate.middleware.js"
import { isAdmin, isAdminOrTechnician } from "../../middleware/auth.role.middleware.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"

const route = Router()

// Rutas básicas para activos
route.get("/activos", [validateToken, isAdminOrTechnician], controllers.getAssets)
route.get("/activos/:id", [validateToken, isAdminOrTechnician], controllers.getAssetById)
route.post("/activos", [validateAsset, isAdmin], controllers.addAsset)
route.put("/activos/:id", [validateAsset, isAdmin], controllers.putAsset)
route.patch("/activos/:id", [validateAssetPatch, isAdmin], controllers.patchAsset)
route.delete("/activos/:id", isAdmin, controllers.deleteAsset)

// Rutas para gestión de plantillas en activos
route.post("/activos/:id/plantilla", isAdmin, controllers.assignTemplateToAsset)
route.delete("/activos/:id/plantilla", isAdmin, controllers.removeTemplateFromAsset)
route.get("/activos/:id/formulario", [validateToken, isAdminOrTechnician], controllers.getAssetFormFields)

export default route
