import yup from "yup"

const assetSchemaCreate = yup.object({
  nombre: yup.string().required("El nombre es obligatorio"),
  templateId: yup.string().required("La plantilla de formulario es obligatoria"),
})

const assetSchemaPatch = yup.object({
  nombre: yup.string(),
  templateId: yup.string(),
})

export { assetSchemaCreate, assetSchemaPatch }
