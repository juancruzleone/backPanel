import * as service from "../../services/manuals.services.js"

const getManuals = async (req, res) => {
  try {
    const filter = req.query
    const manuales = await service.getManuals(filter)
    res.status(200).json(manuales)
  } catch (error) {
    console.error("Error al obtener manuales:", error)
    res.status(500).json({ error: { message: "Error interno del servidor" } })
  }
}

const getManualById = async (req, res) => {
  try {
    const id = req.params.id
    const manual = await service.getManualById(id)
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
    const manuales = await service.getManualsByAssetId(assetId)
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

    if (!fileData) {
      return res.status(400).json({
        error: { message: "Se requiere un archivo PDF" },
      })
    }

    const newManual = await service.addManual(manualData, fileData)
    res.status(201).json(newManual)
  } catch (error) {
    console.error("Error al agregar manual:", error)
    
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

const putManual = async (req, res) => {
  try {
    const id = req.params.id
    const manualData = req.body
    const fileData = req.cloudinaryFile // Puede ser null si no se subió nuevo archivo

    const existingManual = await service.getManualById(id)
    if (!existingManual) {
      return res.status(404).json({
        error: { message: "Manual no encontrado" },
      })
    }

    const result = await service.putManual(id, manualData, fileData)
    if (result.modifiedCount > 0 || result.matchedCount > 0) {
      const updatedManual = await service.getManualById(id)
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

    const existingManual = await service.getManualById(id)
    if (!existingManual) {
      return res.status(404).json({
        error: { message: "Manual no encontrado" },
      })
    }

    const result = await service.editManual(id, manualData)
    if (result.modifiedCount > 0) {
      const updatedManual = await service.getManualById(id)
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
    await service.deleteManual(id)
    res.status(204).json()
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

    if (!fileData) {
      return res.status(400).json({
        error: { message: "Se requiere un archivo PDF" },
      })
    }

    const result = await service.updateManualFile(id, fileData)
    if (result.modifiedCount > 0) {
      const updatedManual = await service.getManualById(id)
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