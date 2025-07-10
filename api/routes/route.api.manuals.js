import { Router } from "express"
import * as controllers from "../controllers/controller.api.manuals.js"
import { validateManual, validateManualPatch, validateFileUpload } from "../../middleware/manual.validate.middleware.js"
import { isAdmin, isAdminOrTechnician } from "../../middleware/auth.role.middleware.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { upload, uploadPDFToCloudinary, handleUploadError } from "../../middleware/upload.middleware.js"

const route = Router()

// Rutas para manuales
route.get("/manuales", [validateToken, isAdminOrTechnician], controllers.getManuals)
route.get("/manuales/:id", [validateToken, isAdminOrTechnician], controllers.getManualById)
route.get("/activos/:assetId/manuales", [validateToken, isAdminOrTechnician], controllers.getManualsByAssetId)

// Crear manual (requiere archivo PDF)
route.post(
  "/manuales",
  isAdmin,
  upload.single("archivo"),
  handleUploadError,
  uploadPDFToCloudinary,
  validateFileUpload,
  validateManual,
  controllers.addManual,
)

// Actualizar manual completo (archivo PDF opcional)
route.put(
  "/manuales/:id",
  isAdmin,
  upload.single("archivo"),
  handleUploadError,
  uploadPDFToCloudinary,
  validateManual,
  controllers.putManual,
)

// Actualizar manual parcial (sin archivo)
route.patch("/manuales/:id", isAdmin, validateManualPatch, controllers.patchManual)

// Actualizar solo el archivo PDF de un manual
route.patch(
  "/manuales/:id/archivo",
  isAdmin,
  upload.single("archivo"),
  handleUploadError,
  uploadPDFToCloudinary,
  validateFileUpload,
  controllers.updateManualFile,
)

// Eliminar manual
route.delete("/manuales/:id", isAdmin, controllers.deleteManual)

export default route
