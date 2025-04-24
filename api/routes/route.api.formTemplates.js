import { Router } from "express"
import * as controllers from "../controllers/controller.api.formTemplates.js"
import { validateFormTemplate } from "../../middleware/formTemplate.validate.middleware.js"
import { isAdmin } from "../../middleware/auth.role.middleware.js"

const route = Router()

// Rutas para plantillas de formularios
route.get("/plantillas", controllers.getAllFormTemplates)
route.get("/plantillas/:id", controllers.getFormTemplateById)
route.get("/plantillas/categoria/:categoria", controllers.getFormTemplatesByCategory)
route.post("/plantillas", [validateFormTemplate, isAdmin], controllers.createFormTemplate)
route.put("/plantillas/:id", [validateFormTemplate, isAdmin], controllers.updateFormTemplate)
route.delete("/plantillas/:id", isAdmin, controllers.deleteFormTemplate)

export default route
