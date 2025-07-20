import { Router } from "express"

import * as controllers from "../controllers/controller.api.auth.js"

import {
  validateAccountRegistro,
  validateAccountLogin,
  validateToken,
} from "../../middleware/auth.validate.middleware.js"

import { isAdmin } from "../../middleware/auth.role.middleware.js"

const route = Router()

// Solo los ADMIN pueden crear cuentas
route.post("/cuenta", [validateToken, isAdmin, validateAccountRegistro], controllers.createAccount)

route.post("/cuenta/login", [validateAccountLogin], controllers.login)

route.delete("/cuenta", controllers.logout)

route.get("/cuentas", [validateToken, isAdmin], controllers.getAllAccounts)

// ✅ RUTA ESPECÍFICA ANTES que la ruta con parámetros
route.get("/cuentas/tecnicos", [validateToken], controllers.getTechnicians)

// Eliminar usuario (solo admin)
route.delete("/cuentas/:id", [validateToken, isAdmin], controllers.deleteAccount)

// Esta ruta debe ir DESPUÉS de las rutas específicas
route.get("/cuentas/:id", [validateToken, isAdmin], controllers.getAccountById)

export default route
