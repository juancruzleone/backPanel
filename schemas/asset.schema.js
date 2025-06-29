import yup from "yup"

const assetSchemaCreate = yup.object({
  nombre: yup.string().required("El nombre es obligatorio"),
  marca: yup.string().required("La marca es obligatoria"),
  modelo: yup.string().required("El modelo es obligatorio"),
  numeroSerie: yup.string().required("El número de serie es obligatorio"),
  templateId: yup.string().required("La plantilla de formulario es obligatoria"),
  // Campo opcional para el estado
  estado: yup
    .string()
    .oneOf(
      ["Activo", "Inactivo", "En mantenimiento", "Fuera de servicio", "Pendiente de revisión"],
      "El estado debe ser válido",
    ),
})

const assetSchemaPatch = yup.object({
  nombre: yup.string(),
  marca: yup.string(),
  modelo: yup.string(),
  numeroSerie: yup.string(),
  templateId: yup.string(),
  estado: yup
    .string()
    .oneOf(
      ["Activo", "Inactivo", "En mantenimiento", "Fuera de servicio", "Pendiente de revisión"],
      "El estado debe ser válido",
    ),
})

export { assetSchemaCreate, assetSchemaPatch }
