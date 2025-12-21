import * as yup from "yup"

// Schema para crear un usuario cliente
const createClientUser = yup.object({
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

  nombre: yup
    .string()
    .trim()
    .required("El nombre es obligatorio")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede tener más de 100 caracteres"),

  email: yup
    .string()
    .trim()
    .email("Debe ser un email válido")
    .max(255, "El email no puede tener más de 255 caracteres")
    .optional(),

  telefono: yup
    .string()
    .trim()
    .max(20, "El teléfono no puede tener más de 20 caracteres")
    .optional(),

  empresa: yup
    .string()
    .trim()
    .max(100, "El nombre de la empresa no puede tener más de 100 caracteres")
    .optional(),
})

// Schema para actualizar un usuario cliente
const updateClientUser = yup.object({
  userName: yup
    .string()
    .trim()
    .min(6, "El nombre de usuario debe tener al menos 6 caracteres")
    .max(50, "El nombre de usuario no puede tener más de 50 caracteres")
    .matches(/^[a-zA-Z0-9_]+$/, "El nombre de usuario solo puede contener letras, números y guiones bajos")
    .optional(),

  password: yup
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100, "La contraseña no puede tener más de 100 caracteres")
    .optional(),

  nombre: yup
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

  telefono: yup
    .string()
    .trim()
    .max(20, "El teléfono no puede tener más de 20 caracteres")
    .optional(),

  empresa: yup
    .string()
    .trim()
    .max(100, "El nombre de la empresa no puede tener más de 100 caracteres")
    .optional(),
})

// Schema para asignar instalaciones a un cliente
const assignInstallations = yup.object({
  installationIds: yup
    .array()
    .of(yup.string().required("Cada ID de instalación debe ser una cadena válida"))
    .min(1, "Debe proporcionar al menos una instalación")
    .required("Las instalaciones son obligatorias"),
})

export { createClientUser, updateClientUser, assignInstallations }
