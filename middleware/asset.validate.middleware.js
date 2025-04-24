import { assetSchemaCreate, assetSchemaPatch } from "../schemas/asset.schema.js"
import * as service from "../services/assets.services.js"
import { ObjectId } from "mongodb"

async function validateAsset(req, res, next) {
  try {
    // Verificar si se está editando un activo existente
    if (req.method === "PUT") {
      const existingAsset = await service.getAssetById(req.params.id)
      if (!existingAsset) {
        return res.status(404).json({ error: "Activo no encontrado." })
      }
    }

    const activo = await assetSchemaCreate.validate(req.body, { abortEarly: false })
    req.body = activo
    next()
  } catch (error) {
    res.status(400).json({ error: error.errors })
  }
}

function validateAssetPatch(req, res, next) {
  assetSchemaPatch
    .validate(req.body, { abortEarly: false, stripUnknown: true })
    .then((activo) => {
      req.body = activo
      next()
    })
    .catch((error) => res.status(400).json({ error: error.errors }))
}

// Nuevo middleware para validar el assetId
function validateAssetId(req, res, next) {
  const { assetId } = req.body;
  
  if (!assetId) {
    return res.status(400).json({ error: { message: 'Se requiere el ID del activo' } });
  }
  
  if (!ObjectId.isValid(assetId)) {
    return res.status(400).json({ error: { message: 'El ID del activo no es válido' } });
  }
  
  next();
}

export { validateAsset, validateAssetPatch, validateAssetId }