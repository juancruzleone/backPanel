import { db } from "../db.js"
import { ObjectId } from "mongodb"
import * as formFieldsService from "./formFields.services.js"

const assetsCollection = db.collection("activos")

async function getAssets(filter = {}) {
  const filterMongo = { eliminado: { $ne: true } }

  if (filter.categoria) {
    filterMongo.categoria = filter.categoria
  }

  if (filter.estado) {
    filterMongo.estado = filter.estado
  }

  if (filter.ubicacion) {
    filterMongo.ubicacion = { $regex: filter.ubicacion, $options: "i" }
  }

  if (filter.nombre) {
    filterMongo.nombre = { $regex: filter.nombre, $options: "i" }
  }

  return assetsCollection.find(filterMongo).sort({ _id: -1 }).toArray()
}

async function getAssetById(id) {
  if (!ObjectId.isValid(id)) {
    return null
  }
  return assetsCollection.findOne({ _id: new ObjectId(id) })
}

const addAsset = async (activo) => {
  // Añadir fecha de creación y estado por defecto si no se proporciona
  const assetToInsert = {
    ...activo,
    fechaCreacion: new Date(),
    estado: activo.estado || "Activo",
  }

  // Verificar si se proporcionó un templateId y si es válido
  if (activo.templateId) {
    if (!ObjectId.isValid(activo.templateId)) {
      throw new Error("El ID de la plantilla no es válido")
    }
    
    // Verificar que la plantilla existe
    const template = await formFieldsService.getFormTemplateById(activo.templateId)
    if (!template) {
      throw new Error("La plantilla especificada no existe")
    }
  }

  const result = await assetsCollection.insertOne(assetToInsert)
  assetToInsert._id = result.insertedId
  return assetToInsert
}

const putAsset = async (id, activo) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("El ID del activo no es válido")
  }
  
  // Verificar si se proporcionó un templateId y si es válido
  if (activo.templateId) {
    if (!ObjectId.isValid(activo.templateId)) {
      throw new Error("El ID de la plantilla no es válido")
    }
    
    // Verificar que la plantilla existe
    const template = await formFieldsService.getFormTemplateById(activo.templateId)
    if (!template) {
      throw new Error("La plantilla especificada no existe")
    }
  }
  
  // Preservar la fecha de creación original
  const existingAsset = await getAssetById(id)
  const assetToUpdate = {
    ...activo,
    fechaCreacion: existingAsset.fechaCreacion || new Date(),
    fechaActualizacion: new Date(),
  }

  const result = await assetsCollection.replaceOne({ _id: new ObjectId(id) }, assetToUpdate)
  return result
}

const editAsset = async (id, activo) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("El ID del activo no es válido")
  }
  
  // Verificar si se proporcionó un templateId y si es válido
  if (activo.templateId) {
    if (!ObjectId.isValid(activo.templateId)) {
      throw new Error("El ID de la plantilla no es válido")
    }
    
    // Verificar que la plantilla existe
    const template = await formFieldsService.getFormTemplateById(activo.templateId)
    if (!template) {
      throw new Error("La plantilla especificada no existe")
    }
  }

  const updateData = {
    ...activo,
    fechaActualizacion: new Date(),
  }

  const result = await assetsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData })
  return result
}

const deleteAsset = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("El ID del activo no es válido")
  }
  
  // Opción 1: Eliminación lógica (marcar como eliminado)
  // return assetsCollection.updateOne({ _id: new ObjectId(id) }, { $set: { eliminado: true, fechaEliminacion: new Date() } })

  // Opción 2: Eliminación física
  const result = await assetsCollection.deleteOne({ _id: new ObjectId(id) })
  return result
}

// Nueva función para asignar una plantilla de formulario a un activo
const assignTemplateToAsset = async (assetId, templateId) => {
  if (!ObjectId.isValid(assetId)) {
    throw new Error("El ID del activo no es válido")
  }
  
  if (!ObjectId.isValid(templateId)) {
    throw new Error("El ID de la plantilla no es válido")
  }
  
  // Verificar que el activo existe
  const asset = await getAssetById(assetId)
  if (!asset) {
    throw new Error("El activo no existe")
  }
  
  // Verificar que la plantilla existe
  const template = await formFieldsService.getFormTemplateById(templateId)
  if (!template) {
    throw new Error("La plantilla no existe")
  }
  
  // Actualizar el activo con la referencia a la plantilla
  const result = await assetsCollection.updateOne(
    { _id: new ObjectId(assetId) },
    { 
      $set: { 
        templateId: new ObjectId(templateId),
        fechaActualizacion: new Date()
      } 
    }
  )
  
  if (result.modifiedCount === 0) {
    throw new Error("No se pudo asignar la plantilla al activo")
  }
  
  return { 
    message: "Plantilla asignada correctamente al activo",
    assetId,
    templateId,
    templateName: template.nombre
  }
}

export { getAssets, getAssetById, addAsset, putAsset, deleteAsset, editAsset, assignTemplateToAsset }