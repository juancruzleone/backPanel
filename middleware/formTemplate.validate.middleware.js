import { formTemplateSchema, formCategorySchema } from "../schemas/formTemplate.schema.js"

async function validateFormTemplate(req, res, next) {
  try {
    // Intenta validar con Yup
    const template = await formTemplateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true, // Elimina campos desconocidos
    })
    req.body = template
    next()
  } catch (error) {
    // Si falla la validación con Yup, intenta una validación básica
    console.error("Error de validación Yup:", error.message)

    // Validación básica
    const { nombre, categoria, campos } = req.body
    if (!nombre || !categoria || !campos || !Array.isArray(campos) || campos.length === 0) {
      return res.status(400).json({
        error: "Datos de plantilla inválidos",
        details: "La plantilla debe tener nombre, categoría y al menos un campo",
      })
    }

    // Si pasa la validación básica, continúa
    next()
  }
}

// Validación para categorías de formularios
async function validateFormCategory(req, res, next) {
  try {
    const category = await formCategorySchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    })
    req.body = category
    next()
  } catch (error) {
    console.error("Error de validación de categoría:", error.message)
    const errorMessages = error.inner.map(e => e.message)
    res.status(400).json({
      error: "Error de validación de categoría",
      details: errorMessages,
    })
  }
}

export { validateFormTemplate, validateFormCategory }
