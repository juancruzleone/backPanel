import { Router } from "express"
import * as controllers from "../controllers/controller.api.formTemplates.js"
import { validateFormTemplate, validateFormCategory } from "../../middleware/formTemplate.validate.middleware.js"
import { isAdmin, isAdminOrTechnician, isAdminOrTechnicianOrClient } from "../../middleware/auth.role.middleware.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { identifyTenantByHeader, identifyTenantByToken } from "../../middleware/tenant.middleware.js"

const route = Router()

// Rutas para plantillas de formularios
route.get("/plantillas", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getAllFormTemplates)
route.get("/plantillas/:id", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getFormTemplateById)
route.get("/plantillas/categoria/:categoria", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getFormTemplatesByCategory)
route.post("/plantillas", [validateToken, identifyTenantByHeader, validateFormTemplate, isAdmin], controllers.createFormTemplate)
route.put("/plantillas/:id", [validateToken, identifyTenantByHeader, validateFormTemplate, isAdmin], controllers.updateFormTemplate)
route.delete("/plantillas/:id", [validateToken, identifyTenantByHeader, isAdmin], controllers.deleteFormTemplate)

// Rutas para categorías de formularios
route.get("/categorias-formularios", [validateToken, identifyTenantByToken, isAdminOrTechnicianOrClient], controllers.getAllFormCategories)
route.get("/categorias-formularios/:id", [validateToken, identifyTenantByToken, isAdminOrTechnicianOrClient], controllers.getFormCategoryById)
route.post("/categorias-formularios", [validateToken, identifyTenantByToken, validateFormCategory, isAdmin], controllers.createFormCategory)
route.put("/categorias-formularios/:id", [validateToken, identifyTenantByToken, validateFormCategory, isAdmin], controllers.updateFormCategory)
route.delete("/categorias-formularios/:id", [validateToken, identifyTenantByToken, isAdmin], controllers.deleteFormCategory)

export default route
