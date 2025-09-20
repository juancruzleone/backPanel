import * as Yup from "yup"

// Esquema para validar un campo de formulario
const formFieldSchema = Yup.object().shape({
  name: Yup.string()
    .required("El nombre del campo es obligatorio")
    .matches(/^[a-zA-Z0-9_]+$/, "El nombre del campo solo puede contener letras, números y guiones bajos"),
  type: Yup.string()
    .required("El tipo de campo es obligatorio")
    .oneOf(["text", "textarea", "number", "date", "select", "checkbox", "radio", "file"], "Tipo de campo no válido"),
  label: Yup.string().required("La etiqueta del campo es obligatoria"),
  required: Yup.boolean().default(false),
  // Validación condicional para options
  options: Yup.mixed().when("type", {
    is: (val) => val === "select" || val === "radio",
    then: Yup.array()
      .of(Yup.string())
      .min(1, "Debe proporcionar al menos una opción")
      .required("Las opciones son obligatorias para campos de tipo select o radio"),
    otherwise: Yup.mixed().notRequired(),
  }),
  placeholder: Yup.string().notRequired(),
  defaultValue: Yup.mixed().notRequired(),
  min: Yup.number().notRequired(),
  max: Yup.number().notRequired(),
  step: Yup.number().positive().notRequired(),
  helpText: Yup.string().notRequired(),
})

// Esquema para validar una plantilla de formulario
const formTemplateSchema = Yup.object().shape({
  nombre: Yup.string()
    .required("El nombre de la plantilla es obligatorio")
    .max(100, "El nombre no puede tener más de 100 caracteres"),
  descripcion: Yup.string().max(500, "La descripción no puede tener más de 500 caracteres").notRequired(),
  categoria: Yup.string()
    .required("La categoría es obligatoria")
    .max(50, "La categoría no puede tener más de 50 caracteres"),
  campos: Yup.array()
    .of(formFieldSchema)
    .min(1, "Debe proporcionar al menos un campo")
    .required("Los campos son obligatorios"),
})

// Esquema para categorías de formularios
const formCategorySchema = Yup.object().shape({
  nombre: Yup.string()
    .required("El nombre de la categoría es obligatorio")
    .max(100, "El nombre no puede tener más de 100 caracteres")
    .trim(),
  descripcion: Yup.string()
    .max(500, "La descripción no puede tener más de 500 caracteres")
    .trim()
    .notRequired(),
  activa: Yup.boolean().default(true),
})

export { formTemplateSchema, formFieldSchema, formCategorySchema }
