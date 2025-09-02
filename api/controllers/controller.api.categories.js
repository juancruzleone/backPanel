import * as categoriesService from "../../services/categories.services.js"

// Obtener todas las categorías
async function getCategories(req, res) {
  try {
    const includeInactive = req.query.includeInactive === "true"
    const tenantId = req.user.tenantId
    const categories = await categoriesService.getCategories(includeInactive, tenantId)
    res.json(categories)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Obtener categoría por ID
async function getCategoryById(req, res) {
  try {
    const tenantId = req.user.tenantId
    const category = await categoriesService.getCategoryById(req.params.id, tenantId)
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
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: "No tienes permisos para crear categorías"
      })
    }
    
    // Agregar tenantId a los datos de la categoría
    const categoryData = { ...req.body, tenantId, createdBy: adminUser._id }
    
    const newCategory = await categoriesService.addCategory(categoryData, adminUser)
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
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: "No tienes permisos para actualizar categorías"
      })
    }
    
    const categoryData = { ...req.body, updatedBy: adminUser._id, updatedAt: new Date() }
    
    const updatedCategory = await categoriesService.updateCategory(req.params.id, categoryData, tenantId, adminUser)
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
    const tenantId = req.user.tenantId
    const category = await categoriesService.deactivateCategory(req.params.id, tenantId)
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
    const tenantId = req.user.tenantId
    const category = await categoriesService.activateCategory(req.params.id, tenantId)
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
    const tenantId = req.user.tenantId
    const result = await categoriesService.deleteCategory(req.params.id, tenantId)
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
