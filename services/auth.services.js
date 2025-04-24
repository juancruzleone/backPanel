import { db } from "../db.js"
import bcrypt from "bcrypt"
import { ObjectId } from "mongodb"

const cuentaCollection = db.collection("cuentas")

async function createAccount(cuenta) {
  const existe = await cuentaCollection.findOne({ userName: cuenta.userName })
  if (existe) throw new Error("La cuenta ya existe")

  const existeEmail = await cuentaCollection.findOne({ email: cuenta.email })
  if (existeEmail) throw new Error("El correo ya está registrado")

  const hashedPassword = await bcrypt.hash(cuenta.password, 10)

  const nuevaCuenta = {
    userName: cuenta.userName,
    email: cuenta.email,
    password: hashedPassword,
    isVerified: true, // Marcamos como verificada automáticamente
    status: "active", // Activamos la cuenta directamente
    createdAt: new Date(),
  }

  const result = await cuentaCollection.insertOne(nuevaCuenta)
  return {
    message: "Cuenta creada exitosamente",
    cuenta: {
      ...nuevaCuenta,
      _id: result.insertedId,
      password: undefined,
    },
  }
}

async function login(cuenta) {
  const existe = await cuentaCollection.findOne({ userName: cuenta.userName })
  if (!existe) throw new Error("No se pudo iniciar sesión")

  // Ya no es necesario verificar si la cuenta está verificada
  if (existe.status !== "active") {
    throw new Error("La cuenta no está activa.")
  }

  const esValido = await bcrypt.compare(cuenta.password, existe.password)
  if (!esValido) throw new Error("No se pudo iniciar sesión")

  return { ...existe, password: undefined }
}

async function getAllAccounts() {
  return cuentaCollection.find({}).sort({ _id: -1 }).toArray()
}

async function getAccountById(id) {
  const cuenta = await cuentaCollection.findOne({ _id: new ObjectId(id) })
  return cuenta ? { ...cuenta, password: undefined } : null
}

export { createAccount, login, getAllAccounts, getAccountById }
