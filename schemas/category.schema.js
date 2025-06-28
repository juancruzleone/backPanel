import * as Yup from "yup"

// Schema simplificado - solo requiere nombre
const categorySchema = Yup.object().shape({
  nombre: Yup.string()
    .required("El nombre de la categoría es requerido")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede tener más de 100 caracteres")
    .trim(),
  // Campos opcionales
  descripcion: Yup.string().max(255, "La descripción no puede tener más de 255 caracteres").trim(),
  activa: Yup.boolean(),
})

// Schema para actualizaciones parciales
const categoryPatchSchema = Yup.object().shape({
  nombre: Yup.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede tener más de 100 caracteres")
    .trim(),
  descripcion: Yup.string().max(255, "La descripción no puede tener más de 255 caracteres").trim(),
  activa: Yup.boolean(),
})

export { categorySchema, categoryPatchSchema }
