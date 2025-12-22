import { Router } from "express"
import * as controllers from "../controllers/controller.api.installations.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import {
  validateInstallations,
  validateSubscriptionUpdate, // Importar el nuevo middleware
  validateDevice,
  validateTemplateAssignment,
  validateMaintenanceSubmission,
  validateAssetAssignment,
} from "../../middleware/installations.validate.middleware.js"
import { isAdmin, isAdminOrTechnician, isAdminOrTechnicianOrClient } from "../../middleware/auth.role.middleware.js"
import { identifyTenantByHeader } from "../../middleware/tenant.middleware.js"

const route = Router()

// Rutas principales de instalaciones
route.get("/installations", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getInstallations)
route.get("/installations/:id", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getInstallationById)
route.post("/installations", [validateToken, identifyTenantByHeader, isAdmin, validateInstallations], controllers.createInstallation)
route.put("/installations/:id", [validateToken, identifyTenantByHeader, isAdmin, validateInstallations], controllers.updateInstallation)
route.delete("/installations/:id", [validateToken, identifyTenantByHeader, isAdmin], controllers.deleteInstallation)

// NUEVA RUTA: Actualizar solo información de suscripción
route.patch("/installations/:id/subscription",
  [validateToken, identifyTenantByHeader, isAdmin, validateSubscriptionUpdate],
  controllers.updateInstallationSubscription
)

// Rutas de dispositivos en instalaciones
route.get("/installations/:id/dispositivos", [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient], controllers.getDevicesFromInstallation)
route.post(
  "/installations/:id/dispositivos",
  [validateToken, identifyTenantByHeader, isAdmin, validateDevice],
  controllers.addDeviceToInstallation,
)
route.put(
  "/installations/:id/dispositivos/:deviceId",
  [validateToken, identifyTenantByHeader, isAdmin, validateDevice],
  controllers.updateDeviceInInstallation,
)
route.delete(
  "/installations/:id/dispositivos/:deviceId",
  [validateToken, identifyTenantByHeader, isAdmin],
  controllers.deleteDeviceFromInstallation,
)

// Ruta para asignar activos existentes a instalaciones
route.post(
  "/installations/:id/activos",
  [validateToken, identifyTenantByHeader, isAdmin, validateAssetAssignment],
  controllers.assignAssetToInstallation,
)

// Ruta específica para asignar plantilla a un dispositivo
route.patch(
  "/installations/:id/dispositivos/:deviceId/plantilla",
  [validateToken, identifyTenantByHeader, isAdmin, validateTemplateAssignment],
  controllers.assignTemplateToDevice,
)

// Rutas de mantenimiento
route.post(
  "/installations/:installationId/dispositivos/:deviceId/mantenimiento",
  [validateToken, identifyTenantByHeader, isAdmin, validateMaintenanceSubmission],
  controllers.handleMaintenanceSubmission,
)
route.get(
  "/installations/:installationId/dispositivos/:deviceId/ultimo-mantenimiento",
  [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient],
  controllers.getLastMaintenanceForDevice,
)
route.get(
  "/installations/:installationId/dispositivos/:deviceId/mantenimientos",
  [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient],
  controllers.getAllMaintenanceForDevice,
)
route.get(
  "/installations/:installationId/dispositivos/:deviceId/formulario",
  [validateToken, identifyTenantByHeader, isAdminOrTechnician],
  controllers.getDeviceForm,
)

export default route