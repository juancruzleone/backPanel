import { db } from "../db.js"
import bcrypt from "bcrypt"
import { ObjectId } from "mongodb"

const cuentaCollection = db.collection("cuentas")

async function createAccount(cuenta, adminUser) {
  // Verificar que el usuario que crea la cuenta sea admin
  if (!adminUser || adminUser.role !== "admin") {
    throw new Error("No tienes permisos para crear cuentas")
  }

  // Verificar si ya existe el nombre de usuario
  const existe = await cuentaCollection.findOne({ userName: cuenta.userName })
  if (existe) throw new Error("El nombre de usuario ya existe")

  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(cuenta.password, 10)

  // Crear la nueva cuenta con rol de técnico
  const nuevaCuenta = {
    userName: cuenta.userName,
    password: hashedPassword,
    role: "tecnico", // Todas las cuentas creadas por admin son técnicos
    isVerified: true,
    status: "active",
    createdAt: new Date(),
    createdBy: adminUser._id, // Registrar quién creó la cuenta
    updatedAt: new Date(),
  }

  const result = await cuentaCollection.insertOne(nuevaCuenta)

  return {
    message: "Cuenta de técnico creada exitosamente",
    cuenta: {
      ...nuevaCuenta,
      _id: result.insertedId,
      password: undefined, // No devolver la contraseña
    },
  }
}

async function login(cuenta) {
  const existe = await cuentaCollection.findOne({ userName: cuenta.userName })
  if (!existe) throw new Error("Credenciales inválidas")

  // Verificar que la cuenta esté activa
  if (existe.status !== "active") {
    throw new Error("La cuenta no está activa. Contacte al administrador.")
  }

  // Verificar la contraseña
  const esValido = await bcrypt.compare(cuenta.password, existe.password)
  if (!esValido) throw new Error("Credenciales inválidas")

  // Actualizar último login
  await cuentaCollection.updateOne(
    { _id: existe._id },
    {
      $set: {
        lastLogin: new Date(),
        updatedAt: new Date(),
      },
    },
  )

  return { ...existe, password: undefined }
}

async function getAllAccounts() {
  return cuentaCollection
    .find({}, { projection: { password: 0 } }) // Excluir contraseñas
    .sort({ createdAt: -1 })
    .toArray()
}

async function getAccountById(id) {
  if (!ObjectId.isValid(id)) {
    throw new Error("ID de usuario inválido")
  }

  const cuenta = await cuentaCollection.findOne(
    { _id: new ObjectId(id) },
    { projection: { password: 0 } }, // Excluir contraseña
  )

  return cuenta
}

// ✅ NUEVA FUNCIÓN: obtener cuentas por rol
async function getAccountsByRole(role) {
  try {
    const cuentas = await cuentaCollection
      .find(
        { role: role },
        { projection: { password: 0 } }, // Excluir contraseñas
      )
      .sort({ createdAt: -1 })
      .toArray()

    return cuentas
  } catch (error) {
    console.error("Error al obtener cuentas por rol:", error)
    throw new Error("Error al obtener cuentas por rol")
  }
}

// Función para actualizar el estado de una cuenta (solo admin)
async function updateAccountStatus(id, status, adminUser) {
  if (!adminUser || adminUser.role !== "admin") {
    throw new Error("No tienes permisos para modificar cuentas")
  }

  if (!ObjectId.isValid(id)) {
    throw new Error("ID de usuario inválido")
  }

  const validStatuses = ["active", "inactive", "suspended"]
  if (!validStatuses.includes(status)) {
    throw new Error("Estado inválido")
  }

  const result = await cuentaCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        updatedAt: new Date(),
        updatedBy: adminUser._id,
      },
    },
  )

  if (result.matchedCount === 0) {
    throw new Error("Usuario no encontrado")
  }

  return { message: "Estado de cuenta actualizado exitosamente" }
}

// Función para eliminar una cuenta (solo admin)
async function deleteAccount(id, adminUser) {
  if (!adminUser || adminUser.role !== "admin") {
    throw new Error("No tienes permisos para eliminar cuentas")
  }

  if (!ObjectId.isValid(id)) {
    throw new Error("ID de usuario inválido")
  }

  // No permitir que el admin se elimine a sí mismo
  if (adminUser._id.toString() === id) {
    throw new Error("No puedes eliminar tu propia cuenta")
  }

  const result = await cuentaCollection.deleteOne({ _id: new ObjectId(id) })

  if (result.deletedCount === 0) {
    throw new Error("Usuario no encontrado")
  }

  return { message: "Cuenta eliminada exitosamente" }
}

export {
  createAccount,
  login,
  getAllAccounts,
  getAccountById,
  updateAccountStatus,
  deleteAccount,
  getAccountsByRole, // ✅ EXPORTAR la nueva función
}
