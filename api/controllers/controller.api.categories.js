import * as categoriesService from "../../services/categories.services.js"

// Obtener todas las categorías
async function getCategories(req, res) {
  try {
    const includeInactive = req.query.includeInactive === "true"
    const categories = await categoriesService.getCategories(includeInactive)
    res.json(categories)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Obtener categoría por ID
async function getCategoryById(req, res) {
  try {
    const category = await categoriesService.getCategoryById(req.params.id)
    if (!category) {
      return res.status(404).json({ error: "Categoría no encontrada" })
    }
    res.json(category)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Crear nueva categoría
async function addCategory(req, res) {
  try {
    const newCategory = await categoriesService.addCategory(req.body)
    res.status(201).json(newCategory)
  } catch (error) {
    if (error.message === "Ya existe una categoría con ese nombre") {
      return res.status(409).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
}

// Actualizar categoría
async function updateCategory(req, res) {
  try {
    const updatedCategory = await categoriesService.updateCategory(req.params.id, req.body)
    if (!updatedCategory) {
      return res.status(404).json({ error: "Categoría no encontrada" })
    }
    res.json(updatedCategory)
  } catch (error) {
    if (error.message === "Ya existe otra categoría con ese nombre") {
      return res.status(409).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
}

// Desactivar categoría
async function deactivateCategory(req, res) {
  try {
    const category = await categoriesService.deactivateCategory(req.params.id)
    if (!category) {
      return res.status(404).json({ error: "Categoría no encontrada" })
    }
    res.json({ message: "Categoría desactivada exitosamente", category })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Reactivar categoría
async function activateCategory(req, res) {
  try {
    const category = await categoriesService.activateCategory(req.params.id)
    if (!category) {
      return res.status(404).json({ error: "Categoría no encontrada" })
    }
    res.json({ message: "Categoría reactivada exitosamente", category })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Eliminar categoría físicamente
async function deleteCategory(req, res) {
  try {
    const result = await categoriesService.deleteCategory(req.params.id)
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Categoría no encontrada" })
    }
    res.json({ message: "Categoría eliminada exitosamente" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export {
  getCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deactivateCategory,
  activateCategory,
  deleteCategory,
}
