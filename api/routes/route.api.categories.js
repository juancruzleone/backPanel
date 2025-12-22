import { Router } from "express"
import * as controllers from "../controllers/controller.api.categories.js"
import { validateCategory, validateCategoryPatch } from "../../middleware/category.validate.middleware.js"
import { isAdmin, isAdminOrTechnician, isAdminOrTechnicianOrClient } from "../../middleware/auth.role.middleware.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { identifyTenantByHeader } from "../../middleware/tenant.middleware.js"

const route = Router()

// Rutas públicas (para obtener categorías activas)
route.get("/categorias", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getCategories)
route.get("/categorias/:id", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getCategoryById)

// Rutas administrativas
route.post("/categorias", [validateToken, identifyTenantByHeader, validateCategory, isAdmin], controllers.addCategory)
route.put("/categorias/:id", [validateToken, identifyTenantByHeader, validateCategory, isAdmin], controllers.updateCategory)
route.patch("/categorias/:id", [validateToken, identifyTenantByHeader, validateCategoryPatch, isAdmin], controllers.updateCategory)

// Rutas para activar/desactivar
route.patch("/categorias/:id/desactivar", [validateToken, identifyTenantByHeader, isAdmin], controllers.deactivateCategory)
route.patch("/categorias/:id/activar", [validateToken, identifyTenantByHeader, isAdmin], controllers.activateCategory)

// Eliminación física (usar con mucho cuidado)
route.delete("/categorias/:id", [validateToken, identifyTenantByHeader, isAdmin], controllers.deleteCategory)

export default route
