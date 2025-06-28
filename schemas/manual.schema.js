import yup from "yup"

const manualSchemaCreate = yup.object({
  nombre: yup.string().required("El nombre del manual es obligatorio"),
  descripcion: yup.string(),
  version: yup.string(),
  fechaCreacion: yup.date(),
  assetId: yup.string().required("El ID del activo es obligatorio"),
  categoria: yup
    .string()
    .oneOf(
      ["Manual de usuario", "Manual técnico", "Manual de mantenimiento", "Guía de instalación", "Otros"],
      "La categoría debe ser válida",
    ),
  idioma: yup.string().default("es"),
  autor: yup.string(),
  tags: yup.array().of(yup.string()),
})

const manualSchemaPatch = yup.object({
  nombre: yup.string(),
  descripcion: yup.string(),
  version: yup.string(),
  assetId: yup.string(),
  categoria: yup
    .string()
    .oneOf(
      ["Manual de usuario", "Manual técnico", "Manual de mantenimiento", "Guía de instalación", "Otros"],
      "La categoría debe ser válida",
    ),
  idioma: yup.string(),
  autor: yup.string(),
  tags: yup.array().of(yup.string()),
})

export { manualSchemaCreate, manualSchemaPatch }
