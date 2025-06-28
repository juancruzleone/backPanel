import { Router } from "express"
import * as controllers from "../controllers/controller.api.workOrders.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { isAdmin, isTechnician, isAdminOrTechnician } from "../../middleware/auth.role.middleware.js"
import {
  validateWorkOrder,
  validateWorkOrderAssignment,
  validateWorkOrderCompletion,
  validateWorkOrderStatusUpdate,
} from "../../middleware/workOrders.validate.middleware.js"

const route = Router()

// Rutas para administradores
route.get("/ordenes-trabajo", [validateToken, isAdmin], controllers.getAllWorkOrders)
route.post("/ordenes-trabajo", [validateToken, isAdmin, validateWorkOrder], controllers.createWorkOrder)
route.put("/ordenes-trabajo/:id", [validateToken, isAdmin, validateWorkOrder], controllers.updateWorkOrder)
route.delete("/ordenes-trabajo/:id", [validateToken, isAdmin], controllers.deleteWorkOrder)

// Asignar orden de trabajo a técnico
route.patch(
  "/ordenes-trabajo/:id/asignar",
  [validateToken, isAdmin, validateWorkOrderAssignment],
  controllers.assignWorkOrder,
)

// Actualizar estado de orden de trabajo (solo admin)
route.patch(
  "/ordenes-trabajo/:id/estado",
  [validateToken, isAdmin, validateWorkOrderStatusUpdate],
  controllers.updateWorkOrderStatus,
)

// Rutas para técnicos
route.get("/mis-ordenes-trabajo", [validateToken, isTechnician], controllers.getTechnicianWorkOrders)
route.get("/ordenes-trabajo/:id", [validateToken, isAdminOrTechnician], controllers.getWorkOrderById)

// NUEVA RUTA: Obtener formulario para completar orden de trabajo
route.get("/ordenes-trabajo/:id/formulario", [validateToken, isAdminOrTechnician], controllers.getWorkOrderForm)

// Completar orden de trabajo (técnicos y admin)
route.post(
  "/ordenes-trabajo/:id/completar",
  [validateToken, isAdminOrTechnician, validateWorkOrderCompletion],
  controllers.completeWorkOrder,
)

// Iniciar orden de trabajo (cambiar estado a "en progreso")
route.patch("/ordenes-trabajo/:id/iniciar", [validateToken, isAdminOrTechnician], controllers.startWorkOrder)

// Obtener historial de órdenes completadas
route.get("/ordenes-trabajo/:id/historial", [validateToken, isAdminOrTechnician], controllers.getWorkOrderHistory)

export default route
