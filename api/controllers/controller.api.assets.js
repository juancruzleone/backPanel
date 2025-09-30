import * as service from "../../services/assets.services.js"

const getAssets = (req, res) => {
  const filter = req.query
  const tenantId = req.user.tenantId
  
  service
    .getAssets(filter, tenantId)
    .then((activos) => {
      res.status(200).json(activos)
    })
    .catch((error) => {
      console.error("Error al obtener activos:", error)
      res.status(500).json({ error: "Error interno del servidor" })
    })
}

const getAssetById = (req, res) => {
  const id = req.params.id
  const tenantId = req.user.tenantId
  
  service
    .getAssetById(id, tenantId)
    .then((activo) => {
      if (activo) {
        res.status(200).json(activo)
      } else {
        res.status(404).json({ error: "Activo no encontrado" })
      }
    })
    .catch((error) => {
      console.error("Error al obtener activo:", error)
      res.status(500).json({ error: "Error interno del servidor" })
    })
}

const addAsset = async (req, res) => {
  try {
    const activo = { ...req.body }
    const adminUser = req.user
    const tenantId = req.tenantId || req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: "No tienes permisos para crear activos"
      })
    }
    
    // Validar que tenemos tenantId
    if (!tenantId) {
      console.error("❌ [ADD ASSET] ERROR: tenantId es undefined/null")
      return res.status(400).json({
        error: "Error interno: no se pudo identificar el tenant"
      })
    }
    
    // Agregar tenantId a los datos del activo
    activo.tenantId = tenantId
    activo.createdBy = adminUser._id
    
    const newAsset = await service.addAsset(activo, adminUser)
    res.status(201).json(newAsset)
  } catch (error) {
    console.error("Error al agregar activo:", error)
    res.status(500).json({ error: error.message || "Error interno del servidor" })
  }
}

const putAsset = async (req, res) => {
  try {
    const id = req.params.id
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: "No tienes permisos para actualizar activos"
      })
    }
    
    const existingAsset = await service.getAssetById(id, tenantId)
    if (!existingAsset) {
      return res.status(404).json({ error: "Activo no encontrado" })
    }

    const activo = { ...req.body }
    activo.updatedBy = adminUser._id
    activo.updatedAt = new Date()
    
    const editedAsset = await service.putAsset(id, activo, tenantId, adminUser)
    if (editedAsset.modifiedCount > 0) {
      const updatedAsset = await service.getAssetById(id, tenantId)
      res.status(200).json(updatedAsset)
    } else {
      res.status(404).json({ error: "No se pudo actualizar el activo" })
    }
  } catch (error) {
    console.error("Error al reemplazar activo:", error)
    res.status(500).json({ error: error.message || "Error interno del servidor" })
  }
}

const patchAsset = async (req, res) => {
  try {
    const id = req.params.id
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: "No tienes permisos para actualizar activos"
      })
    }
    
    const existingAsset = await service.getAssetById(id, tenantId)
    if (!existingAsset) {
      return res.status(404).json({ error: "Activo no encontrado" })
    }

    const activo = { ...req.body }
    activo.updatedBy = adminUser._id
    activo.updatedAt = new Date()
    
    const editedAsset = await service.editAsset(id, activo, tenantId, adminUser)
    if (editedAsset.modifiedCount > 0) {
      const updatedAsset = await service.getAssetById(id, tenantId)
      res.status(200).json(updatedAsset)
    } else {
      res.status(404).json({ error: "No se pudo actualizar el activo" })
    }
  } catch (error) {
    console.error("Error al actualizar activo:", error)
    res.status(500).json({ error: error.message || "Error interno del servidor" })
  }
}

const deleteAsset = async (req, res) => {
  try {
    const id = req.params.id
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: "No tienes permisos para eliminar activos"
      })
    }
    
    await service.deleteAsset(id, tenantId, adminUser)

    // ✅ CAMBIO: Respuesta con body JSON en lugar de 204
    res.status(200).json({ message: "Activo eliminado correctamente" })
  } catch (error) {
    console.error("Error al eliminar activo:", error)
    res.status(500).json({ error: error.message || "Error interno del servidor" })
  }
}

const assignTemplateToAsset = async (req, res) => {
  try {
    const { id } = req.params
    const { templateId } = req.body

    if (!templateId) {
      return res.status(400).json({ error: "Se requiere el ID de la plantilla" })
    }

    const existingAsset = await service.getAssetById(id)
    if (!existingAsset) {
      return res.status(404).json({ error: "Activo no encontrado" })
    }

    const result = await service.assignTemplateToAsset(id, templateId)
    res.status(200).json(result)
  } catch (error) {
    console.error("Error al asignar plantilla:", error)
    res.status(500).json({ error: error.message || "Error interno del servidor" })
  }
}

const removeTemplateFromAsset = async (req, res) => {
  try {
    const { id } = req.params

    const existingAsset = await service.getAssetById(id)
    if (!existingAsset) {
      return res.status(404).json({ error: "Activo no encontrado" })
    }

    const result = await service.removeTemplateFromAsset(id)
    res.status(200).json(result)
  } catch (error) {
    console.error("Error al remover plantilla:", error)
    res.status(500).json({ error: error.message || "Error interno del servidor" })
  }
}

const getAssetFormFields = async (req, res) => {
  try {
    const { id } = req.params

    const asset = await service.getAssetById(id)
    if (!asset) {
      return res.status(404).json({ error: "Activo no encontrado" })
    }

    const formFields = await service.getAssetFormFields(id)
    res.status(200).json({
      asset: {
        id: asset._id,
        nombre: asset.nombre,
        categoria: asset.categoria,
      },
      formFields,
    })
  } catch (error) {
    console.error("Error al obtener campos de formulario:", error)
    res.status(500).json({ error: error.message || "Error interno del servidor" })
  }
}

export {
  getAssets,
  getAssetById,
  addAsset,
  putAsset,
  patchAsset,
  deleteAsset,
  assignTemplateToAsset,
  removeTemplateFromAsset,
  getAssetFormFields,
}
