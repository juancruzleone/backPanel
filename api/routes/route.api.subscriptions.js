// api/routes/route.api.subscriptions.js
import { Router } from "express"
import * as controllers from "../controllers/controller.api.subscriptions.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { identifyTenantByToken } from "../../middleware/tenant.middleware.js"
import { redirectToLogin } from "../../middleware/auth.redirect.middleware.js"

const route = Router()

/**
 * @route POST /api/subscriptions/checkout
 * @description Crea un nuevo checkout de pago para la suscripción
 * @access Privado (requiere autenticación)
 * @body {string} planId - ID del plan seleccionado
 * @body {string} successUrl - URL a la que redirigir después de un pago exitoso
 * @body {string} [failureUrl] - URL a la que redirigir después de un pago fallido
 * @body {string} [pendingUrl] - URL a la que redirigir cuando el pago está pendiente
 */
route.post("/checkout", [
  validateToken,        // Verifica el token JWT
  redirectToLogin,      // Redirige al login si no está autenticado
  identifyTenantByToken // Identifica el tenant del usuario
], controllers.createCheckout)

// ✅ Webhook de MercadoPago (público)
route.post("/webhook", controllers.mercadoPagoWebhook)

// ✅ Obtener estado de suscripción (requiere autenticación)
route.get("/status", [
  validateToken,
  identifyTenantByToken
], controllers.getSubscriptionStatus)

// ✅ Activar suscripción manualmente (para testing)
route.post("/activate/:subscriptionId", controllers.activateSubscriptionManually)

export default route