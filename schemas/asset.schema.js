import yup from "yup"

const assetSchemaCreate = yup.object({
  nombre: yup.string().required("El nombre es obligatorio"),
  marca: yup.string().required("La marca es obligatoria"),
  modelo: yup.string().required("El modelo es obligatorio"),
  numeroSerie: yup.string().required("El número de serie es obligatorio"),
  // Campos opcionales que se pueden agregar después
  categoria: yup.string(),
  ubicacion: yup.string(),
  estado: yup
    .string()
    .oneOf(
      ["Activo", "Inactivo", "En mantenimiento", "Fuera de servicio", "Pendiente de revisión"],
      "El estado debe ser válido",
    ),
  templateId: yup.string(),
  fechaAdquisicion: yup.date(),
  fechaUltimoMantenimiento: yup.date(),
  frecuenciaMantenimiento: yup.number(),
  responsable: yup.string(),
  notas: yup.string(),
  especificaciones: yup.object(),
})

const assetSchemaPatch = yup.object({
  nombre: yup.string(),
  marca: yup.string(),
  modelo: yup.string(),
  numeroSerie: yup.string(),
  categoria: yup.string(),
  ubicacion: yup.string(),
  estado: yup
    .string()
    .oneOf(
      ["Activo", "Inactivo", "En mantenimiento", "Fuera de servicio", "Pendiente de revisión"],
      "El estado debe ser válido",
    ),
  templateId: yup.string(),
  fechaAdquisicion: yup.date(),
  fechaUltimoMantenimiento: yup.date(),
  frecuenciaMantenimiento: yup.number(),
  responsable: yup.string(),
  notas: yup.string(),
  especificaciones: yup.object(),
})

export { assetSchemaCreate, assetSchemaPatch }