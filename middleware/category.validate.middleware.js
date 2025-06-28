import { categorySchema, categoryPatchSchema } from "../schemas/category.schema.js"

function validateCategory(req, res, next) {
  categorySchema
    .validate(req.body, { abortEarly: false, stripUnknown: true })
    .then((data) => {
      req.body = {
        ...data,
        activa: data.activa !== undefined ? data.activa : true,
      }
      next()
    })
    .catch((error) => res.status(400).json({ error: error.errors }))
}

function validateCategoryPatch(req, res, next) {
  categoryPatchSchema
    .validate(req.body, { abortEarly: false, stripUnknown: true })
    .then((data) => {
      req.body = data
      next()
    })
    .catch((error) => res.status(400).json({ error: error.errors }))
}

export { validateCategory, validateCategoryPatch }
