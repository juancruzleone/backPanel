import { Router } from "express"
import * as controllers from "../controllers/controller.api.installations.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import {
  validateInstallations,
  validateDevice,
  validateTemplateAssignment,
  validateMaintenanceSubmission,
  validateAssetAssignment,
} from "../../middleware/installations.validate.middleware.js"
import { isAdmin, isAdminOrTechnician } from "../../middleware/auth.role.middleware.js"

const route = Router()

// Rutas principales de instalaciones
route.get("/installations", [validateToken, isAdminOrTechnician], controllers.getInstallations)
route.get("/installations/:id", [validateToken, isAdminOrTechnician], controllers.getInstallationById) // NUEVA RUTA AGREGADA
route.post("/installations", [validateToken, isAdmin, validateInstallations], controllers.createInstallation)
route.put("/installations/:id", [validateToken, isAdmin, validateInstallations], controllers.updateInstallation)
route.delete("/installations/:id", [validateToken, isAdmin], controllers.deleteInstallation)

// Rutas de dispositivos en instalaciones
route.get("/installations/:id/dispositivos", [validateToken, isAdminOrTechnician], controllers.getDevicesFromInstallation)
route.post(
  "/installations/:id/dispositivos",
  [validateToken, isAdmin, validateDevice],
  controllers.addDeviceToInstallation,
)
route.put(
  "/installations/:id/dispositivos/:deviceId",
  [validateToken, isAdmin, validateDevice],
  controllers.updateDeviceInInstallation,
)
route.delete(
  "/installations/:id/dispositivos/:deviceId",
  [validateToken, isAdmin],
  controllers.deleteDeviceFromInstallation,
)

// Ruta para asignar activos existentes a instalaciones
route.post(
  "/installations/:id/activos",
  [validateToken, isAdmin, validateAssetAssignment],
  controllers.assignAssetToInstallation,
)

// Ruta específica para asignar plantilla a un dispositivo
route.patch(
  "/installations/:id/dispositivos/:deviceId/plantilla",
  [validateToken, isAdmin, validateTemplateAssignment],
  controllers.assignTemplateToDevice,
)

// Rutas de mantenimiento
route.post(
  "/installations/:installationId/dispositivos/:deviceId/mantenimiento",
  [validateToken, isAdmin, validateMaintenanceSubmission],
  controllers.handleMaintenanceSubmission,
)
route.get(
  "/installations/:installationId/dispositivos/:deviceId/ultimo-mantenimiento",
  [validateToken, isAdmin],
  controllers.getLastMaintenanceForDevice,
)
route.get(
  "/installations/:installationId/dispositivos/:deviceId/formulario",
  [validateToken, isAdminOrTechnician],
  controllers.getDeviceForm,
)

export default route
