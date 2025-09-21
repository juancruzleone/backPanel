import * as service from "../../services/formFields.services.js"

// Obtener todas las plantillas de formularios
async function getAllFormTemplates(req, res) {
  try {
    const tenantId = req.user.tenantId
    const templates = await service.getAllFormTemplates(tenantId)
    res.status(200).json(templates)
  } catch (error) {
    console.error("Error al obtener plantillas:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
}

// Obtener una plantilla de formulario por ID
async function getFormTemplateById(req, res) {
  try {
    const { id } = req.params
    const tenantId = req.user.tenantId
    const template = await service.getFormTemplateById(id, tenantId)
    if (!template) {
      return res.status(404).json({ error: "Plantilla no encontrada" })
    }
    res.status(200).json(template)
  } catch (error) {
    console.error("Error al obtener plantilla:", error)
    res.status(500).json({ error: error.message || "Error interno del servidor" })
  }
}

// Función de validación manual
function validateFormTemplateData(templateData) {
  const errors = []

  // Validar campos obligatorios
  if (!templateData.nombre) {
    errors.push("El nombre de la plantilla es obligatorio")
  }
  if (!templateData.categoria) {
    errors.push("La categoría es obligatoria")
  }
  if (!templateData.campos || !Array.isArray(templateData.campos) || templateData.campos.length === 0) {
    errors.push("Debe proporcionar al menos un campo")
    return errors
  }

  // Validar cada campo
  templateData.campos.forEach((campo, index) => {
    if (!campo.name) {
      errors.push(`El campo ${index + 1} debe tener un nombre`)
    }
    if (!campo.type) {
      errors.push(`El campo ${index + 1} debe tener un tipo`)
    } else if (!["text", "textarea", "number", "date", "select", "checkbox", "radio", "file"].includes(campo.type)) {
      errors.push(`El tipo "${campo.type}" del campo ${index + 1} no es válido`)
    }
    if (!campo.label) {
      errors.push(`El campo ${index + 1} debe tener una etiqueta`)
    }

    // Validar opciones para tipos select y radio
    if (
      (campo.type === "select" || campo.type === "radio") &&
      (!campo.options || !Array.isArray(campo.options) || campo.options.length === 0)
    ) {
      errors.push(`El campo ${index + 1} (${campo.label || campo.name}) debe tener opciones`)
    }
  })

  return errors
}

// Crear una nueva plantilla de formulario
async function createFormTemplate(req, res) {
  try {
    const templateData = req.body
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: "No tienes permisos para crear plantillas"
      })
    }

    // Validación manual
    const validationErrors = validateFormTemplateData(templateData)
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Error de validación",
        details: validationErrors,
      })
    }

    // Agregar tenantId a los datos de la plantilla
    templateData.tenantId = tenantId
    templateData.createdBy = adminUser._id

    const newTemplate = await service.createFormTemplate(templateData, adminUser)
    res.status(201).json(newTemplate)
  } catch (error) {
    console.error("Error al crear plantilla:", error)
    res.status(400).json({
      error: error.message || "Error al crear la plantilla",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}

// Actualizar una plantilla de formulario
async function updateFormTemplate(req, res) {
  try {
    const { id } = req.params
    const templateData = req.body
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: "No tienes permisos para actualizar plantillas"
      })
    }

    // Validación manual
    const validationErrors = validateFormTemplateData(templateData)
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Error de validación",
        details: validationErrors,
      })
    }

    const updatedTemplate = await service.updateFormTemplate(id, templateData, tenantId, adminUser)
    res.status(200).json(updatedTemplate)
  } catch (error) {
    console.error("Error al actualizar plantilla:", error)
    res.status(400).json({ error: error.message || "Error al actualizar la plantilla" })
  }
}

// Eliminar una plantilla de formulario
async function deleteFormTemplate(req, res) {
  try {
    const { id } = req.params
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: "No tienes permisos para eliminar plantillas"
      })
    }
    
    await service.deleteFormTemplate(id, tenantId, adminUser)
    res.status(200).json({ message: "Plantilla eliminada exitosamente" })
  } catch (error) {
    console.error("Error al eliminar plantilla:", error)
    res.status(400).json({ error: error.message || "Error al eliminar la plantilla" })
  }
}

