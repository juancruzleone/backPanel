import { db } from "../db.js"
import { ObjectId } from "mongodb"

const formTemplatesCollection = db.collection("formTemplates")

// Obtener todas las plantillas de formularios
async function getAllFormTemplates() {
  return formTemplatesCollection.find().sort({ nombre: 1 }).toArray()
}

// Obtener una plantilla de formulario por ID
async function getFormTemplateById(id) {
  if (!ObjectId.isValid(id)) {
    throw new Error("ID de plantilla no válido")
  }
  return formTemplatesCollection.findOne({ _id: new ObjectId(id) })
}

// Crear una nueva plantilla de formulario
async function createFormTemplate(templateData) {
  const { nombre, descripcion, categoria, campos } = templateData

  // Validar que los campos tengan la estructura correcta
  if (!Array.isArray(campos) || campos.length === 0) {
    throw new Error("La plantilla debe contener al menos un campo")
  }

  for (const campo of campos) {
    if (!campo.name || !campo.type || !campo.label) {
      throw new Error("Todos los campos deben tener nombre, tipo y etiqueta")
    }

    // Validar que los campos de tipo select y radio tengan opciones
    if (
      (campo.type === "select" || campo.type === "radio") &&
      (!Array.isArray(campo.options) || campo.options.length === 0)
    ) {
      throw new Error(`El campo ${campo.label} es de tipo ${campo.type} pero no tiene opciones`)
    }
  }

  const newTemplate = {
    nombre,
    descripcion,
    categoria,
    campos,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const result = await formTemplatesCollection.insertOne(newTemplate)
  return { ...newTemplate, _id: result.insertedId }
}

// Actualizar una plantilla de formulario
async function updateFormTemplate(id, templateData) {
  if (!ObjectId.isValid(id)) {
    throw new Error("ID de plantilla no válido")
  }

  const { nombre, descripcion, categoria, campos } = templateData

  // Validar que los campos tengan la estructura correcta
  if (!Array.isArray(campos) || campos.length === 0) {
    throw new Error("La plantilla debe contener al menos un campo")
  }

  for (const campo of campos) {
    if (!campo.name || !campo.type || !campo.label) {
      throw new Error("Todos los campos deben tener nombre, tipo y etiqueta")
    }

    // Validar que los campos de tipo select y radio tengan opciones
    if (
      (campo.type === "select" || campo.type === "radio") &&
      (!Array.isArray(campo.options) || campo.options.length === 0)
    ) {
      throw new Error(`El campo ${campo.label} es de tipo ${campo.type} pero no tiene opciones`)
    }
  }

  const updatedTemplate = {
    nombre,
    descripcion,
    categoria,
    campos,
    updatedAt: new Date(),
  }

  const result = await formTemplatesCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedTemplate })

  if (result.matchedCount === 0) {
    throw new Error("Plantilla no encontrada")
  }

  return { ...updatedTemplate, _id: new ObjectId(id) }
}

// Eliminar una plantilla de formulario
async function deleteFormTemplate(id) {
  if (!ObjectId.isValid(id)) {
    throw new Error("ID de plantilla no válido")
  }

  // Verificar si la plantilla está siendo usada por algún activo
  const assetsCollection = db.collection("activos")
  const assetsUsingTemplate = await assetsCollection.countDocuments({
    templateId: new ObjectId(id),
  })

  if (assetsUsingTemplate > 0) {
    throw new Error(`No se puede eliminar la plantilla porque está siendo usada por ${assetsUsingTemplate} activo(s)`)
  }

  const result = await formTemplatesCollection.deleteOne({ _id: new ObjectId(id) })

  if (result.deletedCount === 0) {
    throw new Error("Plantilla no encontrada")
  }

  return { message: "Plantilla eliminada correctamente" }
}

// Obtener plantillas por categoría
async function getFormTemplatesByCategory(categoria) {
  return formTemplatesCollection.find({ categoria }).sort({ nombre: 1 }).toArray()
}

// Campos predeterminados para cualquier tipo de mantenimiento
function getDefaultFormFields() {
  return [
    {
      name: "estado_revision",
      type: "select",
      options: ["Operativo", "No operativo", "Requiere mantenimiento"],
      label: "Estado de la revisión",
      required: true,
    },
    {
      name: "fecha_revision",
      type: "date",
      label: "Fecha de revisión",
      required: true,
    },
    {
      name: "observaciones_generales",
      type: "textarea",
      label: "Observaciones generales",
      required: false,
    },
  ]
}

// Obtener campos de formulario según la plantilla
async function getFormFieldsByTemplate(templateId) {
  // Campos comunes para cualquier tipo de dispositivo
  const commonFields = getDefaultFormFields()

  if (templateId && ObjectId.isValid(templateId)) {
    const template = await getFormTemplateById(templateId)
    if (template) {
      return [...commonFields, ...template.campos]
    }
  }

  // Si no hay plantilla, devolver solo los campos comunes
  return commonFields
}

// Obtener campos de formulario según la categoría (función de compatibilidad)
async function getFormFieldsByCategory(categoria, templateId = null) {
  // Campos comunes para cualquier tipo de dispositivo
  const commonFields = getDefaultFormFields()

  // Si se proporciona un ID de plantilla, usar esa plantilla
  if (templateId && ObjectId.isValid(templateId)) {
    const template = await getFormTemplateById(templateId)
    if (template) {
      return [...commonFields, ...template.campos]
    }
  }

  // Si no hay plantilla o no se encontró, buscar plantillas por categoría
  const templates = await getFormTemplatesByCategory(categoria)
  if (templates && templates.length > 0) {
    // Usar la primera plantilla encontrada para esta categoría
    return [...commonFields, ...templates[0].campos]
  }

  // Si no hay plantillas para esta categoría, devolver solo los campos comunes
  return commonFields
}

export {
  getAllFormTemplates,
  getFormTemplateById,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
  getFormTemplatesByCategory,
  getFormFieldsByTemplate,
  getFormFieldsByCategory, // Función de compatibilidad
  getDefaultFormFields,
}
