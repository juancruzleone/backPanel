import { installationTypeSchemaCreate, installationTypeSchemaPatch } from "../schemas/installationType.schema.js"

async function validateInstallationType(req, res, next) {
  try {
    const tipo = await installationTypeSchemaCreate.validate(req.body, { abortEarly: false })
    req.body = tipo
    next()
  } catch (error) {
    res.status(400).json({ error: error.errors })
  }
}

function validateInstallationTypePatch(req, res, next) {
  installationTypeSchemaPatch
    .validate(req.body, { abortEarly: false, stripUnknown: true })
    .then((tipo) => {
      req.body = tipo
      next()
    })
    .catch((error) => res.status(400).json({ error: error.errors }))
}

export { validateInstallationType, validateInstallationTypePatch }