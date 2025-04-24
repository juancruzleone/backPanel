import { installationSchema, deviceSchema } from '../schemas/installations.schema.js';
import { ObjectId } from 'mongodb';
import * as Yup from "yup";

async function validateInstallations(req, res, next) {
  try {
    await installationSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    next();
  } catch (err) {
    const errorMessages = err.inner.map(e => e.message);
    res.status(400).json({ error: { message: 'Validation error', details: errorMessages } });
  }
}

async function validateDevice(req, res, next) {
  try {
    // Verificar si se proporcionó un templateId y si es válido
    if (req.body.templateId && !ObjectId.isValid(req.body.templateId)) {
      return res.status(400).json({ error: { message: 'El ID de la plantilla no es válido' } });
    }
    
    await deviceSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    next();
  } catch (err) {
    const errorMessages = err.inner.map(e => e.message);
    res.status(400).json({ error: { message: 'Validation error', details: errorMessages } });
  }
}

// Nuevo middleware específico para asignar plantillas
async function validateTemplateAssignment(req, res, next) {
  try {
    // Esquema específico solo para la asignación de plantilla
    const templateAssignmentSchema = Yup.object().shape({
      templateId: Yup.string().required("El ID de la plantilla es obligatorio")
    });
    
    // Validar solo el templateId
    await templateAssignmentSchema.validate(req.body, { abortEarly: false });
    
    // Verificar si el templateId es un ObjectId válido
    if (!ObjectId.isValid(req.body.templateId)) {
      return res.status(400).json({ error: { message: 'El ID de la plantilla no es válido' } });
    }
    
    next();
  } catch (err) {
    const errorMessages = err.inner ? err.inner.map(e => e.message) : [err.message];
    res.status(400).json({ error: { message: 'Error de validación', details: errorMessages } });
  }
}

export { validateInstallations, validateDevice, validateTemplateAssignment };