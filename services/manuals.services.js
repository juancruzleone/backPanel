import { db } from "../db.js"
import { ObjectId } from "mongodb"
import { deleteFromHetzner } from "../middleware/hetzner.upload.middleware.js"

const manualsCollection = db.collection("manuales")

async function getManuals(filter = {}, tenantId = null) {
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

  if (tenantId) {
    filterMongo.tenantId = tenantId
  }

  return manualsCollection.find(filterMongo).sort({ _id: -1 }).toArray()
}

async function getManualById(id, tenantId = null) {
  if (!ObjectId.isValid(id)) {
    return null
  }
  
  const query = { _id: new ObjectId(id) }
  if (tenantId) {
    query.tenantId = tenantId
  }
  
  return manualsCollection.findOne(query)
}

async function getManualsByAssetId(assetId, tenantId = null) {
  if (!ObjectId.isValid(assetId)) {
    return []
  }
  
  const query = {
    assetId: new ObjectId(assetId),
    eliminado: { $ne: true },
  }
  
  if (tenantId) {
    query.tenantId = tenantId
  }
  
  return manualsCollection
    .find(query)
    .sort({ _id: -1 })
    .toArray()
}

// Función para verificar si ya existe un manual de la misma categoría para el activo
async function checkDuplicateManual(assetId, categoria, excludeId = null, tenantId = null) {
  const filter = {
    assetId: new ObjectId(assetId),
    categoria: categoria,
    eliminado: { $ne: true }
  }

  if (tenantId) {
    filter.tenantId = tenantId
  }

  // Si estamos editando, excluir el manual actual
  if (excludeId) {
    filter._id = { $ne: new ObjectId(excludeId) }
  }

  const existingManual = await manualsCollection.findOne(filter)
  return existingManual !== null
}

const addManual = async (manualData, fileData, adminUser) => {
  try {
    // Verificar que se proporcione tenantId
    if (!manualData.tenantId) {
      throw new Error("Se requiere tenantId para crear el manual")
    }

    // Verificar que el usuario tenga permisos para este tenant
    if (adminUser.role !== "super_admin" && adminUser.tenantId !== manualData.tenantId) {
      throw new Error("No tienes permisos para crear manuales en este tenant")
    }

    // Verificar si ya existe un manual de la misma categoría para este activo
    const isDuplicate = await checkDuplicateManual(manualData.assetId, manualData.categoria, null, manualData.tenantId)
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
      tenantId: manualData.tenantId, // Agregar tenantId
      createdBy: manualData.createdBy, // Agregar createdBy
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
  } catch (error) {
    console.error("Error en addManual:", error)
    throw error
  }
}

const putManual = async (id, manualData, fileData = null, tenantId = null, adminUser = null) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("El ID del manual no es válido")
    }

    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    const existingManual = await manualsCollection.findOne(query)
    if (!existingManual) {
      throw new Error("Manual no encontrado")
    }

    // Verificar que el usuario tenga permisos para este tenant
    if (adminUser && adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
      throw new Error("No tienes permisos para actualizar manuales en este tenant")
    }

    // Verificar si ya existe un manual de la misma categoría para este activo (excluyendo el actual)
    const isDuplicate = await checkDuplicateManual(manualData.assetId, manualData.categoria, id, tenantId)
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
          await deleteFromHetzner(existingManual.archivo.publicId)
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

    const result = await manualsCollection.replaceOne(query, manualToUpdate)
    return result
  } catch (error) {
    console.error("Error en putManual:", error)
    throw error
  }
}

const editManual = async (id, manualData, tenantId = null, adminUser = null) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("El ID del manual no es válido")
    }

    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    // Verificar que el usuario tenga permisos para este tenant
    if (adminUser && adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
      throw new Error("No tienes permisos para actualizar manuales en este tenant")
    }

    // Si se está cambiando la categoría o el assetId, verificar duplicados
    if (manualData.categoria || manualData.assetId) {
      const existingManual = await manualsCollection.findOne(query)
      if (!existingManual) {
        throw new Error("Manual no encontrado")
      }

      const newAssetId = manualData.assetId || existingManual.assetId.toString()
      const newCategoria = manualData.categoria || existingManual.categoria

      const isDuplicate = await checkDuplicateManual(newAssetId, newCategoria, id, tenantId)
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

    const result = await manualsCollection.updateOne(query, { $set: updateData })
    return result
  } catch (error) {
    console.error("Error en editManual:", error)
    throw error
  }
}

const deleteManual = async (id, tenantId = null, adminUser = null) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("El ID del manual no es válido")
    }

    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    // Verificar que el usuario tenga permisos para este tenant
    if (adminUser && adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
      throw new Error("No tienes permisos para eliminar manuales en este tenant")
    }

    const manual = await manualsCollection.findOne(query)
    if (!manual) {
      throw new Error("Manual no encontrado")
    }

    // Eliminar archivo de Cloudinary
    if (manual.archivo && manual.archivo.publicId) {
      try {
        await deleteFromHetzner(manual.archivo.publicId)
      } catch (error) {
        console.error("Error al eliminar archivo de Hetzner:", error)
      }
    }

    // Eliminación física del documento
    const result = await manualsCollection.deleteOne(query)
    return result
  } catch (error) {
    console.error("Error en deleteManual:", error)
    throw error
  }
}

// Función para actualizar solo el archivo de un manual
const updateManualFile = async (id, fileData, tenantId = null) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("El ID del manual no es válido")
    }

    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    const existingManual = await manualsCollection.findOne(query)
    if (!existingManual) {
      throw new Error("Manual no encontrado")
    }

    // Eliminar archivo anterior de Cloudinary
    if (existingManual.archivo && existingManual.archivo.publicId) {
      try {
        await deleteFromHetzner(existingManual.archivo.publicId)
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

    const result = await manualsCollection.updateOne(query, { $set: updateData })

    return result
  } catch (error) {
    console.error("Error en updateManualFile:", error)
    throw error
  }
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