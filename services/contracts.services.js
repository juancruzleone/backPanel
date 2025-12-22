/**
 * Servicio para manejar contratos/presupuestos de instalaciones
 * Los contratos se almacenan en Hetzner Object Storage y se asocian a instalaciones
 */
import { db } from "../db.js"
import { ObjectId } from "mongodb"
import { deleteFromHetzner } from "../middleware/hetzner.upload.middleware.js"

const contractsCollection = db.collection("contracts")

/**
 * Obtener todos los contratos con filtros opcionales
 * @param {Object} filter - Filtros de búsqueda
 * @param {string} tenantId - ID del tenant
 */
async function getContracts(filter = {}, tenantId = null) {
    const filterMongo = { eliminado: { $ne: true } }

    // Filtrar por instalación
    if (filter.installationId) {
        if (ObjectId.isValid(filter.installationId)) {
            filterMongo.installationId = new ObjectId(filter.installationId)
        }
    }

    // Filtrar por tipo de contrato
    if (filter.tipoContrato) {
        filterMongo.tipoContrato = filter.tipoContrato
    }

    // Filtrar por estado
    if (filter.estado) {
        filterMongo.estado = filter.estado
    }

    // Filtrar por nombre
    if (filter.nombre) {
        filterMongo.nombre = { $regex: filter.nombre, $options: "i" }
    }

    // Filtrar por fecha de vigencia
    if (filter.vigente === true) {
        const now = new Date()
        filterMongo.fechaVigenciaHasta = { $gte: now }
    }

    // Solo del tenant correspondiente
    if (tenantId) {
        filterMongo.tenantId = tenantId
    }

    return contractsCollection.find(filterMongo).sort({ _id: -1 }).toArray()
}

/**
 * Obtener contrato por ID
 */
async function getContractById(id, tenantId = null) {
    if (!ObjectId.isValid(id)) {
        return null
    }

    const query = { _id: new ObjectId(id) }
    if (tenantId) {
        query.tenantId = tenantId
    }

    return contractsCollection.findOne(query)
}

/**
 * Obtener contratos por ID de instalación
 */
async function getContractsByInstallationId(installationId, tenantId = null) {
    if (!ObjectId.isValid(installationId)) {
        return []
    }

    const query = {
        installationId: new ObjectId(installationId),
        eliminado: { $ne: true },
    }

    if (tenantId) {
        query.tenantId = tenantId
    }

    return contractsCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray()
}

/**
 * Verificar si ya existe un contrato del mismo tipo para la instalación
 */
async function checkDuplicateContract(installationId, tipoContrato, excludeId = null, tenantId = null) {
    const filter = {
        installationId: new ObjectId(installationId),
        tipoContrato: tipoContrato,
        eliminado: { $ne: true }
    }

    if (tenantId) {
        filter.tenantId = tenantId
    }

    // Si estamos editando, excluir el contrato actual
    if (excludeId) {
        filter._id = { $ne: new ObjectId(excludeId) }
    }

    const existingContract = await contractsCollection.findOne(filter)
    return existingContract !== null
}

/**
 * Agregar nuevo contrato/presupuesto
 */
