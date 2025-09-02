import { tenantCreate, tenantUpdate } from "../schemas/tenant.schema.js"

// Middleware para validar datos de creación de tenant
async function validateTenantCreateData(req, res, next) {
  try {
    const tenant = await tenantCreate.validate(req.body, { abortEarly: false, stripUnknown: true })
    req.body = tenant
    next()
  } catch (err) {
    const errorMessages = err.inner.map(e => e.message)
    res.status(400).json({ error: { message: 'Error de validación', details: errorMessages } })
  }
}

// Middleware para validar datos de actualización de tenant
async function validateTenantUpdateData(req, res, next) {
  try {
    const tenant = await tenantUpdate.validate(req.body, { abortEarly: false, stripUnknown: true })
    req.body = tenant
    next()
  } catch (err) {
    const errorMessages = err.inner.map(e => e.message)
    res.status(400).json({ error: { message: 'Error de validación', details: errorMessages } })
  }
}

export { validateTenantCreateData, validateTenantUpdateData } 