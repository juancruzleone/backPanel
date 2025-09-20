import { Router } from "express"
import * as controllers from "../controllers/controller.api.manuals.js"
import { validateManual, validateManualPatch, validateFileUpload } from "../../middleware/manual.validate.middleware.js"
import { isAdmin, isAdminOrTechnician } from "../../middleware/auth.role.middleware.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { upload, uploadPDFToHetzner, handleUploadError } from "../../middleware/hetzner.upload.middleware.js"
import { identifyTenantByHeader } from "../../middleware/tenant.middleware.js"

const route = Router()

// Rutas para manuales
route.get("/manuales", [validateToken, identifyTenantByHeader, isAdminOrTechnician], controllers.getManuals)
route.get("/manuales/:id", [validateToken, identifyTenantByHeader, isAdminOrTechnician], controllers.getManualById)
route.get("/activos/:assetId/manuales", [validateToken, identifyTenantByHeader, isAdminOrTechnician], controllers.getManualsByAssetId)

// Crear manual (requiere archivo PDF)
route.post(
  "/manuales",
  [validateToken, identifyTenantByHeader, isAdmin],
  upload.single("archivo"),
  handleUploadError,
  uploadPDFToHetzner,
  validateFileUpload,
  validateManual,
  controllers.addManual,
)

// Actualizar manual completo (archivo PDF opcional)
route.put(
  "/manuales/:id",
  [validateToken, identifyTenantByHeader, isAdmin],
  upload.single("archivo"),
  handleUploadError,
  uploadPDFToHetzner,
  validateManual,
  controllers.putManual,
)

// Actualizar manual parcial (sin archivo)
route.patch("/manuales/:id", [validateToken, identifyTenantByHeader, isAdmin], validateManualPatch, controllers.patchManual)

// Actualizar solo el archivo PDF de un manual
route.patch(
  "/manuales/:id/archivo",
  [validateToken, identifyTenantByHeader, isAdmin],
  upload.single("archivo"),
  handleUploadError,
  uploadPDFToHetzner,
  validateFileUpload,
  controllers.updateManualFile,
)

// Eliminar manual
route.delete("/manuales/:id", [validateToken, identifyTenantByHeader, isAdmin], controllers.deleteManual)

export default route
