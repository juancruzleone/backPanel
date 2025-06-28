import yup from "yup"

const installationTypeSchemaCreate = yup.object({
  nombre: yup.string()
    .required("El nombre del tipo de instalación es obligatorio")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede tener más de 50 caracteres"),
  descripcion: yup.string()
    .max(200, "La descripción no puede tener más de 200 caracteres"),
  activo: yup.boolean().default(true)
})

const installationTypeSchemaPatch = yup.object({
  nombre: yup.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede tener más de 50 caracteres"),
  descripcion: yup.string()
    .max(200, "La descripción no puede tener más de 200 caracteres"),
  activo: yup.boolean()
})

export { installationTypeSchemaCreate, installationTypeSchemaPatch }