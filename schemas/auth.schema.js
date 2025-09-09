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
})

export { cuentaRegistro, cuentaLogin, publicRegister }
