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
})

const cuentaLogin = yup.object({
  userName: yup.string().trim().required("El nombre de usuario es obligatorio"),

  password: yup.string().required("La contraseña es obligatoria"),
})

export { cuentaRegistro, cuentaLogin }
