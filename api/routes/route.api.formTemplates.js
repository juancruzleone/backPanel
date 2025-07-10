import { Router } from "express"
import * as controllers from "../controllers/controller.api.formTemplates.js"
import { validateFormTemplate, validateFormCategory } from "../../middleware/formTemplate.validate.middleware.js"
import { isAdmin, isAdminOrTechnician } from "../../middleware/auth.role.middleware.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"

const route = Router()

// Rutas para plantillas de formularios
route.get("/plantillas", [validateToken, isAdminOrTechnician], controllers.getAllFormTemplates)
route.get("/plantillas/:id", [validateToken, isAdminOrTechnician], controllers.getFormTemplateById)
route.get("/plantillas/categoria/:categoria", [validateToken, isAdminOrTechnician], controllers.getFormTemplatesByCategory)
route.post("/plantillas", [validateFormTemplate, isAdmin], controllers.createFormTemplate)
route.put("/plantillas/:id", [validateFormTemplate, isAdmin], controllers.updateFormTemplate)
route.delete("/plantillas/:id", isAdmin, controllers.deleteFormTemplate)

// Rutas para categorías de formularios
route.get("/categorias-formularios", [validateToken, isAdminOrTechnician], controllers.getAllFormCategories)
route.get("/categorias-formularios/:id", [validateToken, isAdminOrTechnician], controllers.getFormCategoryById)
route.post("/categorias-formularios", [validateFormCategory, isAdmin], controllers.createFormCategory)
route.put("/categorias-formularios/:id", [validateFormCategory, isAdmin], controllers.updateFormCategory)
route.delete("/categorias-formularios/:id", isAdmin, controllers.deleteFormCategory)

export default route
