import { Router } from "express"
import * as controllers from "../controllers/controller.api.clientUsers.js"
import { validateToken } from "../../middleware/auth.validate.middleware.js"
import { isAdmin } from "../../middleware/auth.role.middleware.js"
import { createClientUser, updateClientUser, assignInstallations } from "../../schemas/clientUser.schema.js"

const route = Router()

// Middleware para validar schema de creación de cliente
const validateCreateClient = async (req, res, next) => {
  try {
    const validatedData = await createClientUser.validate(req.body, { abortEarly: false })
    req.body = validatedData
    next()
  } catch (error) {
    res.status(400).json({
      error: {
        message: "Datos de validación inválidos",
        details: error.errors
      }
    })
  }
}

// Middleware para validar schema de actualización de cliente
const validateUpdateClient = async (req, res, next) => {
  try {
    const validatedData = await updateClientUser.validate(req.body, { abortEarly: false, stripUnknown: true })
    req.body = validatedData
    next()
  } catch (error) {
    res.status(400).json({
      error: {
        message: "Datos de validación inválidos",
        details: error.errors
      }
    })
  }
}

// Middleware para validar schema de asignación de instalaciones
const validateAssignInstallations = async (req, res, next) => {
  try {
    const validatedData = await assignInstallations.validate(req.body, { abortEarly: false })
    req.body = validatedData
    next()
  } catch (error) {
    res.status(400).json({
      error: {
        message: "Datos de validación inválidos",
        details: error.errors
      }
    })
  }
}

// Rutas para gestión de clientes (solo admins)
route.post("/clientes-usuarios", [validateToken, isAdmin, validateCreateClient], controllers.createClientUser)
route.get("/clientes-usuarios", [validateToken, isAdmin], controllers.getClientUsers)
route.get("/clientes-usuarios/:id", [validateToken, isAdmin], controllers.getClientUserById)
route.put("/clientes-usuarios/:id", [validateToken, isAdmin, validateUpdateClient], controllers.updateClientUser)
route.patch("/clientes-usuarios/:id", [validateToken, isAdmin, validateUpdateClient], controllers.updateClientUser)
route.delete("/clientes-usuarios/:id", [validateToken, isAdmin], controllers.deleteClientUser)

// Rutas para asignación de instalaciones
route.post("/clientes-usuarios/:id/instalaciones", [validateToken, isAdmin, validateAssignInstallations], controllers.assignInstallations)
route.get("/clientes-usuarios/:id/instalaciones", [validateToken, isAdmin], controllers.getClientInstallations)

export default route
