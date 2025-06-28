import * as Yup from "yup"

const installationSchema = Yup.object().shape({
  company: Yup.string()
    .required("La compañía es un campo requerido")
    .max(100, "El nombre de la compañía no puede tener más de 100 caracteres"),
  address: Yup.string()
    .required("La dirección es un campo requerido")
    .max(255, "La dirección no puede tener más de 255 caracteres"),
  floorSector: Yup.string().max(100, "El sector o piso no puede tener más de 100 caracteres"),
  postalCode: Yup.string().max(10, "El código postal no puede tener más de 10 caracteres"),
  city: Yup.string()
    .required("La ciudad es un campo requerido")
    .max(100, "La ciudad no puede tener más de 100 caracteres"),
  province: Yup.string()
    .required("La provincia es un campo requerido")
    .max(100, "La provincia no puede tener más de 100 caracteres"),
  installationType: Yup.string()
    .required("El tipo de instalación es un campo requerido")
    .max(100, "El tipo de instalación no puede tener más de 100 caracteres"),
})

const deviceSchema = Yup.object().shape({
  nombre: Yup.string()
    .required("El nombre del dispositivo es un campo requerido")
    .min(1, "El nombre debe tener al menos 1 carácter")
    .max(100, "El nombre no puede tener más de 100 caracteres"),
  ubicacion: Yup.string()
    .required("La ubicación del dispositivo es un campo requerido")
    .min(1, "La ubicación debe tener al menos 1 carácter")
    .max(255, "La ubicación no puede tener más de 255 caracteres"),
  categoria: Yup.string()
    .required("La categoría del dispositivo es un campo requerido")
    .max(100, "La categoría no puede tener más de 100 caracteres"),
  templateId: Yup.string().nullable(), // ID de la plantilla de formulario
  estado: Yup.string().oneOf(
    ["Activo", "Inactivo", "En mantenimiento", "Fuera de servicio", "Pendiente de revisión"],
    "El estado debe ser válido",
  ),
  marca: Yup.string(),
  modelo: Yup.string(),
  numeroSerie: Yup.string(),
})

// Actualizar el esquema de mantenimiento para NO requerir datos de responsable
const maintenanceSchema = Yup.object().shape({
  // Campos existentes para el mantenimiento
  estado: Yup.string().oneOf(
    ["Activo", "Inactivo", "En mantenimiento", "Fuera de servicio", "Pendiente de revisión"],
    "El estado debe ser válido"
  ),
  // Campos de fecha y hora (ahora opcionales en la validación)
  // ya que se generarán automáticamente en el servidor
  fechaRevision: Yup.string(),
  horaRevision: Yup.string()
})

export { installationSchema, deviceSchema, maintenanceSchema }