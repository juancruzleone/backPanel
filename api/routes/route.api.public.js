import { Router } from "express"
import * as controllers from "../controllers/controller.api.public.js"

const route = Router()

// ✅ Endpoint de registro público (sin autenticación)
route.post("/register", controllers.registerPublic)
route.post("/verify", controllers.verifyEmail)
route.post("/resend-code", controllers.resendCode)

// ✅ Planes públicos
route.get("/subscription-plans", controllers.getPublicPlans)

// ✅ Checkout público (sin autenticación)
route.post("/subscription-plans/:planId/checkout", controllers.createPublicCheckout)
route.get("/subscription-plans/:planId/checkout", controllers.createPublicCheckout)

// ✅ Endpoints públicos para mantenimientos de dispositivos (QR)
route.get("/dispositivos/:installationId/:deviceId/mantenimientos", controllers.getPublicMaintenanceHistory)
route.get("/dispositivos/:installationId/:deviceId/ultimo-mantenimiento", controllers.getPublicLastMaintenance)
route.get("/dispositivos/:installationId/:deviceId/formulario", controllers.getPublicDeviceForm)

export default route