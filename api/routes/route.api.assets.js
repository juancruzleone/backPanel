import { Router } from "express"
import * as controllers from "../controllers/controller.api.assets.js"
import { validateAsset, validateAssetPatch } from "../../middleware/asset.validate.middleware.js"
import { isAdmin } from "../../middleware/auth.role.middleware.js"

const route = Router()

// Rutas básicas para activos
route.get("/activos", controllers.getAssets)
route.get("/activos/:id", controllers.getAssetById)
route.post("/activos", [validateAsset, isAdmin], controllers.addAsset)
route.put("/activos/:id", [validateAsset, isAdmin], controllers.putAsset)
route.patch("/activos/:id", [validateAssetPatch, isAdmin], controllers.patchAsset)
route.delete("/activos/:id", isAdmin, controllers.deleteAsset)

// Rutas para gestión de plantillas en activos
route.post("/activos/:id/plantilla", isAdmin, controllers.assignTemplateToAsset)
route.delete("/activos/:id/plantilla", isAdmin, controllers.removeTemplateFromAsset)
route.get("/activos/:id/formulario", controllers.getAssetFormFields)

export default route
