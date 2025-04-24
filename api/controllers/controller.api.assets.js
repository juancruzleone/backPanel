import * as service from "../../services/assets.services.js"

const getAssets = (req, res) => {
  const filter = req.query

  service.getAssets(filter).then((activos) => {
    res.status(200).json(activos)
  })
}

const getAssetById = (req, res) => {
  const id = req.params.id
  service.getAssetById(id).then((activo) => {
    if (activo) {
      res.status(200).json(activo)
    } else {
      res.status(404).json()
    }
  })
}

const addAsset = async (req, res) => {
  try {
    const activo = { ...req.body }
    const newAsset = await service.addAsset(activo)
    res.status(201).json(newAsset)
  } catch (error) {
    console.error("Error al agregar activo:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
}

const putAsset = async (req, res) => {
  try {
    const id = req.params.id
    const existingAsset = await service.getAssetById(id)
    if (!existingAsset) {
      return res.status(404).json()
    }

    const activo = { ...req.body }
    const editedAsset = await service.putAsset(id, activo)
    if (editedAsset.modifiedCount > 0) {
      res.status(200).json(activo)
    } else {
      res.status(404).json()
    }
  } catch (error) {
    console.error("Error al reemplazar activo:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
}

const patchAsset = async (req, res) => {
  try {
    const id = req.params.id
    const existingAsset = await service.getAssetById(id)
    if (!existingAsset) {
      return res.status(404).json()
    }

    const activo = { ...req.body }
    const editedAsset = await service.editAsset(id, activo)
    if (editedAsset.modifiedCount > 0) {
      res.status(200).json(activo)
    } else {
      res.status(404).json()
    }
  } catch (error) {
    console.error("Error al actualizar activo:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
}

const deleteAsset = (req, res) => {
  const id = req.params.id
  service
    .deleteAsset(id)
    .then(() => {
      res.status(204).json()
    })
    .catch((error) => {
      console.error("Error al eliminar activo:", error)
      res.status(500).json({ error: "Error interno del servidor" })
    })
}

// Nueva función para asignar una plantilla de formulario a un activo
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

export { getAssets, getAssetById, addAsset, putAsset, patchAsset, deleteAsset, assignTemplateToAsset }