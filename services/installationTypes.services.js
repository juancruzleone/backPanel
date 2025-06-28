import { db } from "../db.js"
import { ObjectId } from "mongodb"

const installationTypesCollection = db.collection("tiposInstalacion")

async function getInstallationTypes(filter = {}) {
  const filterMongo = { eliminado: { $ne: true } }

  if (filter.activo !== undefined) {
    filterMongo.activo = filter.activo === 'true'
  }

  if (filter.nombre) {
    filterMongo.nombre = { $regex: filter.nombre, $options: "i" }
  }

  return installationTypesCollection.find(filterMongo).sort({ nombre: 1 }).toArray()
}

async function getInstallationTypeById(id) {
  if (!ObjectId.isValid(id)) {
    return null
  }
  return installationTypesCollection.findOne({ _id: new ObjectId(id), eliminado: { $ne: true } })
}

async function getInstallationTypeByName(nombre) {
  return installationTypesCollection.findOne({ 
    nombre: { $regex: `^${nombre}$`, $options: "i" }, 
    eliminado: { $ne: true } 
  })
}

const addInstallationType = async (tipo) => {
  // Verificar si ya existe un tipo con el mismo nombre
  const existingType = await getInstallationTypeByName(tipo.nombre)
  if (existingType) {
    throw new Error("Ya existe un tipo de instalación con ese nombre")
  }

  const typeToInsert = {
    ...tipo,
    fechaCreacion: new Date(),
    activo: tipo.activo !== undefined ? tipo.activo : true
  }

  const result = await installationTypesCollection.insertOne(typeToInsert)
  typeToInsert._id = result.insertedId
  return typeToInsert
}

const updateInstallationType = async (id, tipo) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("El ID del tipo de instalación no es válido")
  }

  // Si se está actualizando el nombre, verificar que no exista otro tipo con ese nombre
  if (tipo.nombre) {
    const existingType = await getInstallationTypeByName(tipo.nombre)
    if (existingType && existingType._id.toString() !== id) {
      throw new Error("Ya existe un tipo de instalación con ese nombre")
    }
  }

  const updateData = {
    ...tipo,
    fechaActualizacion: new Date(),
  }

  const result = await installationTypesCollection.updateOne(
    { _id: new ObjectId(id), eliminado: { $ne: true } }, 
    { $set: updateData }
  )
  
  if (result.matchedCount === 0) {
    throw new Error("Tipo de instalación no encontrado")
  }
  
  return result
}

const deleteInstallationType = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("El ID del tipo de instalación no es válido")
  }
  
  // Eliminación lógica
  const result = await installationTypesCollection.updateOne(
    { _id: new ObjectId(id) }, 
    { $set: { eliminado: true, fechaEliminacion: new Date() } }
  )
  
  if (result.matchedCount === 0) {
    throw new Error("Tipo de instalación no encontrado")
  }
  
  return result
}

export { 
  getInstallationTypes, 
  getInstallationTypeById, 
  getInstallationTypeByName, 
  addInstallationType, 
  updateInstallationType, 
  deleteInstallationType 
}