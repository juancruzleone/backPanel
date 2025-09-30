import {
  installationSchema,
  subscriptionUpdateSchema,
  deviceSchema,
  validateInstallations as schemaValidateInstallations,
  validateSubscriptionUpdate as schemaValidateSubscriptionUpdate,
  validateDevice as schemaValidateDevice,
  validateTemplateAssignment as schemaValidateTemplateAssignment,
  validateMaintenanceSubmission as schemaValidateMaintenanceSubmission,
  assetAssignmentSchema,
} from "../schemas/installations.schema.js"

// Middleware para validar creación/edición de instalación
async function validateInstallations(req, res, next) {
  console.log('📋 [VALIDATION] Validando instalación...');
  console.log('📋 [VALIDATION] Datos recibidos:', JSON.stringify(req.body, null, 2));
  
  try {
    const installation = await installationSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    console.log('✅ [VALIDATION] Validación exitosa');
    req.body = installation
    next()
  } catch (error) {
    console.log('❌ [VALIDATION] Errores de validación:', error.errors);
    res.status(400).json({ error: error.errors })
  }
}

// Middleware para validar actualización de suscripción
async function validateSubscriptionUpdate(req, res, next) {
  try {
    const subscription = await subscriptionUpdateSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    req.body = subscription
    next()
  } catch (error) {
    res.status(400).json({ error: error.errors })
  }
}

// Middleware para validar dispositivos
async function validateDevice(req, res, next) {
  try {
    const device = await deviceSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    req.body = device
    next()
  } catch (error) {
    res.status(400).json({ error: error.errors })
  }
}

// Middleware para validar asignación de plantilla a dispositivo
async function validateTemplateAssignment(req, res, next) {
  try {
    await schemaValidateTemplateAssignment(req, res, next)
  } catch (error) {
    res.status(400).json({ error: error.errors })
  }
}

// Middleware para validar envío de mantenimiento
async function validateMaintenanceSubmission(req, res, next) {
  try {
    await schemaValidateMaintenanceSubmission(req, res, next)
  } catch (error) {
    res.status(400).json({ error: error.errors })
  }
}

// Middleware para validar asignación de activos
async function validateAssetAssignment(req, res, next) {
  try {
    const validatedData = await assetAssignmentSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    req.body = validatedData
    next()
  } catch (error) {
    res.status(400).json({ error: error.errors })
  }
}

export {
  validateInstallations,
  validateSubscriptionUpdate,
  validateDevice,
  validateTemplateAssignment,
  validateMaintenanceSubmission,
  validateAssetAssignment,
}
