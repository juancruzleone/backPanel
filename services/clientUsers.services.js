import { db } from "../db.js"
import bcrypt from "bcrypt"
import { ObjectId } from "mongodb"

const cuentaCollection = db.collection("cuentas")
const installationsCollection = db.collection("instalaciones")

// Crear un usuario cliente
async function createClientUser(clientData, adminUser, tenantId) {
  // Verificar que el usuario que crea la cuenta sea admin o super_admin
  if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
    throw new Error("No tienes permisos para crear clientes")
  }

  // Para admin normal, verificar tenant
  if (adminUser.role === "admin" && adminUser.tenantId !== tenantId) {
    throw new Error("No tienes permisos para crear clientes en este tenant")
  }

  // Verificar si ya existe el nombre de usuario en el mismo tenant
  const existeUserName = await cuentaCollection.findOne({ 
    userName: clientData.userName,
    tenantId: tenantId
  })
  if (existeUserName) throw new Error("El nombre de usuario ya existe en este tenant")

  // Verificar si el email ya existe en el mismo tenant (si se proporciona)
  if (clientData.email) {
    const existeEmail = await cuentaCollection.findOne({ 
      email: clientData.email,
      tenantId: tenantId
    })
    if (existeEmail) throw new Error("El email ya existe en este tenant")
  }

  // Verificar límites del tenant
  const usersCount = await cuentaCollection.countDocuments({ tenantId })
  const { checkTenantLimits } = await import("./tenants.services.js")
  await checkTenantLimits(tenantId, "users", usersCount)

  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(clientData.password, 10)

  // Crear el nuevo usuario cliente
  const nuevoCliente = {
    userName: clientData.userName,
    password: hashedPassword,
    role: "cliente",
    tenantId: tenantId,
    nombre: clientData.nombre,
    email: clientData.email || null,
    telefono: clientData.telefono || null,
    empresa: clientData.empresa || null,
    instalacionesAsignadas: [], // Array de IDs de instalaciones
    isVerified: true,
    status: "active",
    createdAt: new Date(),
    createdBy: adminUser._id,
    updatedAt: new Date(),
  }

  const result = await cuentaCollection.insertOne(nuevoCliente)

  // Actualizar estadísticas del tenant
  console.log("🔄 Actualizando estadísticas después de crear cliente para tenantId:", tenantId)
  const { updateTenantStats } = await import("./tenants.services.js")
  await updateTenantStats(tenantId)
  console.log("✅ Estadísticas actualizadas después de crear cliente")

  return {
    message: "Cliente creado exitosamente",
    cliente: {
      ...nuevoCliente,
      _id: result.insertedId,
      password: undefined, // No devolver la contraseña
    },
  }
}

// Obtener todos los clientes de un tenant
async function getClientUsers(tenantId) {
  try {
    const clientes = await cuentaCollection
      .find({ 
        tenantId: tenantId,
        role: "cliente",
        status: { $ne: "deleted" }
      })
      .sort({ _id: -1 })
      .toArray()

    // Eliminar contraseñas de la respuesta
    return clientes.map(cliente => ({
      ...cliente,
      password: undefined
    }))
  } catch (error) {
    console.error("Error en getClientUsers:", error)
    throw new Error("Error al obtener los clientes")
  }
}

// Obtener un cliente por ID
async function getClientUserById(clientId, tenantId) {
  try {
    if (!ObjectId.isValid(clientId)) {
      throw new Error("El ID del cliente no es válido")
    }

    const cliente = await cuentaCollection.findOne({ 
      _id: new ObjectId(clientId),
      tenantId: tenantId,
      role: "cliente"
    })

    if (!cliente) {
      throw new Error("Cliente no encontrado")
    }

    return {
      ...cliente,
      password: undefined
    }
  } catch (error) {
    console.error("Error en getClientUserById:", error)
    throw error
  }
}

// Actualizar un cliente
async function updateClientUser(clientId, updateData, adminUser, tenantId) {
  try {
    // Verificar que el usuario que actualiza sea admin
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      throw new Error("No tienes permisos para actualizar clientes")
    }

    // Para admin normal, verificar tenant
    if (adminUser.role === "admin" && adminUser.tenantId !== tenantId) {
      throw new Error("No tienes permisos para actualizar clientes en este tenant")
    }

    if (!ObjectId.isValid(clientId)) {
      throw new Error("El ID del cliente no es válido")
    }

    // Verificar que el cliente existe y pertenece al tenant
    const clienteExistente = await cuentaCollection.findOne({ 
      _id: new ObjectId(clientId),
      tenantId: tenantId,
      role: "cliente"
    })

    if (!clienteExistente) {
      throw new Error("Cliente no encontrado en este tenant")
    }

    // Verificar si el nuevo userName ya existe (si se está actualizando)
    if (updateData.userName && updateData.userName !== clienteExistente.userName) {
      const existeUserName = await cuentaCollection.findOne({ 
        userName: updateData.userName,
        tenantId: tenantId,
        _id: { $ne: new ObjectId(clientId) }
      })
      if (existeUserName) throw new Error("El nombre de usuario ya existe en este tenant")
    }

    // Verificar si el nuevo email ya existe (si se está actualizando)
    if (updateData.email && updateData.email !== clienteExistente.email) {
      const existeEmail = await cuentaCollection.findOne({ 
        email: updateData.email,
        tenantId: tenantId,
        _id: { $ne: new ObjectId(clientId) }
      })
      if (existeEmail) throw new Error("El email ya existe en este tenant")
    }

    const datosActualizar = {
      updatedAt: new Date(),
      updatedBy: adminUser._id
    }

    // Solo actualizar campos proporcionados
    if (updateData.userName) datosActualizar.userName = updateData.userName
    if (updateData.nombre) datosActualizar.nombre = updateData.nombre
    if (updateData.email !== undefined) datosActualizar.email = updateData.email
    if (updateData.telefono !== undefined) datosActualizar.telefono = updateData.telefono
    if (updateData.empresa !== undefined) datosActualizar.empresa = updateData.empresa

    // Si se proporciona una nueva contraseña, hashearla
    if (updateData.password) {
      datosActualizar.password = await bcrypt.hash(updateData.password, 10)
    }

    const result = await cuentaCollection.updateOne(
      { _id: new ObjectId(clientId) },
      { $set: datosActualizar }
    )

    if (result.modifiedCount === 0) {
      throw new Error("No se pudo actualizar el cliente")
    }

    return {
      message: "Cliente actualizado exitosamente",
      modified: result.modifiedCount
    }
  } catch (error) {
    console.error("Error en updateClientUser:", error)
    throw error
  }
}

