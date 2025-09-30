import { db } from "../db.js"
import { ObjectId } from "mongodb"
import * as formFieldsService from "./formFields.services.js"

const assetsCollection = db.collection("activos")

async function getAssets(filter = {}, tenantId = null) {
  const filterMongo = { eliminado: { $ne: true } }
  
  // Filtrar por tenant si se proporciona
  if (tenantId) {
    filterMongo.tenantId = tenantId
  }

  if (filter.nombre) {
    filterMongo.nombre = { $regex: filter.nombre, $options: "i" }
  }
  if (filter.marca) {
    filterMongo.marca = { $regex: filter.marca, $options: "i" }
  }
  if (filter.modelo) {
    filterMongo.modelo = { $regex: filter.modelo, $options: "i" }
  }

  return assetsCollection.find(filterMongo).sort({ _id: -1 }).toArray()
}

async function getAssetById(id, tenantId = null) {
  if (!ObjectId.isValid(id)) {
    return null
  }
  
  const query = { _id: new ObjectId(id) }
  if (tenantId) {
    query.tenantId = tenantId
  }
  
  return assetsCollection.findOne(query)
}

const addAsset = async (activo, adminUser) => {
  // Validar que se proporcionó templateId (obligatorio)
  if (!activo.templateId) {
    throw new Error("La plantilla de formulario es obligatoria")
  }

  if (!ObjectId.isValid(activo.templateId)) {
    throw new Error("El ID de la plantilla no es válido")
  }

  // Verificar que se proporcione tenantId
  if (!activo.tenantId) {
    throw new Error("Se requiere tenantId para crear el activo")
  }

  // Verificar que el usuario tenga permisos para este tenant
  if (adminUser.role !== "super_admin" && adminUser.tenantId !== activo.tenantId) {
    throw new Error("No tienes permisos para crear activos en este tenant")
  }

  // Verificar que la plantilla existe
  const template = await formFieldsService.getFormTemplateById(activo.templateId)
  if (!template) {
    throw new Error("La plantilla especificada no existe")
  }

  // Crear activo con campos básicos
  const assetToInsert = {
    nombre: activo.nombre,
    marca: activo.marca,
    modelo: activo.modelo,
    numeroSerie: activo.numeroSerie,
    templateId: new ObjectId(activo.templateId),
    tenantId: activo.tenantId, // Agregar tenantId
    createdBy: adminUser._id, // Agregar quien creó el activo
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const result = await assetsCollection.insertOne(assetToInsert)
  assetToInsert._id = result.insertedId
  return assetToInsert
}

const putAsset = async (id, activo, tenantId, adminUser) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("El ID del activo no es válido")
  }

  // Verificar que el usuario tenga permisos para este tenant
  if (adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
    throw new Error("No tienes permisos para actualizar activos en este tenant")
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

  const query = { _id: new ObjectId(id) }
  if (tenantId) {
    query.tenantId = tenantId
  }

  // Preservar la fecha de creación original y el tenantId
  const existingAsset = await getAssetById(id, tenantId)
  const assetToUpdate = {
    nombre: activo.nombre,
    marca: activo.marca,
    modelo: activo.modelo,
    numeroSerie: activo.numeroSerie,
    tenantId: existingAsset.tenantId || tenantId, // Preservar tenantId
    createdBy: existingAsset.createdBy, // Preservar createdBy
    createdAt: existingAsset.createdAt || new Date(),
    updatedAt: new Date(),
    updatedBy: adminUser._id,
    // Convertir templateId a ObjectId si existe
    ...(activo.templateId && { templateId: new ObjectId(activo.templateId) }),
  }

  const result = await assetsCollection.replaceOne(query, assetToUpdate)
  return result
}

const editAsset = async (id, activo, tenantId, adminUser) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("El ID del activo no es válido")
  }

  // Verificar que el usuario tenga permisos para este tenant
  if (adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
    throw new Error("No tienes permisos para actualizar activos en este tenant")
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

  const query = { _id: new ObjectId(id) }
  if (tenantId) {
    query.tenantId = tenantId
  }

  const updateData = {
    ...activo,
    updatedAt: new Date(),
    updatedBy: adminUser._id,
    // Convertir templateId a ObjectId si existe
    ...(activo.templateId && { templateId: new ObjectId(activo.templateId) }),
  }

  const result = await assetsCollection.updateOne(query, { $set: updateData })
  return result
}

const deleteAsset = async (id, tenantId, adminUser) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("El ID del activo no es válido")
  }

  // Verificar que el usuario tenga permisos para este tenant
  if (adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
    throw new Error("No tienes permisos para eliminar activos en este tenant")
  }

  const query = { _id: new ObjectId(id) }
  if (tenantId) {
    query.tenantId = tenantId
  }

  // Opción 1: Eliminación lógica (marcar como eliminado)
  // return assetsCollection.updateOne(
  //   { _id: new ObjectId(id) },
  //   { $set: { eliminado: true, fechaEliminacion: new Date() } }
  // )

  // Opción 2: Eliminación física
  const result = await assetsCollection.deleteOne(query)
  return result
}

// Asignar una plantilla de formulario a un activo
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
        fechaActualizacion: new Date(),
      },
    },
  )

  if (result.modifiedCount === 0) {
    throw new Error("No se pudo asignar la plantilla al activo")
  }

  return {
    message: "Plantilla asignada correctamente al activo",
    assetId,
    templateId,
    templateName: template.nombre,
    templateCategory: template.categoria,
  }
}

// Remover plantilla de un activo
const removeTemplateFromAsset = async (assetId) => {
  if (!ObjectId.isValid(assetId)) {
    throw new Error("El ID del activo no es válido")
  }

  // Verificar que el activo existe
  const asset = await getAssetById(assetId)
  if (!asset) {
    throw new Error("El activo no existe")
  }

  // Remover la referencia a la plantilla
  const result = await assetsCollection.updateOne(
    { _id: new ObjectId(assetId) },
    {
      $unset: { templateId: "" },
      $set: { fechaActualizacion: new Date() },
    },
  )

  if (result.modifiedCount === 0) {
    throw new Error("No se pudo remover la plantilla del activo")
  }

  return {
    message: "Plantilla removida correctamente del activo",
    assetId,
  }
}

// Obtener campos de formulario para un activo específico
const getAssetFormFields = async (assetId) => {
  if (!ObjectId.isValid(assetId)) {
    throw new Error("El ID del activo no es válido")
  }

  const asset = await getAssetById(assetId)
  if (!asset) {
    throw new Error("El activo no existe")
  }

  // El activo siempre debe tener una plantilla asignada
  if (asset.templateId) {
    const template = await formFieldsService.getFormTemplateById(asset.templateId.toString())
    if (template) {
      return {
        source: "template",
        templateId: asset.templateId,
        templateName: template.nombre,
        templateCategory: template.categoria,
        fields: [...formFieldsService.getDefaultFormFields(), ...template.campos],
      }
    }
  }

  // Si por alguna razón no tiene plantilla, devolver campos por defecto
  return {
    source: "default",
    fields: formFieldsService.getDefaultFormFields(),
  }
}

export {
  getAssets,
  getAssetById,
  addAsset,
  putAsset,
  deleteAsset,
  editAsset,
  assignTemplateToAsset,
  removeTemplateFromAsset,
  getAssetFormFields,
}
