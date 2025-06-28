import { Router } from "express"
import * as controllers from "../controllers/controller.api.categories.js"
import { validateCategory, validateCategoryPatch } from "../../middleware/category.validate.middleware.js"
import { isAdmin } from "../../middleware/auth.role.middleware.js"

const route = Router()

// Rutas públicas (para obtener categorías activas)
route.get("/categorias", controllers.getCategories)
route.get("/categorias/:id", controllers.getCategoryById)

// Rutas administrativas
route.post("/categorias", [validateCategory, isAdmin], controllers.addCategory)
route.put("/categorias/:id", [validateCategory, isAdmin], controllers.updateCategory)
route.patch("/categorias/:id", [validateCategoryPatch, isAdmin], controllers.updateCategory)

// Rutas para activar/desactivar
route.patch("/categorias/:id/desactivar", isAdmin, controllers.deactivateCategory)
route.patch("/categorias/:id/activar", isAdmin, controllers.activateCategory)

// Eliminación física (usar con mucho cuidado)
route.delete("/categorias/:id", isAdmin, controllers.deleteCategory)

export default route
