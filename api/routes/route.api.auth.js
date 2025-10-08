import { Router } from "express"

import * as controllers from "../controllers/controller.api.auth.js"

import {
  validateAccountRegistro,
  validateAccountLogin,
  validateToken,
} from "../../middleware/auth.validate.middleware.js"

import { isAdmin, isSuperAdmin } from "../../middleware/auth.role.middleware.js"
import { 
  identifyTenantByToken, 
  identifyTenantByHeader,
  verifyUserTenant, 
  injectTenantId 
} from "../../middleware/tenant.middleware.js"

const route = Router()

// Rutas que requieren identificación de tenant
route.post("/cuenta", [
  validateToken,
  isAdmin, 
  identifyTenantByHeader,
  validateAccountRegistro
], controllers.createAccount)

route.post("/cuenta/login", [validateAccountLogin], controllers.login)

// NUEVA RUTA: Login público para landing (sin validación de planes)
route.post("/cuenta/public-login", [validateAccountLogin], controllers.publicLogin)

route.delete("/cuenta", controllers.logout)

route.get("/cuentas", [
  validateToken,
  isAdmin
], controllers.getAllAccounts)

// ✅ RUTA ESPECÍFICA ANTES que la ruta con parámetros
route.get("/cuentas/tecnicos", [
  validateToken,
  identifyTenantByHeader
], controllers.getTechnicians)

// Eliminar usuario (solo admin)
route.delete("/cuentas/:id", [
  validateToken,
  isAdmin
], controllers.deleteAccount)

// Verificar autenticación (endpoint público para validar tokens)
route.get("/verify", [
  validateToken
], controllers.verifyAuth)

// Obtener perfil completo del usuario
route.get("/profile", [
  validateToken
], controllers.getProfile)

// NUEVA RUTA: Crear cuenta DEMO completa (SOLO SUPER ADMIN)
// Crea cuenta + tenant + suscripción fake en una sola operación
route.post("/cuenta/demo", [
  validateToken,
  isSuperAdmin
], controllers.createDemoAccount)

// Esta ruta debe ir DESPUÉS de las rutas específicas
route.get("/cuentas/:id", [
  validateToken,
  isAdmin
], controllers.getAccountById)

export default route
