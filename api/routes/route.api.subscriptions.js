// api/routes/route.api.subscriptions.js
import { Router } from "express"
import * as controllers from "../controllers/controller.api.subscriptions.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { identifyTenantByToken } from "../../middleware/tenant.middleware.js"

const route = Router()

// ✅ Crear checkout (requiere autenticación)
route.post("/checkout", [
  validateToken,
  identifyTenantByToken
], controllers.createCheckout)

// ✅ Webhook de MercadoPago (público)
route.post("/webhook", controllers.mercadoPagoWebhook)

// ✅ Obtener estado de suscripción (requiere autenticación)
route.get("/status", [
  validateToken,
  identifyTenantByToken
], controllers.getSubscriptionStatus)

export default route