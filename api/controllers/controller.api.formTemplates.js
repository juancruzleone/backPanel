import * as service from "../../services/formFields.services.js"

// Obtener todas las plantillas de formularios
async function getAllFormTemplates(req, res) {
  try {
    const templates = await service.getAllFormTemplates()
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
    const template = await service.getFormTemplateById(id)
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

    // Validación manual
    const validationErrors = validateFormTemplateData(templateData)
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Error de validación",
        details: validationErrors,
      })
    }

    const newTemplate = await service.createFormTemplate(templateData)
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

    // Validación manual
    const validationErrors = validateFormTemplateData(templateData)
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Error de validación",
        details: validationErrors,
      })
    }

    const updatedTemplate = await service.updateFormTemplate(id, templateData)
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
    await service.deleteFormTemplate(id)
    res.status(204).send()
  } catch (error) {
    console.error("Error al eliminar plantilla:", error)
    res.status(400).json({ error: error.message || "Error al eliminar la plantilla" })
  }
}

// Obtener plantillas por categoría
async function getFormTemplatesByCategory(req, res) {
  try {
    const { categoria } = req.params
    const templates = await service.getFormTemplatesByCategory(categoria)
    res.status(200).json(templates)
  } catch (error) {
    console.error("Error al obtener plantillas por categoría:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
}

export {
  getAllFormTemplates,
  getFormTemplateById,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
  getFormTemplatesByCategory,
}
