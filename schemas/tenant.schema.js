import * as yup from "yup"

const tenantCreate = yup.object({
  name: yup
    .string()
    .trim()
    .required("El nombre de la empresa es obligatorio")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede tener más de 100 caracteres"),

  subdomain: yup
    .string()
    .trim()
    .required("El subdominio es obligatorio")
    .min(3, "El subdominio debe tener al menos 3 caracteres")
    .max(50, "El subdominio no puede tener más de 50 caracteres")
    .matches(/^[a-z0-9-]+$/, "El subdominio solo puede contener letras minúsculas, números y guiones")
    .test("unique", "Este subdominio ya está en uso", async function(value) {
      // Esta validación se hará en el servicio
      return true
    }),

  email: yup
    .string()
    .email("Email inválido")
    .required("El email es obligatorio"),

  phone: yup
    .string()
    .trim()
    .min(8, "El teléfono debe tener al menos 8 caracteres")
    .max(20, "El teléfono no puede tener más de 20 caracteres"),

  address: yup
    .string()
    .trim()
    .max(200, "La dirección no puede tener más de 200 caracteres"),

  plan: yup
    .string()
    .oneOf(["basic", "professional", "enterprise"], "Plan inválido")
    .default("basic"),

  maxUsers: yup
    .number()
    .integer("Debe ser un número entero")
    .min(1, "Mínimo 1 usuario")
    .max(1000, "Máximo 1000 usuarios")
    .default(10),

  maxAssets: yup
    .number()
    .integer("Debe ser un número entero")
    .min(1, "Mínimo 1 activo")
    .max(10000, "Máximo 10000 activos")
    .default(100),

  features: yup
    .object({
      workOrders: yup.boolean().default(true),
      assets: yup.boolean().default(true),
      reports: yup.boolean().default(true),
      pdfGeneration: yup.boolean().default(true),
      apiAccess: yup.boolean().default(false),
      customBranding: yup.boolean().default(false),
      prioritySupport: yup.boolean().default(false)
    })
    .default({})
})

const tenantUpdate = yup.object({
  name: yup
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede tener más de 100 caracteres"),

  email: yup
    .string()
    .email("Email inválido"),

  phone: yup
    .string()
    .trim()
    .min(8, "El teléfono debe tener al menos 8 caracteres")
    .max(20, "El teléfono no puede tener más de 20 caracteres"),

  address: yup
    .string()
    .trim()
    .max(200, "La dirección no puede tener más de 200 caracteres"),

  plan: yup
    .string()
    .oneOf(["basic", "professional", "enterprise"], "Plan inválido"),

  maxUsers: yup
    .number()
    .integer("Debe ser un número entero")
    .min(1, "Mínimo 1 usuario")
    .max(1000, "Máximo 1000 usuarios"),

  maxAssets: yup
    .number()
    .integer("Debe ser un número entero")
    .min(1, "Mínimo 1 activo")
    .max(10000, "Máximo 10000 activos"),

  features: yup
    .object({
      workOrders: yup.boolean(),
      assets: yup.boolean(),
      reports: yup.boolean(),
      pdfGeneration: yup.boolean(),
      apiAccess: yup.boolean(),
      customBranding: yup.boolean(),
      prioritySupport: yup.boolean()
    }),

  status: yup
    .string()
    .oneOf(["active", "suspended", "cancelled"], "Estado inválido")
})

export { tenantCreate, tenantUpdate } 