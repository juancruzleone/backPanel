import * as yup from "yup"

const workOrderSchema = yup.object({
  titulo: yup
    .string()
    .required("El título es obligatorio")
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(200, "El título no puede tener más de 200 caracteres"),
  descripcion: yup
    .string()
    .required("La descripción es obligatoria")
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(1000, "La descripción no puede tener más de 1000 caracteres"),
  instalacionId: yup.string().required("La instalación es obligatoria"),
  dispositivoId: yup.string().nullable(),
  prioridad: yup
    .string()
    .required("La prioridad es obligatoria")
    .oneOf(["baja", "media", "alta", "critica"], "La prioridad debe ser válida"),
  fechaProgramada: yup
    .date()
    .required("La fecha programada es obligatoria")
    .min(new Date(), "La fecha programada no puede ser en el pasado"),
  horaProgramada: yup
    .string()
    .required("La hora programada es obligatoria")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "La hora debe tener formato HH:MM"),
  tipoTrabajo: yup
    .string()
    .required("El tipo de trabajo es obligatorio")
    .oneOf(["mantenimiento", "reparacion", "instalacion", "inspeccion", "otro"], "El tipo de trabajo debe ser válido"),
  observaciones: yup.string().max(500, "Las observaciones no pueden tener más de 500 caracteres"),
})

const workOrderAssignmentSchema = yup.object({
  tecnicoId: yup.string().required("El ID del técnico es obligatorio"),
})

const workOrderStatusUpdateSchema = yup.object({
  estado: yup
    .string()
    .required("El estado es obligatorio")
    .oneOf(["pendiente", "asignada", "en_progreso", "completada", "cancelada"], "El estado debe ser válido"),
  observaciones: yup.string().max(500, "Las observaciones no pueden tener más de 500 caracteres"),
})

// Schema corregido para completar orden de trabajo
const workOrderCompletionSchema = yup.object({
  observaciones: yup
    .string()
    .required("Las observaciones son obligatorias")
    .min(5, "Las observaciones deben tener al menos 5 caracteres") // Reducido de 10 a 5
    .max(1000, "Las observaciones no pueden tener más de 1000 caracteres"),
  trabajoRealizado: yup
    .string()
    .required("La descripción del trabajo realizado es obligatoria")
    .min(5, "La descripción debe tener al menos 5 caracteres") // Reducido de 10 a 5
    .max(1000, "La descripción no puede tener más de 1000 caracteres"),
  materialesUtilizados: yup
    .array()
    .of(
      yup.object({
        nombre: yup.string().required("El nombre del material es obligatorio"),
        cantidad: yup.number().positive("La cantidad debe ser positiva").required("La cantidad es obligatoria"),
        unidad: yup.string().required("La unidad es obligatoria"),
      }),
    )
    .default([]),
  tiempoTrabajo: yup
    .number()
    .positive("El tiempo de trabajo debe ser positivo")
    .required("El tiempo de trabajo es obligatorio"),
  estadoDispositivo: yup
    .string()
    .nullable() // Permitir null
    .oneOf(
      [null, "Activo", "Inactivo", "En mantenimiento", "Fuera de servicio", "Pendiente de revisión"],
      "El estado del dispositivo debe ser válido",
    ),
  // Campo opcional para las respuestas del formulario personalizado
  formularioRespuestas: yup.object().default({}).nullable(), // Hacer completamente opcional
})

export { workOrderSchema, workOrderAssignmentSchema, workOrderStatusUpdateSchema, workOrderCompletionSchema }