const addContract = async (contractData, fileData, adminUser) => {
    try {
        // Verificar que se proporcione tenantId
        if (!contractData.tenantId) {
            throw new Error("Se requiere tenantId para crear el contrato")
        }

        // Verificar que el usuario tenga permisos para este tenant
        if (adminUser.role !== "super_admin" && adminUser.tenantId !== contractData.tenantId) {
            throw new Error("No tienes permisos para crear contratos en este tenant")
        }

        // Verificar que se proporcione installationId
        if (!contractData.installationId) {
            throw new Error("Se requiere installationId para crear el contrato")
        }

        // Verificar si ya existe un contrato del mismo tipo (opcional)
        // No bloqueamos duplicados para permitir múltiples versiones de presupuestos
        // const isDuplicate = await checkDuplicateContract(contractData.installationId, contractData.tipoContrato, null, contractData.tenantId)

        const contractToInsert = {
            nombre: contractData.nombre,
            descripcion: contractData.descripcion || "",
            tipoContrato: contractData.tipoContrato || "Presupuesto", // Presupuesto, Contrato, Anexo
            monto: contractData.monto || null,
            moneda: contractData.moneda || "ARS",
            fechaEmision: contractData.fechaEmision ? new Date(contractData.fechaEmision) : new Date(),
            fechaVigenciaDesde: contractData.fechaVigenciaDesde ? new Date(contractData.fechaVigenciaDesde) : null,
            fechaVigenciaHasta: contractData.fechaVigenciaHasta ? new Date(contractData.fechaVigenciaHasta) : null,
            estado: contractData.estado || "Vigente", // Vigente, Vencido, Pendiente, Anulado
            numeroContrato: contractData.numeroContrato || "",
            observaciones: contractData.observaciones || "",
            installationId: new ObjectId(contractData.installationId),
            tenantId: contractData.tenantId,
            createdBy: contractData.createdBy || adminUser._id,
            // Datos del archivo PDF
            archivo: {
                url: fileData.secure_url,
                publicId: fileData.public_id,
                nombreOriginal: fileData.original_filename,
                tamaño: fileData.bytes,
                formato: fileData.format,
                resourceType: fileData.resource_type,
                fechaSubida: new Date(fileData.created_at),
            },
            fechaCreacion: new Date(),
            fechaActualizacion: new Date(),
        }

        const result = await contractsCollection.insertOne(contractToInsert)
        contractToInsert._id = result.insertedId
        return contractToInsert
    } catch (error) {
        console.error("Error en addContract:", error)
        throw error
    }
}

/**
 * Actualizar contrato completo (con nuevo archivo opcional)
 */
const putContract = async (id, contractData, fileData = null, tenantId = null, adminUser = null) => {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error("El ID del contrato no es válido")
        }

        const query = { _id: new ObjectId(id) }
        if (tenantId) {
            query.tenantId = tenantId
        }

        const existingContract = await contractsCollection.findOne(query)
        if (!existingContract) {
            throw new Error("Contrato no encontrado")
        }

        // Verificar que el usuario tenga permisos para este tenant
        if (adminUser && adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
            throw new Error("No tienes permisos para actualizar contratos en este tenant")
        }

        const contractToUpdate = {
            nombre: contractData.nombre,
            descripcion: contractData.descripcion || "",
            tipoContrato: contractData.tipoContrato || existingContract.tipoContrato,
            monto: contractData.monto || existingContract.monto,
            moneda: contractData.moneda || existingContract.moneda,
            fechaEmision: contractData.fechaEmision ? new Date(contractData.fechaEmision) : existingContract.fechaEmision,
            fechaVigenciaDesde: contractData.fechaVigenciaDesde ? new Date(contractData.fechaVigenciaDesde) : existingContract.fechaVigenciaDesde,
            fechaVigenciaHasta: contractData.fechaVigenciaHasta ? new Date(contractData.fechaVigenciaHasta) : existingContract.fechaVigenciaHasta,
            estado: contractData.estado || existingContract.estado,
            numeroContrato: contractData.numeroContrato || existingContract.numeroContrato,
            observaciones: contractData.observaciones || existingContract.observaciones,
            installationId: existingContract.installationId, // No permitimos cambiar la instalación
            tenantId: existingContract.tenantId,
            createdBy: existingContract.createdBy,
            fechaCreacion: existingContract.fechaCreacion,
            fechaActualizacion: new Date(),
        }

        // Si se subió un nuevo archivo, eliminar el anterior y usar el nuevo
        if (fileData) {
            // Eliminar archivo anterior de Hetzner
            if (existingContract.archivo && existingContract.archivo.publicId) {
                try {
                    await deleteFromHetzner(existingContract.archivo.publicId)
                } catch (error) {
                    console.error("Error al eliminar archivo anterior:", error)
                }
            }

            contractToUpdate.archivo = {
                url: fileData.secure_url,
                publicId: fileData.public_id,
                nombreOriginal: fileData.original_filename,
                tamaño: fileData.bytes,
                formato: fileData.format,
                resourceType: fileData.resource_type,
                fechaSubida: new Date(fileData.created_at),
            }
        } else {
            // Mantener el archivo existente
            contractToUpdate.archivo = existingContract.archivo
        }

        const result = await contractsCollection.replaceOne(query, contractToUpdate)
        return result
    } catch (error) {
        console.error("Error en putContract:", error)
        throw error
    }
}

/**
 * Actualizar contrato parcialmente (sin archivo)
 */
