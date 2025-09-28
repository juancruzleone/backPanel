import * as yup from "yup"

const cuentaRegistro = yup.object({
  userName: yup
    .string()
    .trim()
    .required("El nombre de usuario es obligatorio")
    .min(6, "El nombre de usuario debe tener al menos 6 caracteres")
    .max(50, "El nombre de usuario no puede tener más de 50 caracteres")
    .matches(/^[a-zA-Z0-9_]+$/, "El nombre de usuario solo puede contener letras, números y guiones bajos"),

  password: yup
    .string()
    .required("La contraseña es obligatoria")
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100, "La contraseña no puede tener más de 100 caracteres"),

  role: yup
    .string()
    .oneOf(["admin", "técnico", "super_admin"], "Rol inválido")
    .default("técnico"),
})

const cuentaLogin = yup.object({
  userName: yup.string().trim().required("El nombre de usuario es obligatorio"),

  password: yup.string().required("La contraseña es obligatoria"),
})

// Esquema para registro público de usuarios
const publicRegister = yup.object({
  name: yup
    .string()
    .trim()
    .required("El nombre es obligatorio")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede tener más de 100 caracteres"),

  email: yup
    .string()
    .trim()
    .required("El email es obligatorio")
    .email("Debe ser un email válido")
    .max(255, "El email no puede tener más de 255 caracteres"),

  password: yup
    .string()
    .required("La contraseña es obligatoria")
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100, "La contraseña no puede tener más de 100 caracteres"),

  confirmPassword: yup
    .string()
    .required("La confirmación de contraseña es obligatoria")
    .oneOf([yup.ref("password")], "Las contraseñas no coinciden"),

  tenantName: yup
    .string()
    .trim()
    .required("El nombre de la empresa es obligatorio")
    .min(2, "El nombre de la empresa debe tener al menos 2 caracteres")
    .max(100, "El nombre de la empresa no puede tener más de 100 caracteres"),

  tenantAddress: yup
    .string()
    .trim()
    .max(255, "La dirección no puede tener más de 255 caracteres")
    .optional(),

  country: yup
    .string()
    .trim()
    .length(2, "El código de país debe tener 2 caracteres")
    .matches(/^[A-Z]{2}$/, "El código de país debe estar en mayúsculas")
    .default("US")
    .optional(),

  // Campos fiscales para Argentina
  razonSocial: yup
    .string()
    .trim()
    .when('country', {
      is: 'AR',
      then: (schema) => schema.required('La razón social es obligatoria para Argentina'),
      otherwise: (schema) => schema.optional()
    })
    .max(255, "La razón social no puede tener más de 255 caracteres"),

  tipoDocumento: yup
    .string()
    .when('country', {
      is: 'AR',
      then: (schema) => schema.required('El tipo de documento es obligatorio para Argentina')
        .oneOf(['CUIT', 'CUIL', 'DNI'], 'Tipo de documento inválido'),
      otherwise: (schema) => schema.optional()
    }),

  numeroDocumento: yup
    .string()
    .trim()
    .when('country', {
      is: 'AR',
      then: (schema) => schema.required('El número de documento es obligatorio para Argentina'),
      otherwise: (schema) => schema.optional()
    })
    .max(50, "El número de documento no puede tener más de 50 caracteres"),

  condicionIVA: yup
    .string()
    .when('country', {
      is: 'AR',
      then: (schema) => schema.required('La condición de IVA es obligatoria para Argentina')
        .oneOf(['Consumidor Final', 'Responsable Inscripto', 'Exento', 'Monotributista'], 'Condición de IVA inválida'),
      otherwise: (schema) => schema.optional()
    }),

  direccionFiscal: yup
    .string()
    .trim()
    .when('country', {
      is: 'AR',
      then: (schema) => schema.required('La dirección fiscal es obligatoria para Argentina'),
      otherwise: (schema) => schema.optional()
    })
    .max(255, "La dirección fiscal no puede tener más de 255 caracteres"),

  ciudad: yup
    .string()
    .trim()
    .when('country', {
      is: 'AR',
      then: (schema) => schema.required('La ciudad es obligatoria para Argentina'),
      otherwise: (schema) => schema.optional()
    })
    .max(100, "La ciudad no puede tener más de 100 caracteres"),

  provincia: yup
    .string()
    .trim()
    .when('country', {
      is: 'AR',
      then: (schema) => schema.required('La provincia es obligatoria para Argentina'),
      otherwise: (schema) => schema.optional()
    })
    .max(100, "La provincia no puede tener más de 100 caracteres"),

  codigoPostal: yup
    .string()
    .trim()
    .when('country', {
      is: 'AR',
      then: (schema) => schema.required('El código postal es obligatorio para Argentina'),
      otherwise: (schema) => schema.optional()
    })
    .max(20, "El código postal no puede tener más de 20 caracteres"),

  // Campos fiscales para países internacionales
  taxIdType: yup
    .string()
    .trim()
    .when('country', {
      is: (val) => val && val !== 'AR',
      then: (schema) => schema.required('El tipo de identificación fiscal es obligatorio'),
      otherwise: (schema) => schema.optional()
    })
    .max(50, "El tipo de identificación fiscal no puede tener más de 50 caracteres"),

  taxIdNumber: yup
    .string()
    .trim()
    .when('country', {
      is: (val) => val && val !== 'AR',
      then: (schema) => schema.required('El número de identificación fiscal es obligatorio'),
      otherwise: (schema) => schema.optional()
    })
    .max(100, "El número de identificación fiscal no puede tener más de 100 caracteres"),

  addressIntl: yup
    .string()
    .trim()
    .when('country', {
      is: (val) => val && val !== 'AR',
      then: (schema) => schema.required('La dirección es obligatoria'),
      otherwise: (schema) => schema.optional()
    })
    .max(255, "La dirección no puede tener más de 255 caracteres"),

  cityIntl: yup
    .string()
    .trim()
    .when('country', {
      is: (val) => val && val !== 'AR',
      then: (schema) => schema.required('La ciudad es obligatoria'),
      otherwise: (schema) => schema.optional()
    })
    .max(100, "La ciudad no puede tener más de 100 caracteres"),

  postalCodeIntl: yup
    .string()
    .trim()
    .when('country', {
      is: (val) => val && val !== 'AR',
      then: (schema) => schema.required('El código postal es obligatorio'),
      otherwise: (schema) => schema.optional()
    })
    .max(20, "El código postal no puede tener más de 20 caracteres"),
})

export { cuentaRegistro, cuentaLogin, publicRegister }
