import { Router } from "express"
import * as controllers from "../controllers/controller.api.public.js"

const route = Router()

// ✅ Endpoint de registro público (sin autenticación)
route.post("/register", controllers.registerPublic)

// ✅ Planes públicos
route.get("/subscription-plans", controllers.getPublicPlans)

// ✅ Checkout público (sin autenticación)
route.post("/subscription-plans/:planId/checkout", controllers.createPublicCheckout)

export default route