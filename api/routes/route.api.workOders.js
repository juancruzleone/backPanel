import { Router } from "express"
import * as controllers from "../controllers/controller.api.workOrders.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { isAdmin, isTechnician, isAdminOrTechnician, isAdminOrTechnicianOrClient } from "../../middleware/auth.role.middleware.js"
import {
  validateWorkOrder,
  validateWorkOrderAssignment,
  validateWorkOrderCompletion,
  validateWorkOrderStatusUpdate,
} from "../../middleware/workOrders.validate.middleware.js"
import { identifyTenantByHeader } from "../../middleware/tenant.middleware.js"

const route = Router()

// Rutas para administradores
route.get("/ordenes-trabajo", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getAllWorkOrders)
route.post("/ordenes-trabajo", [validateToken, identifyTenantByHeader, isAdmin, validateWorkOrder], controllers.createWorkOrder)
route.put("/ordenes-trabajo/:id", [validateToken, identifyTenantByHeader, isAdmin, validateWorkOrder], controllers.updateWorkOrder)
route.delete("/ordenes-trabajo/:id", [validateToken, identifyTenantByHeader, isAdmin], controllers.deleteWorkOrder)

// Asignar orden de trabajo a técnico
route.patch(
  "/ordenes-trabajo/:id/asignar",
  [validateToken, identifyTenantByHeader, isAdmin, validateWorkOrderAssignment],
  controllers.assignWorkOrder,
)

// Actualizar estado de orden de trabajo (solo admin)
route.patch(
  "/ordenes-trabajo/:id/estado",
  [validateToken, identifyTenantByHeader, isAdmin, validateWorkOrderStatusUpdate],
  controllers.updateWorkOrderStatus,
)

// Rutas para técnicos
route.get("/mis-ordenes-trabajo", [validateToken, identifyTenantByHeader, isTechnician], controllers.getTechnicianWorkOrders)
route.get("/ordenes-trabajo/:id", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getWorkOrderById)

// NUEVA RUTA: Obtener formulario para completar orden de trabajo
route.get("/ordenes-trabajo/:id/formulario", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getWorkOrderForm)

// Completar orden de trabajo (técnicos y admin)
route.post(
  "/ordenes-trabajo/:id/completar",
  [validateToken, identifyTenantByHeader, isAdminOrTechnician, validateWorkOrderCompletion],
  controllers.completeWorkOrder,
)

// Iniciar orden de trabajo (cambiar estado a "en progreso")
route.patch("/ordenes-trabajo/:id/iniciar", [validateToken, identifyTenantByHeader, isAdminOrTechnician], controllers.startWorkOrder)

// Obtener historial de órdenes completadas
route.get("/ordenes-trabajo/:id/historial", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getWorkOrderHistory)

export default route
