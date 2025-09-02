import { db } from "../db.js"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"

const tokenCollection = db.collection("tokens")

async function createToken(cuenta) {
  // Incluir tenantId en el token
  const tokenPayload = {
    ...cuenta,
    tenantId: cuenta.tenantId
  }
  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET)
  await tokenCollection.insertOne({ token, cuenta_id: cuenta._id, tenantId: cuenta.tenantId })
  return token
}

async function validateToken(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const sessionActiva = await tokenCollection.findOne({ token, cuenta_id: new ObjectId(payload._id) })

    if (!sessionActiva) return null

    return payload
  } catch (error) {
    return null
  }
}

async function removeToken(token) {
  await tokenCollection.deleteOne({ token })
}

export { createToken, validateToken, removeToken }
