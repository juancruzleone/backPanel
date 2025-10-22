import * as yup from "yup"

// Esquema para actualizar perfil de usuario
const updateProfile = yup.object({
  userName: yup
    .string()
    .trim()
    .min(4, "El nombre de usuario debe tener al menos 4 caracteres")
    .max(50, "El nombre de usuario no puede tener más de 50 caracteres")
    .matches(/^[a-zA-Z0-9_]+$/, "El nombre de usuario solo puede contener letras, números y guiones bajos")
    .optional(),

  name: yup
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede tener más de 100 caracteres")
    .optional(),

  firstName: yup
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede tener más de 50 caracteres")
    .optional(),

  lastName: yup
    .string()
    .trim()
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(50, "El apellido no puede tener más de 50 caracteres")
    .optional(),

  email: yup
    .string()
    .trim()
    .email("Debe ser un email válido")
    .max(255, "El email no puede tener más de 255 caracteres")
    .optional(),
})

// Esquema para actualizar contraseña
const updatePassword = yup.object({
  currentPassword: yup
    .string()
    .required("La contraseña actual es obligatoria"),

  newPassword: yup
    .string()
    .required("La nueva contraseña es obligatoria")
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100, "La contraseña no puede tener más de 100 caracteres"),
})

// Esquema para actualizar técnico por admin
const updateTechnician = yup.object({
  userName: yup
    .string()
    .trim()
    .min(6, "El nombre de usuario debe tener al menos 6 caracteres")
    .max(50, "El nombre de usuario no puede tener más de 50 caracteres")
    .matches(/^[a-zA-Z0-9_]+$/, "El nombre de usuario solo puede contener letras, números y guiones bajos")
    .optional(),

  name: yup
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede tener más de 100 caracteres")
    .optional(),

  email: yup
    .string()
    .trim()
    .email("Debe ser un email válido")
    .max(255, "El email no puede tener más de 255 caracteres")
    .optional(),

  password: yup
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100, "La contraseña no puede tener más de 100 caracteres")
    .optional(),
})

// Esquema para actualizar datos de facturación del tenant
const updateBillingInfo = yup.object({
  email: yup
    .string()
    .trim()
    .email("Debe ser un email válido")
    .max(255, "El email no puede tener más de 255 caracteres")
    .optional(),

  address: yup
    .string()
    .trim()
    .max(255, "La dirección no puede tener más de 255 caracteres")
    .optional(),

  name: yup
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede tener más de 100 caracteres")
    .optional(),

  // Campos para Argentina
  razonSocial: yup
    .string()
    .trim()
    .max(255, "La razón social no puede tener más de 255 caracteres")
    .optional(),

  tipoDocumento: yup
    .string()
    .oneOf(['CUIT', 'CUIL', 'DNI'], 'Tipo de documento inválido')
    .optional(),

  numeroDocumento: yup
    .string()
    .trim()
    .max(50, "El número de documento no puede tener más de 50 caracteres")
    .optional(),

  condicionIVA: yup
    .string()
    .oneOf(['Consumidor Final', 'Responsable Inscripto', 'Exento', 'Monotributista'], 'Condición de IVA inválida')
    .optional(),

  direccionFiscal: yup
    .string()
    .trim()
    .max(255, "La dirección fiscal no puede tener más de 255 caracteres")
    .optional(),

  ciudad: yup
    .string()
    .trim()
    .max(100, "La ciudad no puede tener más de 100 caracteres")
    .optional(),

  provincia: yup
    .string()
    .trim()
    .max(100, "La provincia no puede tener más de 100 caracteres")
    .optional(),

  codigoPostal: yup
    .string()
    .trim()
    .max(20, "El código postal no puede tener más de 20 caracteres")
    .optional(),

  // Campos internacionales
  taxIdType: yup
    .string()
    .trim()
    .max(50, "El tipo de identificación fiscal no puede tener más de 50 caracteres")
    .optional(),

  taxIdNumber: yup
    .string()
    .trim()
    .max(100, "El número de identificación fiscal no puede tener más de 100 caracteres")
    .optional(),

  addressIntl: yup
    .string()
    .trim()
    .max(255, "La dirección no puede tener más de 255 caracteres")
    .optional(),

  cityIntl: yup
    .string()
    .trim()
    .max(100, "La ciudad no puede tener más de 100 caracteres")
    .optional(),

  postalCodeIntl: yup
    .string()
    .trim()
    .max(20, "El código postal no puede tener más de 20 caracteres")
    .optional(),
})

export { updateProfile, updatePassword, updateTechnician, updateBillingInfo }