const editContract = async (id, contractData, tenantId = null, adminUser = null) => {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error("El ID del contrato no es válido")
        }

        const query = { _id: new ObjectId(id) }
        if (tenantId) {
            query.tenantId = tenantId
        }

        // Verificar que el usuario tenga permisos para este tenant
        if (adminUser && adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
            throw new Error("No tienes permisos para actualizar contratos en este tenant")
        }

        const updateData = {
            ...contractData,
            fechaActualizacion: new Date(),
        }

        // Convertir fechas si se proporcionan
        if (contractData.fechaEmision) {
            updateData.fechaEmision = new Date(contractData.fechaEmision)
        }
        if (contractData.fechaVigenciaDesde) {
            updateData.fechaVigenciaDesde = new Date(contractData.fechaVigenciaDesde)
        }
        if (contractData.fechaVigenciaHasta) {
            updateData.fechaVigenciaHasta = new Date(contractData.fechaVigenciaHasta)
        }

        const result = await contractsCollection.updateOne(query, { $set: updateData })
        return result
    } catch (error) {
        console.error("Error en editContract:", error)
        throw error
    }
}

/**
 * Eliminar contrato
 */
const deleteContract = async (id, tenantId = null, adminUser = null) => {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error("El ID del contrato no es válido")
        }

        const query = { _id: new ObjectId(id) }
        if (tenantId) {
            query.tenantId = tenantId
        }

        // Verificar que el usuario tenga permisos para este tenant
        if (adminUser && adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
            throw new Error("No tienes permisos para eliminar contratos en este tenant")
        }

        const contract = await contractsCollection.findOne(query)
        if (!contract) {
            throw new Error("Contrato no encontrado")
        }

        // Eliminar archivo de Hetzner
        if (contract.archivo && contract.archivo.publicId) {
            try {
                await deleteFromHetzner(contract.archivo.publicId)
            } catch (error) {
                console.error("Error al eliminar archivo de Hetzner:", error)
            }
        }

        // Eliminación física del documento
        const result = await contractsCollection.deleteOne(query)
        return result
    } catch (error) {
        console.error("Error en deleteContract:", error)
        throw error
    }
}

/**
 * Actualizar solo el archivo PDF de un contrato
 */
const updateContractFile = async (id, fileData, tenantId = null) => {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error("El ID del contrato no es válido")
        }

        const query = { _id: new ObjectId(id) }
        if (tenantId) {
            query.tenantId = tenantId
        }

        const existingContract = await contractsCollection.findOne(query)
        if (!existingContract) {
            throw new Error("Contrato no encontrado")
        }

        // Eliminar archivo anterior de Hetzner
        if (existingContract.archivo && existingContract.archivo.publicId) {
            try {
                await deleteFromHetzner(existingContract.archivo.publicId)
            } catch (error) {
                console.error("Error al eliminar archivo anterior:", error)
            }
        }

        const updateData = {
            archivo: {
                url: fileData.secure_url,
                publicId: fileData.public_id,
                nombreOriginal: fileData.original_filename,
                tamaño: fileData.bytes,
                formato: fileData.format,
                resourceType: fileData.resource_type,
                fechaSubida: new Date(fileData.created_at),
            },
            fechaActualizacion: new Date(),
        }

        const result = await contractsCollection.updateOne(query, { $set: updateData })

        return result
    } catch (error) {
        console.error("Error en updateContractFile:", error)
        throw error
    }
}

/**
 * Obtener contratos vigentes de una instalación
 */
async function getActiveContractsByInstallation(installationId, tenantId = null) {
    if (!ObjectId.isValid(installationId)) {
        return []
    }

    const now = new Date()
    const query = {
        installationId: new ObjectId(installationId),
        eliminado: { $ne: true },
        estado: "Vigente",
        $or: [
            { fechaVigenciaHasta: null },
            { fechaVigenciaHasta: { $gte: now } }
        ]
    }

    if (tenantId) {
        query.tenantId = tenantId
    }

    return contractsCollection
        .find(query)
        .sort({ fechaEmision: -1 })
        .toArray()
}

export {
    getContracts,
    getContractById,
    getContractsByInstallationId,
    addContract,
    putContract,
    editContract,
    deleteContract,
    updateContractFile,
    checkDuplicateContract,
    getActiveContractsByInstallation,
}
