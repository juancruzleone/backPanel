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

const workOrderCompletionSchema = yup.object({
  observaciones: yup
    .string()
    .required("Las observaciones de finalización son obligatorias")
    .min(10, "Las observaciones deben tener al menos 10 caracteres")
    .max(1000, "Las observaciones no pueden tener más de 1000 caracteres"),
  trabajoRealizado: yup
    .string()
    .required("La descripción del trabajo realizado es obligatoria")
    .min(10, "La descripción debe tener al menos 10 caracteres")
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
    .oneOf(
      ["Activo", "Inactivo", "En mantenimiento", "Fuera de servicio", "Pendiente de revisión"],
      "El estado del dispositivo debe ser válido",
    ),
  // NUEVO: Campo para las respuestas del formulario personalizado
  formularioRespuestas: yup
    .object()
    .default({})
    .test(
      "formulario-requerido-si-hay-dispositivo",
      "Se requieren las respuestas del formulario del dispositivo",
      function (value) {
        // Si hay un dispositivo en la orden de trabajo, se requiere el formulario
        const { parent } = this
        // Esta validación se puede hacer más específica según las necesidades
        return true // Por ahora permitimos que sea opcional
      },
    ),
})

export { workOrderSchema, workOrderAssignmentSchema, workOrderStatusUpdateSchema, workOrderCompletionSchema }
