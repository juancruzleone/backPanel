import { db } from "../db.js"
import { ObjectId } from "mongodb"
import { deleteFromCloudinary } from "../middleware/upload.middleware.js"

const manualsCollection = db.collection("manuales")

async function getManuals(filter = {}) {
  const filterMongo = { eliminado: { $ne: true } }

  if (filter.assetId) {
    if (ObjectId.isValid(filter.assetId)) {
      filterMongo.assetId = new ObjectId(filter.assetId)
    }
  }

  if (filter.categoria) {
    filterMongo.categoria = filter.categoria
  }

  if (filter.idioma) {
    filterMongo.idioma = filter.idioma
  }

  if (filter.nombre) {
    filterMongo.nombre = { $regex: filter.nombre, $options: "i" }
  }

  if (filter.autor) {
    filterMongo.autor = { $regex: filter.autor, $options: "i" }
  }

  if (filter.tags) {
    filterMongo.tags = { $in: [filter.tags] }
  }

  return manualsCollection.find(filterMongo).sort({ _id: -1 }).toArray()
}

async function getManualById(id) {
  if (!ObjectId.isValid(id)) {
    return null
  }
  return manualsCollection.findOne({ _id: new ObjectId(id) })
}

async function getManualsByAssetId(assetId) {
  if (!ObjectId.isValid(assetId)) {
    return []
  }
  return manualsCollection
    .find({
      assetId: new ObjectId(assetId),
      eliminado: { $ne: true },
    })
    .sort({ _id: -1 })
    .toArray()
}

// Función para verificar si ya existe un manual de la misma categoría para el activo
async function checkDuplicateManual(assetId, categoria, excludeId = null) {
  const filter = {
    assetId: new ObjectId(assetId),
    categoria: categoria,
    eliminado: { $ne: true }
  }

  // Si estamos editando, excluir el manual actual
  if (excludeId) {
    filter._id = { $ne: new ObjectId(excludeId) }
  }

  const existingManual = await manualsCollection.findOne(filter)
  return existingManual !== null
}

const addManual = async (manualData, fileData) => {
  // Verificar si ya existe un manual de la misma categoría para este activo
  const isDuplicate = await checkDuplicateManual(manualData.assetId, manualData.categoria)
  if (isDuplicate) {
    throw new Error(`Ya existe un manual de la categoría "${manualData.categoria}" para este activo`)
  }

  const manualToInsert = {
    nombre: manualData.nombre,
    descripcion: manualData.descripcion || "",
    version: manualData.version || "1.0",
    assetId: new ObjectId(manualData.assetId),
    categoria: manualData.categoria || "Otros",
    idioma: manualData.idioma || "es",
    autor: manualData.autor || "",
    tags: Array.isArray(manualData.tags) ? manualData.tags : manualData.tags ? [manualData.tags] : [],
    // Datos del archivo
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

  const result = await manualsCollection.insertOne(manualToInsert)
  manualToInsert._id = result.insertedId
  return manualToInsert
}

const putManual = async (id, manualData, fileData = null) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("El ID del manual no es válido")
  }

  const existingManual = await getManualById(id)
  if (!existingManual) {
    throw new Error("Manual no encontrado")
  }

  // Verificar si ya existe un manual de la misma categoría para este activo (excluyendo el actual)
  const isDuplicate = await checkDuplicateManual(manualData.assetId, manualData.categoria, id)
  if (isDuplicate) {
    throw new Error(`Ya existe un manual de la categoría "${manualData.categoria}" para este activo`)
  }

  const manualToUpdate = {
    nombre: manualData.nombre,
    descripcion: manualData.descripcion || "",
    version: manualData.version || "1.0",
    assetId: new ObjectId(manualData.assetId),
    categoria: manualData.categoria || "Otros",
    idioma: manualData.idioma || "es",
    autor: manualData.autor || "",
    tags: Array.isArray(manualData.tags) ? manualData.tags : manualData.tags ? [manualData.tags] : [],
    fechaCreacion: existingManual.fechaCreacion || new Date(),
    fechaActualizacion: new Date(),
  }

  // Si se subió un nuevo archivo, eliminar el anterior y usar el nuevo
  if (fileData) {
    // Eliminar archivo anterior de Cloudinary
    if (existingManual.archivo && existingManual.archivo.publicId) {
      try {
        await deleteFromCloudinary(existingManual.archivo.publicId)
      } catch (error) {
        console.error("Error al eliminar archivo anterior:", error)
      }
    }

    manualToUpdate.archivo = {
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
    manualToUpdate.archivo = existingManual.archivo
  }

  const result = await manualsCollection.replaceOne({ _id: new ObjectId(id) }, manualToUpdate)
  return result
}

const editManual = async (id, manualData) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("El ID del manual no es válido")
  }

  // Si se está cambiando la categoría o el assetId, verificar duplicados
  if (manualData.categoria || manualData.assetId) {
    const existingManual = await getManualById(id)
    if (!existingManual) {
      throw new Error("Manual no encontrado")
    }

    const newAssetId = manualData.assetId || existingManual.assetId.toString()
    const newCategoria = manualData.categoria || existingManual.categoria

    const isDuplicate = await checkDuplicateManual(newAssetId, newCategoria, id)
    if (isDuplicate) {
      throw new Error(`Ya existe un manual de la categoría "${newCategoria}" para este activo`)
    }
  }

  const updateData = {
    ...manualData,
    fechaActualizacion: new Date(),
  }

  // Convertir assetId a ObjectId si se proporciona
  if (manualData.assetId) {
    updateData.assetId = new ObjectId(manualData.assetId)
  }

  // Manejar tags como array
  if (manualData.tags) {
    updateData.tags = Array.isArray(manualData.tags) ? manualData.tags : [manualData.tags]
  }

  const result = await manualsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData })
  return result
}

const deleteManual = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("El ID del manual no es válido")
  }

  const manual = await getManualById(id)
  if (!manual) {
    throw new Error("Manual no encontrado")
  }

  // Eliminar archivo de Cloudinary
  if (manual.archivo && manual.archivo.publicId) {
    try {
      await deleteFromCloudinary(manual.archivo.publicId)
    } catch (error) {
      console.error("Error al eliminar archivo de Cloudinary:", error)
    }
  }

  // Eliminación física del documento
  const result = await manualsCollection.deleteOne({ _id: new ObjectId(id) })
  return result
}

// Función para actualizar solo el archivo de un manual
const updateManualFile = async (id, fileData) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("El ID del manual no es válido")
  }

  const existingManual = await getManualById(id)
  if (!existingManual) {
    throw new Error("Manual no encontrado")
  }

  // Eliminar archivo anterior de Cloudinary
  if (existingManual.archivo && existingManual.archivo.publicId) {
    try {
      await deleteFromCloudinary(existingManual.archivo.publicId)
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

  const result = await manualsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData })

  return result
}

export {
  getManuals,
  getManualById,
  getManualsByAssetId,
  addManual,
  putManual,
  editManual,
  deleteManual,
  updateManualFile,
  checkDuplicateManual,
}