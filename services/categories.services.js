import { ObjectId } from "mongodb"
import { client } from "../db.js"

const db = client.db("PanelMantenimiento")
const categoriesCollection = db.collection("categorias")

// Obtener todas las categorías (solo las activas por defecto)
async function getCategories(includeInactive = false, tenantId = null) {
  const filter = includeInactive ? {} : { activa: true }
  
  if (tenantId) {
    filter.tenantId = tenantId
  }
  
  return await categoriesCollection.find(filter).toArray()
}

// Obtener categoría por ID
async function getCategoryById(id, tenantId = null) {
  const query = { _id: new ObjectId(id) }
  
  if (tenantId) {
    query.tenantId = tenantId
  }
  
  return await categoriesCollection.findOne(query)
}

// Obtener categoría por nombre
async function getCategoryByName(nombre, tenantId = null) {
  const query = { nombre: nombre }
  
  if (tenantId) {
    query.tenantId = tenantId
  }
  
  return await categoriesCollection.findOne(query)
}

// Crear nueva categoría
async function addCategory(categoryData, adminUser) {
  try {
    // Verificar que se proporcione tenantId
    if (!categoryData.tenantId) {
      throw new Error("Se requiere tenantId para crear la categoría")
    }

    // Verificar que el usuario tenga permisos para este tenant
    if (adminUser.role !== "super_admin" && adminUser.tenantId !== categoryData.tenantId) {
      throw new Error("No tienes permisos para crear categorías en este tenant")
    }

    const existingCategory = await getCategoryByName(categoryData.nombre, categoryData.tenantId)
    if (existingCategory) {
      throw new Error("Ya existe una categoría con ese nombre")
    }

    const newCategory = {
      ...categoryData,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    }

    const result = await categoriesCollection.insertOne(newCategory)
    return await getCategoryById(result.insertedId, categoryData.tenantId)
  } catch (error) {
    console.error("Error en addCategory:", error)
    throw error
  }
}

// Actualizar categoría
async function updateCategory(id, categoryData, tenantId = null, adminUser = null) {
  try {
    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    // Verificar que el usuario tenga permisos para este tenant
    if (adminUser && adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
      throw new Error("No tienes permisos para actualizar categorías en este tenant")
    }

    if (categoryData.nombre) {
      const existingCategory = await categoriesCollection.findOne({
        nombre: categoryData.nombre,
        _id: { $ne: new ObjectId(id) },
        tenantId: tenantId,
      })
      if (existingCategory) {
        throw new Error("Ya existe otra categoría con ese nombre")
      }
    }

    const updateData = {
      ...categoryData,
      fechaActualizacion: new Date(),
    }

    await categoriesCollection.updateOne(query, { $set: updateData })
    return await getCategoryById(id, tenantId)
  } catch (error) {
    console.error("Error en updateCategory:", error)
    throw error
  }
}

// Desactivar categoría (soft delete)
async function deactivateCategory(id, tenantId = null) {
  try {
    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    await categoriesCollection.updateOne(
      query,
      {
        $set: {
          activa: false,
          fechaActualizacion: new Date(),
        },
      },
    )
    return await getCategoryById(id, tenantId)
  } catch (error) {
    console.error("Error en deactivateCategory:", error)
    throw error
  }
}

// Reactivar categoría
async function activateCategory(id, tenantId = null) {
  try {
    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    await categoriesCollection.updateOne(
      query,
      {
        $set: {
          activa: true,
          fechaActualizacion: new Date(),
        },
      },
    )
    return await getCategoryById(id, tenantId)
  } catch (error) {
    console.error("Error en activateCategory:", error)
    throw error
  }
}

// Eliminar categoría físicamente (usar con cuidado)
async function deleteCategory(id, tenantId = null) {
  try {
    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    return await categoriesCollection.deleteOne(query)
  } catch (error) {
    console.error("Error en deleteCategory:", error)
    throw error
  }
}

export {
  getCategories,
  getCategoryById,
  getCategoryByName,
  addCategory,
  updateCategory,
  deactivateCategory,
  activateCategory,
  deleteCategory,
}
