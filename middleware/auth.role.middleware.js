import { db } from "../db.js"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"

const cuentaCollection = db.collection("cuentas")

export async function isAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: { message: "No se proporcionó token" } })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await cuentaCollection.findOne({ _id: new ObjectId(decoded._id) })

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: { message: "Acceso denegado. Se requiere rol de administrador." } })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(403).json({ error: { message: "Token inválido o usuario no autorizado" } })
  }
}

// Middleware para verificar si el usuario es técnico
export async function isTechnician(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: { message: "No se proporcionó token" } })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await cuentaCollection.findOne({ _id: new ObjectId(decoded._id) })

    if (!user || user.role !== "técnico") {
      return res.status(403).json({ error: { message: "Acceso denegado. Se requiere rol de técnico." } })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(403).json({ error: { message: "Token inválido o usuario no autorizado" } })
  }
}

// Middleware para verificar si el usuario es admin o técnico
export async function isAdminOrTechnician(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: { message: "No se proporcionó token" } })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await cuentaCollection.findOne({ _id: new ObjectId(decoded._id) })

    if (!user || (user.role !== "admin" && user.role !== "técnico")) {
      return res
        .status(403)
        .json({ error: { message: "Acceso denegado. Se requiere rol de administrador o técnico." } })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(403).json({ error: { message: "Token inválido o usuario no autorizado" } })
  }
}

// Middleware para verificar si el usuario es técnico y solo puede leer
export async function isTechnicianReadOnly(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: { message: "No se proporcionó token" } })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await cuentaCollection.findOne({ _id: new ObjectId(decoded._id) })

    if (!user || user.role !== "técnico") {
      return res.status(403).json({ error: { message: "Acceso denegado. Se requiere rol de técnico." } })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(403).json({ error: { message: "Token inválido o usuario no autorizado" } })
  }
}
