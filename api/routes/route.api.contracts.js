/**
 * Rutas API para contratos/presupuestos de instalaciones
 */
import { Router } from "express"
import * as controllers from "../controllers/controller.api.contracts.js"
import { validateContract, validateContractPatch, validateContractFileUpload } from "../../schemas/contract.schema.js"
import { isAdmin, isAdminOrTechnician, isAdminOrTechnicianOrClient } from "../../middleware/auth.role.middleware.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { upload, uploadPDFToHetzner, handleUploadError } from "../../middleware/hetzner.upload.middleware.js"
import { identifyTenantByHeader } from "../../middleware/tenant.middleware.js"

const route = Router()

// ===== RUTAS DE CONTRATOS =====

// Obtener todos los contratos (con filtros opcionales via query params)
route.get(
    "/contracts",
    [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient],
    controllers.getContracts
)

// Obtener contrato por ID
route.get(
    "/contracts/:id",
    [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient],
    controllers.getContractById
)

// Obtener contratos por ID de instalación
route.get(
    "/installations/:installationId/contracts",
    [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient],
    controllers.getContractsByInstallationId
)

// Obtener contratos vigentes de una instalación
route.get(
    "/installations/:installationId/contracts/active",
    [validateToken, identifyTenantByHeader, isAdminOrTechnicianOrClient],
    controllers.getActiveContractsByInstallation
)

// Crear nuevo contrato (requiere archivo PDF)
route.post(
    "/contracts",
    [validateToken, identifyTenantByHeader, isAdmin],
    upload.single("archivo"),
    handleUploadError,
    uploadPDFToHetzner,
    validateContractFileUpload,
    validateContract,
    controllers.addContract
)

// Actualizar contrato completo (archivo PDF opcional)
route.put(
    "/contracts/:id",
    [validateToken, identifyTenantByHeader, isAdmin],
    upload.single("archivo"),
    handleUploadError,
    uploadPDFToHetzner,
    validateContract,
    controllers.putContract
)

// Actualizar contrato parcialmente (sin archivo)
route.patch(
    "/contracts/:id",
    [validateToken, identifyTenantByHeader, isAdmin],
    validateContractPatch,
    controllers.patchContract
)

// Actualizar solo el archivo PDF de un contrato
route.patch(
    "/contracts/:id/archivo",
    [validateToken, identifyTenantByHeader, isAdmin],
    upload.single("archivo"),
    handleUploadError,
    uploadPDFToHetzner,
    validateContractFileUpload,
    controllers.updateContractFile
)

// Eliminar contrato
route.delete(
    "/contracts/:id",
    [validateToken, identifyTenantByHeader, isAdmin],
    controllers.deleteContract
)

export default route
