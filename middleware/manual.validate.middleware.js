import { manualSchemaCreate, manualSchemaPatch } from "../schemas/manual.schema.js"
import * as service from "../services/manuals.services.js"
import * as assetService from "../services/assets.services.js"
import { ObjectId } from "mongodb"

async function validateManual(req, res, next) {
  try {
    // Verificar si se está editando un manual existente
    if (req.method === "PUT") {
      const existingManual = await service.getManualById(req.params.id)
      if (!existingManual) {
        return res.status(404).json({ error: { message: "Manual no encontrado." } })
      }
    }

    // Validar que el assetId sea válido y que el activo exista
    if (req.body.assetId) {
      if (!ObjectId.isValid(req.body.assetId)) {
        return res.status(400).json({ error: { message: "El ID del activo no es válido." } })
      }

      const asset = await assetService.getAssetById(req.body.assetId)
      if (!asset) {
        return res.status(404).json({ error: { message: "El activo especificado no existe." } })
      }
    }

    // Procesar tags si vienen como string separado por comas
    if (req.body.tags && typeof req.body.tags === "string") {
      req.body.tags = req.body.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
    }

    // Validar esquema básico
    const manual = await manualSchemaCreate.validate(req.body, { abortEarly: false })
    
    // Validar duplicados de categoría por activo
    const excludeId = req.method === "PUT" ? req.params.id : null
    const isDuplicate = await service.checkDuplicateManual(
      manual.assetId, 
      manual.categoria, 
      excludeId
    )
    
    if (isDuplicate) {
      return res.status(409).json({ 
        error: { 
          message: `Ya existe un manual de la categoría "${manual.categoria}" para este activo. Solo se permite un manual por categoría por activo.` 
        } 
      })
    }

    req.body = manual
    next()
  } catch (error) {
    res.status(400).json({ error: { message: error.errors || error.message } })
  }
}

async function validateManualPatch(req, res, next) {
  try {
    // Procesar tags si vienen como string separado por comas
    if (req.body.tags && typeof req.body.tags === "string") {
      req.body.tags = req.body.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
    }

    const manual = await manualSchemaPatch.validate(req.body, { abortEarly: false, stripUnknown: true })
    
    // Validar assetId si se proporciona
    if (manual.assetId) {
      if (!ObjectId.isValid(manual.assetId)) {
        return res.status(400).json({ error: { message: "El ID del activo no es válido." } })
      }

      const asset = await assetService.getAssetById(manual.assetId)
      if (!asset) {
        return res.status(404).json({ error: { message: "El activo especificado no existe." } })
      }
    }

    // Validar duplicados solo si se está cambiando categoría o assetId
    if (manual.categoria || manual.assetId) {
      const existingManual = await service.getManualById(req.params.id)
      if (!existingManual) {
        return res.status(404).json({ error: { message: "Manual no encontrado." } })
      }

      const newAssetId = manual.assetId || existingManual.assetId.toString()
      const newCategoria = manual.categoria || existingManual.categoria

      const isDuplicate = await service.checkDuplicateManual(
        newAssetId, 
        newCategoria, 
        req.params.id
      )
      
      if (isDuplicate) {
        return res.status(409).json({ 
          error: { 
            message: `Ya existe un manual de la categoría "${newCategoria}" para este activo. Solo se permite un manual por categoría por activo.` 
          } 
        })
      }
    }

    req.body = manual
    next()
  } catch (error) {
    res.status(400).json({ error: { message: error.errors || error.message } })
  }
}

// Middleware para validar que se subió un archivo
function validateFileUpload(req, res, next) {
  if (!req.cloudinaryFile) {
    return res.status(400).json({
      error: { message: "Se requiere un archivo PDF." },
    })
  }
  next()
}

export { validateManual, validateManualPatch, validateFileUpload }