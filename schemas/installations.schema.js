import * as Yup from "yup"

const installationSchema = Yup.object().shape({
  company: Yup.string()
    .required("La compañía es un campo requerido")
    .max(100, "El nombre de la compañía no puede tener más de 100 caracteres"),
  address: Yup.string()
    .required("La dirección es un campo requerido")
    .max(255, "La dirección no puede tener más de 255 caracteres"),
  floorSector: Yup.string()
    .required("El sector o piso es un campo requerido")
    .max(100, "El sector o piso no puede tener más de 100 caracteres"),
  postalCode: Yup.string()
    .required("El código postal es un campo requerido")
    .max(10, "El código postal no puede tener más de 10 caracteres"),
  city: Yup.string()
    .required("La ciudad es un campo requerido")
    .max(100, "La ciudad no puede tener más de 100 caracteres"),
  province: Yup.string()
    .required("La provincia es un campo requerido")
    .max(100, "La provincia no puede tener más de 100 caracteres"),
  installationType: Yup.string()
    .required("El tipo de instalación es un campo requerido")
    .max(100, "El tipo de instalación no puede tener más de 100 caracteres"),
  
  // CAMPOS OPCIONALES - Ahora se pueden agregar después
  fechaInicio: Yup.date().nullable(), // Ya no es required
  fechaFin: Yup.date().nullable(),
  frecuencia: Yup.string()
    .oneOf(["Trimestral", "Mensual", "Anual", "Semestral"], "La frecuencia debe ser válida")
    .nullable(), // Ya no es required
  mesesFrecuencia: Yup.array()
    .of(Yup.string().oneOf([
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ], "Mes no válido"))
    .nullable(), // Ya no es required
  
  estado: Yup.string()
    .oneOf(["Activo", "Inactivo"], "El estado debe ser 'Activo' o 'Inactivo'")
    .default("Activo"),
})

// Schema específico para actualizar solo los campos de suscripción
const subscriptionUpdateSchema = Yup.object().shape({
  fechaInicio: Yup.date()
    .required("La fecha de inicio es obligatoria para activar la suscripción")
    .typeError("La fecha de inicio debe ser una fecha válida"),
  fechaFin: Yup.date()
    .required("La fecha de fin es obligatoria") // CAMBIO: Ahora es requerida
    .typeError("La fecha de fin debe ser una fecha válida")
    .test(
      'is-after-start',
      'La fecha de fin debe ser posterior a la fecha de inicio',
      function(value) {
        const { fechaInicio } = this.parent;
        if (!fechaInicio || !value) return true; // Si alguna no existe, dejar que required lo maneje
        return new Date(value) >= new Date(fechaInicio);
      }
    ),
  frecuencia: Yup.string()
    .oneOf(["Trimestral", "Mensual", "Anual", "Semestral"], "La frecuencia debe ser válida")
    .required("La frecuencia es obligatoria para activar la suscripción"),
  mesesFrecuencia: Yup.array()
    .of(Yup.string().oneOf([
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ], "Mes no válido"))
    .required("Debes seleccionar los meses de la frecuencia")
    .test(
      'valid-months-count',
      'La cantidad de meses seleccionados no coincide con la frecuencia',
      function(value) {
        const { frecuencia } = this.parent;
        if (!value || !frecuencia) return true;
        
        // Validar cantidad de meses según frecuencia
        switch(frecuencia) {
          case 'Mensual':
          case 'Anual':
            return value.length === 12; // Todos los meses
          case 'Semestral':
            return value.length === 2; // 2 meses
          case 'Trimestral':
            return value.length === 4; // 4 meses
          default:
            return true;
        }
      }
    ),
})

// Esquema para asignar activo a instalación (FUNCIÓN PRINCIPAL)
const assetAssignmentSchema = Yup.object().shape({
  assetId: Yup.string().required("El ID del activo es requerido"),
  ubicacion: Yup.string()
    .required("La ubicación específica en la instalación es requerida")
    .min(1, "La ubicación debe tener al menos 1 carácter")
    .max(255, "La ubicación no puede tener más de 255 caracteres"),
  categoria: Yup.string()
    .required("La categoría es requerida para la asignación")
    .max(100, "La categoría no puede tener más de 100 caracteres"),
})

// Esquema para dispositivos (AHORA REQUIERE ACTIVO)
const deviceSchema = Yup.object().shape({
  assetId: Yup.string().required(
    "El ID del activo es requerido. Los dispositivos deben basarse en activos existentes.",
  ),
  ubicacion: Yup.string()
    .required("La ubicación del dispositivo es un campo requerido")
    .min(1, "La ubicación debe tener al menos 1 carácter")
    .max(255, "La ubicación no puede tener más de 255 caracteres"),
  categoria: Yup.string()
    .required("La categoría del dispositivo es un campo requerido")
    .max(100, "La categoría no puede tener más de 100 caracteres"),
  // Campos que se heredan del activo (opcionales en la validación)
  nombre: Yup.string(),
  marca: Yup.string(),
  modelo: Yup.string(),
  numeroSerie: Yup.string(),
  templateId: Yup.string(),
  estado: Yup.string().oneOf([
    "Activo",
    "Inactivo",
    "En mantenimiento",
    "Fuera de servicio",
    "Pendiente de revisión"
  ], "El estado debe ser válido").default("Activo"),
})

// Middleware de validación para instalaciones (campos básicos)
function validateInstallations(req, res, next) {
  installationSchema
    .validate(req.body, { abortEarly: false, stripUnknown: true })
    .then((installation) => {
      req.body = installation
      next()
    })
    .catch((error) => res.status(400).json({ error: error.errors }))
}

// Middleware específico para validar actualización de suscripción
function validateSubscriptionUpdate(req, res, next) {
  subscriptionUpdateSchema
    .validate(req.body, { abortEarly: false, stripUnknown: true })
    .then((subscription) => {
      req.body = subscription
      next()
    })
    .catch((error) => res.status(400).json({ error: error.errors }))
}

// Resto de middlewares...
function validateAssetAssignment(req, res, next) {
  assetAssignmentSchema
    .validate(req.body, { abortEarly: false, stripUnknown: true })
    .then((validatedData) => {
      req.body = validatedData
      next()
    })
    .catch((error) => res.status(400).json({ error: error.errors }))
}

function validateDevice(req, res, next) {
  deviceSchema
    .validate(req.body, { abortEarly: false, stripUnknown: true })
    .then((device) => {
      req.body = device
      next()
    })
    .catch((error) => res.status(400).json({ error: error.errors }))
}

function validateTemplateAssignment(req, res, next) {
  const templateAssignmentSchema = Yup.object().shape({
    templateId: Yup.string().required("El ID de la plantilla es requerido"),
  })

  templateAssignmentSchema
    .validate(req.body, { abortEarly: false, stripUnknown: true })
    .then((data) => {
      req.body = data
      next()
    })
    .catch((error) => res.status(400).json({ error: error.errors }))
}

function validateMaintenanceSubmission(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: ['Los datos del mantenimiento son requeridos'] })
  }
  next()
}

export {
  installationSchema,
  deviceSchema,
  subscriptionUpdateSchema, // Nuevo export
  assetAssignmentSchema, // <-- Agregado
  validateInstallations,
  validateSubscriptionUpdate, // Nuevo export
  validateDevice,
  validateTemplateAssignment,
  validateMaintenanceSubmission,
  validateAssetAssignment,
}