// Eliminar un cliente (soft delete)
async function deleteClientUser(clientId, adminUser, tenantId) {
  try {
    // Verificar que el usuario que elimina sea admin
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      throw new Error("No tienes permisos para eliminar clientes")
    }

    // Para admin normal, verificar tenant
    if (adminUser.role === "admin" && adminUser.tenantId !== tenantId) {
      throw new Error("No tienes permisos para eliminar clientes en este tenant")
    }

    if (!ObjectId.isValid(clientId)) {
      throw new Error("El ID del cliente no es válido")
    }

    const result = await cuentaCollection.updateOne(
      { 
        _id: new ObjectId(clientId),
        tenantId: tenantId,
        role: "cliente"
      },
      { 
        $set: { 
          status: "deleted",
          deletedAt: new Date(),
          deletedBy: adminUser._id
        } 
      }
    )

    if (result.modifiedCount === 0) {
      throw new Error("Cliente no encontrado o ya eliminado")
    }

    // Actualizar estadísticas del tenant
    const { updateTenantStats } = await import("./tenants.services.js")
    await updateTenantStats(tenantId)

    return {
      message: "Cliente eliminado exitosamente"
    }
  } catch (error) {
    console.error("Error en deleteClientUser:", error)
    throw error
  }
}

// Asignar instalaciones a un cliente
async function assignInstallationsToClient(clientId, installationIds, adminUser, tenantId) {
  try {
    // Verificar que el usuario que asigna sea admin
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      throw new Error("No tienes permisos para asignar instalaciones")
    }

    // Para admin normal, verificar tenant
    if (adminUser.role === "admin" && adminUser.tenantId !== tenantId) {
      throw new Error("No tienes permisos para asignar instalaciones en este tenant")
    }

    if (!ObjectId.isValid(clientId)) {
      throw new Error("El ID del cliente no es válido")
    }

    // Verificar que el cliente existe
    const cliente = await cuentaCollection.findOne({ 
      _id: new ObjectId(clientId),
      tenantId: tenantId,
      role: "cliente"
    })

    if (!cliente) {
      throw new Error("Cliente no encontrado en este tenant")
    }

    // Verificar que todas las instalaciones existen y pertenecen al tenant
    const installationObjectIds = installationIds.map(id => {
      if (!ObjectId.isValid(id)) {
        throw new Error(`ID de instalación no válido: ${id}`)
      }
      return new ObjectId(id)
    })

    const instalaciones = await installationsCollection
      .find({ 
        _id: { $in: installationObjectIds },
        tenantId: tenantId
      })
      .toArray()

    if (instalaciones.length !== installationIds.length) {
      throw new Error("Una o más instalaciones no pertenecen a este tenant o no existen")
    }

    // Asignar las instalaciones al cliente
    const result = await cuentaCollection.updateOne(
      { _id: new ObjectId(clientId) },
      { 
        $set: { 
          instalacionesAsignadas: installationIds,
          updatedAt: new Date(),
          updatedBy: adminUser._id
        } 
      }
    )

    if (result.modifiedCount === 0) {
      throw new Error("No se pudieron asignar las instalaciones")
    }

    return {
      message: "Instalaciones asignadas exitosamente",
      instalacionesAsignadas: installationIds.length
    }
  } catch (error) {
    console.error("Error en assignInstallationsToClient:", error)
    throw error
  }
}

// Obtener instalaciones de un cliente
async function getClientInstallations(clientId, tenantId) {
  try {
    if (!ObjectId.isValid(clientId)) {
      throw new Error("El ID del cliente no es válido")
    }

    const cliente = await cuentaCollection.findOne({ 
      _id: new ObjectId(clientId),
      tenantId: tenantId,
      role: "cliente"
    })

    if (!cliente) {
      throw new Error("Cliente no encontrado")
    }

    if (!cliente.instalacionesAsignadas || cliente.instalacionesAsignadas.length === 0) {
      return []
    }

    // Obtener las instalaciones asignadas
    const installationObjectIds = cliente.instalacionesAsignadas
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id))

    const instalaciones = await installationsCollection
      .find({ 
        _id: { $in: installationObjectIds },
        tenantId: tenantId
      })
      .toArray()

    return instalaciones
  } catch (error) {
    console.error("Error en getClientInstallations:", error)
    throw error
  }
}

export {
  createClientUser,
  getClientUsers,
  getClientUserById,
  updateClientUser,
  deleteClientUser,
  assignInstallationsToClient,
  getClientInstallations,
}
