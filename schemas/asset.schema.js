import yup from "yup"

const assetSchemaCreate = yup.object({
  nombre: yup.string().required("El nombre es obligatorio"),
  categoria: yup.string().required("La categoría es obligatoria"),
  ubicacion: yup.string().required("La ubicación es obligatoria"),
  estado: yup
    .string()
    .oneOf(
      ["Activo", "Inactivo", "En mantenimiento", "Fuera de servicio", "Pendiente de revisión"],
      "El estado debe ser válido",
    ),
  // Nuevo campo para la plantilla de formulario
  templateId: yup.string(),
  // Campos opcionales para cualquier tipo de activo
  marca: yup.string(),
  modelo: yup.string(),
  numeroSerie: yup.string(),
  fechaAdquisicion: yup.date(),
  fechaUltimoMantenimiento: yup.date(),
  frecuenciaMantenimiento: yup.number(), // en días
  responsable: yup.string(),
  notas: yup.string(),
  especificaciones: yup.object(),
})

const assetSchemaPatch = yup.object({
  nombre: yup.string(),
  categoria: yup.string(),
  ubicacion: yup.string(),
  estado: yup
    .string()
    .oneOf(
      ["Activo", "Inactivo", "En mantenimiento", "Fuera de servicio", "Pendiente de revisión"],
      "El estado debe ser válido",
    ),
  // Nuevo campo para la plantilla de formulario
  templateId: yup.string(),
  marca: yup.string(),
  modelo: yup.string(),
  numeroSerie: yup.string(),
  fechaAdquisicion: yup.date(),
  fechaUltimoMantenimiento: yup.date(),
  frecuenciaMantenimiento: yup.number(),
  responsable: yup.string(),
  notas: yup.string(),
  especificaciones: yup.object(),
})

export { assetSchemaCreate, assetSchemaPatch }