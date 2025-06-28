import { ObjectId } from "mongodb"
import { client } from "../db.js"

const db = client.db("PanelMantenimiento")
const categoriesCollection = db.collection("categorias")

// Obtener todas las categorías (solo las activas por defecto)
async function getCategories(includeInactive = false) {
  const filter = includeInactive ? {} : { activa: true }
  return await categoriesCollection.find(filter).toArray()
}

// Obtener categoría por ID
async function getCategoryById(id) {
  return await categoriesCollection.findOne({ _id: new ObjectId(id) })
}

// Obtener categoría por nombre
async function getCategoryByName(nombre) {
  return await categoriesCollection.findOne({ nombre: nombre })
}

// Crear nueva categoría
async function addCategory(categoryData) {
  const existingCategory = await getCategoryByName(categoryData.nombre)
  if (existingCategory) {
    throw new Error("Ya existe una categoría con ese nombre")
  }

  const newCategory = {
    ...categoryData,
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
  }

  const result = await categoriesCollection.insertOne(newCategory)
  return await getCategoryById(result.insertedId)
}

// Actualizar categoría
async function updateCategory(id, categoryData) {
  if (categoryData.nombre) {
    const existingCategory = await categoriesCollection.findOne({
      nombre: categoryData.nombre,
      _id: { $ne: new ObjectId(id) },
    })
    if (existingCategory) {
      throw new Error("Ya existe otra categoría con ese nombre")
    }
  }

  const updateData = {
    ...categoryData,
    fechaActualizacion: new Date(),
  }

  await categoriesCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData })
  return await getCategoryById(id)
}

// Desactivar categoría (soft delete)
async function deactivateCategory(id) {
  await categoriesCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        activa: false,
        fechaActualizacion: new Date(),
      },
    },
  )
  return await getCategoryById(id)
}

// Reactivar categoría
async function activateCategory(id) {
  await categoriesCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        activa: true,
        fechaActualizacion: new Date(),
      },
    },
  )
  return await getCategoryById(id)
}

// Eliminar categoría físicamente (usar con cuidado)
async function deleteCategory(id) {
  return await categoriesCollection.deleteOne({ _id: new ObjectId(id) })
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
