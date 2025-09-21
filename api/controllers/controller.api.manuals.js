import * as service from "../../services/manuals.services.js"

const getManuals = async (req, res) => {
  try {
    const filter = req.query
    const tenantId = req.user.tenantId
    const manuales = await service.getManuals(filter, tenantId)
    res.status(200).json(manuales)
  } catch (error) {
    console.error("Error al obtener manuales:", error)
    res.status(500).json({ error: { message: "Error interno del servidor" } })
  }
}

const getManualById = async (req, res) => {
  try {
    const id = req.params.id
    const tenantId = req.user.tenantId
    const manual = await service.getManualById(id, tenantId)
    if (manual) {
      res.status(200).json(manual)
    } else {
      res.status(404).json({ error: { message: "Manual no encontrado" } })
    }
  } catch (error) {
    console.error("Error al obtener manual:", error)
    res.status(500).json({ error: { message: "Error interno del servidor" } })
  }
}

const getManualsByAssetId = async (req, res) => {
  try {
    const assetId = req.params.assetId
    const tenantId = req.user.tenantId
    const manuales = await service.getManualsByAssetId(assetId, tenantId)
    res.status(200).json(manuales)
  } catch (error) {
    console.error("Error al obtener manuales del activo:", error)
    res.status(500).json({ error: { message: "Error interno del servidor" } })
  }
}

const addManual = async (req, res) => {
  try {
    const manualData = req.body
    const fileData = req.cloudinaryFile
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    console.log("📋 [ADD MANUAL] Datos recibidos:", {
      manualData,
      fileData: fileData ? { 
        secure_url: fileData.secure_url, 
        public_id: fileData.public_id,
        bytes: fileData.bytes,
        format: fileData.format 
      } : null,
      adminUser: { id: adminUser.id, role: adminUser.role },
      tenantId
    })
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      console.log("❌ [ADD MANUAL] Error de permisos")
      return res.status(403).json({
        error: { message: "No tienes permisos para crear manuales" }
      })
    }

    if (!fileData) {
      console.log("❌ [ADD MANUAL] No se encontró archivo")
      return res.status(400).json({
        error: { message: "Se requiere un archivo PDF" },
      })
    }

    // Agregar tenantId a los datos del manual
    manualData.tenantId = tenantId
    manualData.createdBy = adminUser.id || adminUser._id

    console.log("🔄 [ADD MANUAL] Llamando al servicio con datos:", {
      tenantId: manualData.tenantId,
      createdBy: manualData.createdBy,
      assetId: manualData.assetId,
      categoria: manualData.categoria
    })

    const newManual = await service.addManual(manualData, fileData, adminUser)
    console.log("✅ [ADD MANUAL] Manual creado exitosamente:", newManual._id)
    res.status(201).json(newManual)
  } catch (error) {
    console.error("❌ [ADD MANUAL] Error completo:", error)
    console.error("❌ [ADD MANUAL] Stack trace:", error.stack)
    
    // Manejar errores específicos de duplicados
    if (error.message.includes("Ya existe un manual de la categoría")) {
      console.log("⚠️ [ADD MANUAL] Error de duplicado:", error.message)
      return res.status(409).json({
        error: { message: error.message },
      })
    }
    
    // Manejar errores de validación
    if (error.message.includes("Se requiere") || error.message.includes("no es válido")) {
      console.log("⚠️ [ADD MANUAL] Error de validación:", error.message)
      return res.status(400).json({
        error: { message: error.message },
      })
    }
    
    console.log("💥 [ADD MANUAL] Error interno del servidor:", error.message)
    res.status(500).json({
      error: { message: error.message || "Error interno del servidor" },
    })
  }
}

const putManual = async (req, res) => {
  try {
    const id = req.params.id
    const manualData = req.body
    const fileData = req.cloudinaryFile // Puede ser null si no se subió nuevo archivo
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: { message: "No tienes permisos para actualizar manuales" }
      })
    }

    const existingManual = await service.getManualById(id, tenantId)
    if (!existingManual) {
      return res.status(404).json({
        error: { message: "Manual no encontrado" },
      })
    }

    manualData.updatedBy = adminUser._id
    manualData.updatedAt = new Date()

    const result = await service.putManual(id, manualData, fileData, tenantId, adminUser)
    if (result.modifiedCount > 0 || result.matchedCount > 0) {
      const updatedManual = await service.getManualById(id, tenantId)
      res.status(200).json(updatedManual)
    } else {
      res.status(404).json({
        error: { message: "No se pudo actualizar el manual" },
      })
    }
  } catch (error) {
    console.error("Error al reemplazar manual:", error)
    
    // Manejar errores específicos de duplicados
    if (error.message.includes("Ya existe un manual de la categoría")) {
      return res.status(409).json({
        error: { message: error.message },
      })
    }
    
    res.status(500).json({
      error: { message: error.message || "Error interno del servidor" },
    })
  }
}

const patchManual = async (req, res) => {
  try {
    const id = req.params.id
    const manualData = req.body
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: { message: "No tienes permisos para actualizar manuales" }
      })
    }

    const existingManual = await service.getManualById(id, tenantId)
    if (!existingManual) {
      return res.status(404).json({
        error: { message: "Manual no encontrado" },
      })
    }

    manualData.updatedBy = adminUser._id
    manualData.updatedAt = new Date()

    const result = await service.editManual(id, manualData, tenantId, adminUser)
    if (result.modifiedCount > 0) {
      const updatedManual = await service.getManualById(id, tenantId)
      res.status(200).json(updatedManual)
    } else {
      res.status(404).json({
        error: { message: "No se pudo actualizar el manual" },
      })
    }
  } catch (error) {
    console.error("Error al actualizar manual:", error)
    
    // Manejar errores específicos de duplicados
    if (error.message.includes("Ya existe un manual de la categoría")) {
      return res.status(409).json({
        error: { message: error.message },
      })
    }
    
    res.status(500).json({
      error: { message: error.message || "Error interno del servidor" },
    })
  }
}

const deleteManual = async (req, res) => {
  try {
    const id = req.params.id
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: { message: "No tienes permisos para eliminar manuales" }
      })
    }
    
    await service.deleteManual(id, tenantId, adminUser)
    res.status(200).json({ message: "Manual eliminado exitosamente" })
  } catch (error) {
    console.error("Error al eliminar manual:", error)
    res.status(500).json({
      error: { message: error.message || "Error interno del servidor" },
    })
  }
}

const updateManualFile = async (req, res) => {
  try {
    const id = req.params.id
    const fileData = req.cloudinaryFile
    const tenantId = req.user.tenantId

    if (!fileData) {
      return res.status(400).json({
        error: { message: "Se requiere un archivo PDF" },
      })
    }

    const result = await service.updateManualFile(id, fileData, tenantId)
    if (result.modifiedCount > 0) {
      const updatedManual = await service.getManualById(id, tenantId)
      res.status(200).json(updatedManual)
    } else {
      res.status(404).json({
        error: { message: "No se pudo actualizar el archivo del manual" },
      })
    }
  } catch (error) {
    console.error("Error al actualizar archivo del manual:", error)
    res.status(500).json({
      error: { message: error.message || "Error interno del servidor" },
    })
  }
}

export {
  getManuals,
  getManualById,
  getManualsByAssetId,
  addManual,
  putManual,
  patchManual,
  deleteManual,
  updateManualFile,
}