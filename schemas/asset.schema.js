import yup from "yup"

const assetSchemaCreate = yup.object({
  nombre: yup.string().required("El nombre es obligatorio"),
  templateId: yup.string().required("La plantilla de formulario es obligatoria"),
  marca: yup.string().optional(),
  modelo: yup.string().optional(),
  numeroSerie: yup.string().optional(),
})

const assetSchemaPatch = yup.object({
  nombre: yup.string(),
  templateId: yup.string(),
  marca: yup.string().optional(),
  modelo: yup.string().optional(),
  numeroSerie: yup.string().optional(),
})

export { assetSchemaCreate, assetSchemaPatch }