// Obtener plantillas por categoría
async function getFormTemplatesByCategory(req, res) {
  try {
    const { categoria } = req.params
    const tenantId = req.user.tenantId
    const templates = await service.getFormTemplatesByCategory(categoria, tenantId)
    res.status(200).json(templates)
  } catch (error) {
    console.error("Error al obtener plantillas por categoría:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
}

// Controladores para categorías de formularios
async function getAllFormCategories(req, res) {
  try {
    console.log('🔍 [DEBUG] getAllFormCategories - Headers recibidos:', req.headers)
    console.log('🔍 [DEBUG] getAllFormCategories - Usuario autenticado:', req.user ? {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      tenantId: req.user.tenantId
    } : 'No autenticado')
    
    // Obtener tenantId del usuario autenticado
    const tenantId = req.user?.tenantId
    
    const categories = await service.getAllFormCategories(tenantId)
    console.log('🔍 [DEBUG] getAllFormCategories - Categorías encontradas:', categories.length)
    
    // Devolver directamente el array para que el frontend pueda usar .filter()
    res.status(200).json(categories)
  } catch (error) {
    console.error("Error al obtener categorías:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
}

async function getFormCategoryById(req, res) {
  try {
    const { id } = req.params
    const category = await service.getFormCategoryById(id)
    
    if (!category) {
      return res.status(404).json({ error: "Categoría no encontrada" })
    }
    
    res.status(200).json(category)
  } catch (error) {
    console.error("Error al obtener categoría:", error)
    res.status(400).json({ error: error.message || "Error al obtener la categoría" })
  }
}

async function createFormCategory(req, res) {
  try {
    console.log('🔍 [DEBUG] createFormCategory - Headers recibidos:', req.headers)
    console.log('🔍 [DEBUG] createFormCategory - Usuario autenticado:', req.user ? {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      tenantId: req.user.tenantId
    } : 'No autenticado')
    console.log('🔍 [DEBUG] createFormCategory - Datos recibidos:', req.body)
    
    const categoryData = req.body
    const adminUser = req.user
    
    // Verificar que el usuario sea admin
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: "No tienes permisos para crear categorías"
      })
    }
    
    // Validar datos requeridos
    if (!categoryData.nombre || categoryData.nombre.trim() === "") {
      return res.status(400).json({
        error: "El nombre de la categoría es obligatorio"
      })
    }
    
    // Obtener tenantId del usuario autenticado
    const tenantId = adminUser.tenantId
    
    console.log("Creando categoría con datos:", categoryData)
    console.log("TenantId del usuario:", tenantId)
    
    const newCategory = await service.createFormCategory(categoryData, tenantId)
    
    res.status(201).json(newCategory)
  } catch (error) {
    console.error("Error al crear categoría:", error)
    if (error.message === "Ya existe una categoría con ese nombre") {
      return res.status(409).json({ error: error.message })
    }
    res.status(400).json({ error: error.message || "Error al crear la categoría" })
  }
}

async function updateFormCategory(req, res) {
  try {
    const { id } = req.params
    const categoryData = req.body
    const updatedCategory = await service.updateFormCategory(id, categoryData)
    
    res.status(200).json({
      message: "Categoría actualizada exitosamente",
      category: updatedCategory,
    })
  } catch (error) {
    console.error("Error al actualizar categoría:", error)
    res.status(400).json({ error: error.message || "Error al actualizar la categoría" })
  }
}

async function deleteFormCategory(req, res) {
  try {
    const { id } = req.params
    const result = await service.deleteFormCategory(id)
    
    res.status(200).json(result)
  } catch (error) {
    console.error("Error al eliminar categoría:", error)
    res.status(400).json({ error: error.message || "Error al eliminar la categoría" })
  }
}

export {
  getAllFormTemplates,
  getFormTemplateById,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
  getFormTemplatesByCategory,
  // Nuevos controladores para categorías
  getAllFormCategories,
  getFormCategoryById,
  createFormCategory,
  updateFormCategory,
  deleteFormCategory,
}
