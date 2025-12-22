/**
 * Controlador API para contratos/presupuestos de instalaciones
 */
import * as service from "../../services/contracts.services.js"

/**
 * Obtener todos los contratos
 */
async function getContracts(req, res) {
    try {
        const tenantId = req.user.tenantId
        const filter = {
            installationId: req.query.installationId,
            tipoContrato: req.query.tipoContrato,
            estado: req.query.estado,
            nombre: req.query.nombre,
            vigente: req.query.vigente === 'true',
        }

        const contracts = await service.getContracts(filter, tenantId)
        res.status(200).json({
            success: true,
            data: contracts,
            count: contracts.length
        })
    } catch (error) {
        console.error("Error al obtener contratos:", error)
        res.status(500).json({
            success: false,
            error: "Error interno del servidor",
        })
    }
}

/**
 * Obtener contrato por ID
 */
async function getContractById(req, res) {
    try {
        const { id } = req.params
        const tenantId = req.user.tenantId

        const contract = await service.getContractById(id, tenantId)

        if (!contract) {
            return res.status(404).json({
                success: false,
                error: "Contrato no encontrado",
            })
        }

        res.status(200).json({
            success: true,
            data: contract,
        })
    } catch (error) {
        console.error("Error al obtener contrato por ID:", error)
        res.status(404).json({
            success: false,
            error: error.message || "Contrato no encontrado",
        })
    }
}

/**
 * Obtener contratos por ID de instalación
 */
async function getContractsByInstallationId(req, res) {
    try {
        const { installationId } = req.params
        const tenantId = req.user.tenantId

        const contracts = await service.getContractsByInstallationId(installationId, tenantId)

        res.status(200).json({
            success: true,
            data: contracts,
            count: contracts.length
        })
    } catch (error) {
        console.error("Error al obtener contratos de instalación:", error)
        res.status(400).json({
            success: false,
            error: error.message || "Error al obtener los contratos",
        })
    }
}

/**
 * Obtener contratos vigentes de una instalación
 */
async function getActiveContractsByInstallation(req, res) {
    try {
        const { installationId } = req.params
        const tenantId = req.user.tenantId

        const contracts = await service.getActiveContractsByInstallation(installationId, tenantId)

        res.status(200).json({
            success: true,
            data: contracts,
            count: contracts.length
        })
    } catch (error) {
        console.error("Error al obtener contratos vigentes:", error)
        res.status(400).json({
            success: false,
            error: error.message || "Error al obtener los contratos vigentes",
        })
    }
}

/**
 * Agregar nuevo contrato (requiere archivo PDF)
 */
async function addContract(req, res) {
    try {
        const contractData = req.body
        const adminUser = req.user
        const tenantId = req.user.tenantId

        // Verificar que el usuario sea admin del tenant
        if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
            return res.status(403).json({
                success: false,
                error: "No tienes permisos para crear contratos"
            })
        }

        // Agregar tenantId y createdBy
        contractData.tenantId = tenantId
        contractData.createdBy = adminUser._id

        // Verificar que se haya subido un archivo
        if (!req.cloudinaryFile) {
            return res.status(400).json({
                success: false,
                error: "Se requiere subir un archivo PDF para el contrato"
            })
        }

        const newContract = await service.addContract(contractData, req.cloudinaryFile, adminUser)

        res.status(201).json({
            success: true,
            message: "Contrato creado exitosamente",
            data: newContract,
        })
    } catch (error) {
        console.error("Error al crear contrato:", error)
        res.status(400).json({
            success: false,
            error: error.message || "Error al crear el contrato",
        })
    }
}

/**
 * Actualizar contrato completo (archivo PDF opcional)
 */
async function putContract(req, res) {
    try {
        const { id } = req.params
        const contractData = req.body
        const adminUser = req.user
        const tenantId = req.user.tenantId

        // Verificar que el usuario sea admin del tenant
        if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
            return res.status(403).json({
                success: false,
                error: "No tienes permisos para actualizar contratos"
            })
        }

        const fileData = req.cloudinaryFile || null
        const result = await service.putContract(id, contractData, fileData, tenantId, adminUser)

        res.status(200).json({
            success: true,
            message: "Contrato actualizado exitosamente",
            data: result,
        })
    } catch (error) {
        console.error("Error al actualizar contrato:", error)
        res.status(400).json({
            success: false,
            error: error.message || "Error al actualizar el contrato",
        })
    }
}

/**
 * Actualizar contrato parcialmente (sin archivo)
 */
async function patchContract(req, res) {
    try {
        const { id } = req.params
        const contractData = req.body
        const adminUser = req.user
        const tenantId = req.user.tenantId

        // Verificar que el usuario sea admin del tenant
        if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
            return res.status(403).json({
                success: false,
                error: "No tienes permisos para actualizar contratos"
            })
        }

        const result = await service.editContract(id, contractData, tenantId, adminUser)

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Contrato no encontrado",
            })
        }

        res.status(200).json({
            success: true,
            message: "Contrato actualizado exitosamente",
        })
    } catch (error) {
        console.error("Error al actualizar contrato:", error)
        res.status(400).json({
            success: false,
            error: error.message || "Error al actualizar el contrato",
        })
    }
}

/**
 * Actualizar solo el archivo PDF de un contrato
 */
async function updateContractFile(req, res) {
    try {
        const { id } = req.params
        const adminUser = req.user
        const tenantId = req.user.tenantId

        // Verificar que el usuario sea admin del tenant
        if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
            return res.status(403).json({
                success: false,
                error: "No tienes permisos para actualizar contratos"
            })
        }

        // Verificar que se haya subido un archivo
        if (!req.cloudinaryFile) {
            return res.status(400).json({
                success: false,
                error: "Se requiere subir un archivo PDF"
            })
        }

        const result = await service.updateContractFile(id, req.cloudinaryFile, tenantId)

        res.status(200).json({
            success: true,
            message: "Archivo del contrato actualizado exitosamente",
        })
    } catch (error) {
        console.error("Error al actualizar archivo del contrato:", error)
        res.status(400).json({
            success: false,
            error: error.message || "Error al actualizar el archivo del contrato",
        })
    }
}

/**
 * Eliminar contrato
 */
async function deleteContract(req, res) {
    try {
        const { id } = req.params
        const adminUser = req.user
        const tenantId = req.user.tenantId

        // Verificar que el usuario sea admin del tenant
        if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
            return res.status(403).json({
                success: false,
                error: "No tienes permisos para eliminar contratos"
            })
        }

        await service.deleteContract(id, tenantId, adminUser)

        res.status(200).json({
            success: true,
            message: "Contrato eliminado exitosamente",
        })
    } catch (error) {
        console.error("Error al eliminar contrato:", error)
        res.status(400).json({
            success: false,
            error: error.message || "Error al eliminar el contrato",
        })
    }
}

export {
    getContracts,
    getContractById,
    getContractsByInstallationId,
    getActiveContractsByInstallation,
    addContract,
    putContract,
    patchContract,
    updateContractFile,
    deleteContract,
}
