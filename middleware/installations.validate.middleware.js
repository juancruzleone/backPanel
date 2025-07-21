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
  fechaInicio: Yup.date().required("La fecha de inicio es obligatoria"),
  fechaFin: Yup.date().nullable(),
  frecuencia: Yup.string().oneOf(["Trimestral", "Mensual", "Anual", "Semestral"], "La frecuencia debe ser válida").required("La frecuencia es obligatoria"),
  mesesFrecuencia: Yup.array()
    .of(Yup.string().oneOf([
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ], "Mes no válido"))
    .required("Debes seleccionar los meses de la frecuencia"),
  estado: Yup.string().oneOf(["Activo", "Inactivo"], "El estado debe ser 'Activo' o 'Inactivo'").default("Activo"),
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
})

// Esquema de mantenimiento (sin estado)
const maintenanceSchema = Yup.object().shape({
  fechaRevision: Yup.string(),
  horaRevision: Yup.string(),
})

// Middleware de validación para asignación de activos
function validateAssetAssignment(req, res, next) {
  assetAssignmentSchema
    .validate(req.body, { abortEarly: false, stripUnknown: true })
    .then((validatedData) => {
      req.body = validatedData
      next()
    })
    .catch((error) => res.status(400).json({ error: error.errors }))
}

function validateInstallations(req, res, next) {
  installationSchema
    .validate(req.body, { abortEarly: false, stripUnknown: true })
    .then((installation) => {
      req.body = installation
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
  maintenanceSchema
    .validate(req.body, { abortEarly: false, stripUnknown: true })
    .then((maintenance) => {
      req.body = maintenance
      next()
    })
    .catch((error) => res.status(400).json({ error: error.errors }))
}

export {
  installationSchema,
  deviceSchema,
  maintenanceSchema,
  validateInstallations,
  validateDevice,
  validateTemplateAssignment,
  validateMaintenanceSubmission,
  validateAssetAssignment,
}
