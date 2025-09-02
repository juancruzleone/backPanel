import { db } from "../db.js"
import { ObjectId } from "mongodb"

const formTemplatesCollection = db.collection("formTemplates")
const formCategoriesCollection = db.collection("formCategories")

// Obtener todas las plantillas de formularios
async function getAllFormTemplates(tenantId = null) {
  try {
    const query = {}
    if (tenantId) {
      query.tenantId = tenantId
    }
    
    const templates = await formTemplatesCollection.find(query).sort({ nombre: 1 }).toArray()
    return templates
  } catch (error) {
    console.error("Error en getAllFormTemplates:", error)
    throw new Error("Error al obtener las plantillas de formularios")
  }
}

// Obtener una plantilla de formulario por ID
async function getFormTemplateById(id, tenantId = null) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("ID de plantilla no válido")
    }

    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    const template = await formTemplatesCollection.findOne(query)
    return template
  } catch (error) {
    console.error("Error en getFormTemplateById:", error)
    throw error
  }
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
async function updateFormTemplate(id, templateData, tenantId = null) {
  try {
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

    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    const result = await formTemplatesCollection.updateOne(query, { $set: updatedTemplate })

    if (result.matchedCount === 0) {
      throw new Error("Plantilla no encontrada")
    }

    return { ...updatedTemplate, _id: new ObjectId(id) }
  } catch (error) {
    console.error("Error en updateFormTemplate:", error)
    throw error
  }
}

// Eliminar una plantilla de formulario
async function deleteFormTemplate(id, tenantId = null) {
  try {
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

    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    const result = await formTemplatesCollection.deleteOne(query)

    if (result.deletedCount === 0) {
      throw new Error("Plantilla no encontrada")
    }

    return { message: "Plantilla eliminada correctamente" }
  } catch (error) {
    console.error("Error en deleteFormTemplate:", error)
    throw error
  }
}

// Obtener plantillas por categoría
async function getFormTemplatesByCategory(categoria, tenantId = null) {
  try {
    const query = { categoria }
    if (tenantId) {
      query.tenantId = tenantId
    }
    
    const templates = await formTemplatesCollection.find(query).sort({ nombre: 1 }).toArray()
    return templates
  } catch (error) {
    console.error("Error en getFormTemplatesByCategory:", error)
    throw new Error("Error al obtener plantillas por categoría")
  }
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
async function getFormFieldsByTemplate(templateId, tenantId = null) {
  // Campos comunes para cualquier tipo de dispositivo
  const commonFields = getDefaultFormFields()

  if (templateId && ObjectId.isValid(templateId)) {
    const template = await getFormTemplateById(templateId, tenantId)
    if (template) {
      return [...commonFields, ...template.campos]
    }
  }

  // Si no hay plantilla, devolver solo los campos comunes
  return commonFields
}

// Obtener campos de formulario según la categoría (función de compatibilidad)
async function getFormFieldsByCategory(categoria, templateId = null, tenantId = null) {
  // Campos comunes para cualquier tipo de dispositivo
  const commonFields = getDefaultFormFields()

  // Si se proporciona un ID de plantilla, usar esa plantilla
  if (templateId && ObjectId.isValid(templateId)) {
    const template = await getFormTemplateById(templateId, tenantId)
    if (template) {
      return [...commonFields, ...template.campos]
    }
  }

  // Si no hay plantilla o no se encontró, buscar plantillas por categoría
  const templates = await getFormTemplatesByCategory(categoria, tenantId)
  if (templates && templates.length > 0) {
    // Usar la primera plantilla encontrada para esta categoría
    return [...commonFields, ...templates[0].campos]
  }

  // Si no hay plantillas para esta categoría, devolver solo los campos comunes
  return commonFields
}

// Funciones para categorías de formularios
async function getAllFormCategories() {
  return formCategoriesCollection.find({ activa: true }).sort({ nombre: 1 }).toArray()
}

async function getFormCategoryById(id) {
  if (!ObjectId.isValid(id)) {
    throw new Error("ID de categoría no válido")
  }
  return formCategoriesCollection.findOne({ _id: new ObjectId(id) })
}

async function createFormCategory(categoryData) {
  const { nombre, descripcion, activa = true } = categoryData

  // Verificar si ya existe una categoría con ese nombre
  const existingCategory = await formCategoriesCollection.findOne({ nombre })
  if (existingCategory) {
    throw new Error("Ya existe una categoría con ese nombre")
  }

  const newCategory = {
    nombre,
    descripcion,
    activa,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const result = await formCategoriesCollection.insertOne(newCategory)
  return { ...newCategory, _id: result.insertedId }
}

async function updateFormCategory(id, categoryData) {
  if (!ObjectId.isValid(id)) {
    throw new Error("ID de categoría no válido")
  }

  const { nombre, descripcion, activa } = categoryData

  // Verificar si ya existe otra categoría con ese nombre
  if (nombre) {
    const existingCategory = await formCategoriesCollection.findOne({
      nombre,
      _id: { $ne: new ObjectId(id) },
    })
    if (existingCategory) {
      throw new Error("Ya existe otra categoría con ese nombre")
    }
  }

  const updateData = {
    ...categoryData,
    updatedAt: new Date(),
  }

  const result = await formCategoriesCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  )

  if (result.matchedCount === 0) {
    throw new Error("Categoría no encontrada")
  }

  return { ...updateData, _id: new ObjectId(id) }
}

async function deleteFormCategory(id) {
  if (!ObjectId.isValid(id)) {
    throw new Error("ID de categoría no válido")
  }

  // Verificar si hay plantillas usando esta categoría
  const templatesUsingCategory = await formTemplatesCollection.countDocuments({
    categoria: id,
  })

  if (templatesUsingCategory > 0) {
    throw new Error("No se puede eliminar la categoría porque hay plantillas que la utilizan")
  }

  const result = await formCategoriesCollection.deleteOne({ _id: new ObjectId(id) })

  if (result.deletedCount === 0) {
    throw new Error("Categoría no encontrada")
  }

  return { message: "Categoría eliminada exitosamente" }
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
  // Nuevas funciones para categorías
  getAllFormCategories,
  getFormCategoryById,
  createFormCategory,
  updateFormCategory,
  deleteFormCategory,
}
