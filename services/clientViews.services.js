import { db } from "../db.js"
import { ObjectId } from "mongodb"

const installationsCollection = db.collection("instalaciones")
const assetsCollection = db.collection("activos")
const cuentaCollection = db.collection("cuentas")

// Obtener todas las instalaciones asignadas a un cliente
async function getClientAssignedInstallations(clientUser) {
  try {
    if (!clientUser || clientUser.role !== "cliente") {
      throw new Error("Usuario no es un cliente válido")
    }

    // Verificar si el cliente tiene instalaciones asignadas
    if (!clientUser.instalacionesAsignadas || clientUser.instalacionesAsignadas.length === 0) {
      return []
    }

    // Convertir los IDs a ObjectId
    const installationObjectIds = clientUser.instalacionesAsignadas
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id))

    // Obtener las instalaciones del tenant del cliente
    const instalaciones = await installationsCollection
      .find({ 
        _id: { $in: installationObjectIds },
        tenantId: clientUser.tenantId
      })
      .sort({ _id: -1 })
      .toArray()

    return instalaciones
  } catch (error) {
    console.error("Error en getClientAssignedInstallations:", error)
    throw error
  }
}

// Obtener detalle de una instalación específica con sus dispositivos
async function getClientInstallationDetail(installationId, clientUser) {
  try {
    if (!clientUser || clientUser.role !== "cliente") {
      throw new Error("Usuario no es un cliente válido")
    }

    if (!ObjectId.isValid(installationId)) {
      throw new Error("El ID de la instalación no es válido")
    }

    // Verificar que la instalación esté asignada al cliente
    if (!clientUser.instalacionesAsignadas || !clientUser.instalacionesAsignadas.includes(installationId)) {
      throw new Error("No tienes acceso a esta instalación")
    }

    // Obtener la instalación
    const instalacion = await installationsCollection.findOne({ 
      _id: new ObjectId(installationId),
      tenantId: clientUser.tenantId
    })

    if (!instalacion) {
      throw new Error("Instalación no encontrada")
    }

    // Obtener los dispositivos de la instalación
    const dispositivos = await assetsCollection
      .find({ 
        instalacionId: installationId,
        tenantId: clientUser.tenantId
      })
      .sort({ _id: -1 })
      .toArray()

    return {
      ...instalacion,
      devices: dispositivos
    }
  } catch (error) {
    console.error("Error en getClientInstallationDetail:", error)
    throw error
  }
}

// Obtener todos los dispositivos de las instalaciones del cliente
async function getClientDevices(clientUser) {
  try {
    if (!clientUser || clientUser.role !== "cliente") {
      throw new Error("Usuario no es un cliente válido")
    }

    if (!clientUser.instalacionesAsignadas || clientUser.instalacionesAsignadas.length === 0) {
      return []
    }

    // Obtener todos los dispositivos de las instalaciones asignadas
    const dispositivos = await assetsCollection
      .find({ 
        instalacionId: { $in: clientUser.instalacionesAsignadas },
        tenantId: clientUser.tenantId
      })
      .sort({ _id: -1 })
      .toArray()

    return dispositivos
  } catch (error) {
    console.error("Error en getClientDevices:", error)
    throw error
  }
}

// Obtener detalle de un dispositivo específico con su historial de mantenimientos
async function getClientDeviceDetail(deviceId, clientUser) {
  try {
    if (!clientUser || clientUser.role !== "cliente") {
      throw new Error("Usuario no es un cliente válido")
    }

    if (!ObjectId.isValid(deviceId)) {
      throw new Error("El ID del dispositivo no es válido")
    }

    // Obtener el dispositivo
    const dispositivo = await assetsCollection.findOne({ 
      _id: new ObjectId(deviceId),
      tenantId: clientUser.tenantId
    })

    if (!dispositivo) {
      throw new Error("Dispositivo no encontrado")
    }

    // Verificar que el dispositivo pertenece a una instalación asignada al cliente
    if (!clientUser.instalacionesAsignadas || !clientUser.instalacionesAsignadas.includes(dispositivo.instalacionId)) {
      throw new Error("No tienes acceso a este dispositivo")
    }

    return dispositivo
  } catch (error) {
    console.error("Error en getClientDeviceDetail:", error)
    throw error
  }
}

// Obtener historial de mantenimientos de un dispositivo
async function getDeviceMaintenanceHistory(deviceId, clientUser) {
  try {
    if (!clientUser || clientUser.role !== "cliente") {
      throw new Error("Usuario no es un cliente válido")
    }

    if (!ObjectId.isValid(deviceId)) {
      throw new Error("El ID del dispositivo no es válido")
    }

    // Obtener el dispositivo primero para verificar acceso
    const dispositivo = await assetsCollection.findOne({ 
      _id: new ObjectId(deviceId),
      tenantId: clientUser.tenantId
    })

    if (!dispositivo) {
      throw new Error("Dispositivo no encontrado")
    }

    // Verificar que el dispositivo pertenece a una instalación asignada al cliente
    if (!clientUser.instalacionesAsignadas || !clientUser.instalacionesAsignadas.includes(dispositivo.instalacionId)) {
      throw new Error("No tienes acceso a este dispositivo")
    }

    // El historial de mantenimientos está en el campo maintenanceHistory del dispositivo
    const historialMantenimientos = dispositivo.maintenanceHistory || []

    // Ordenar por fecha de mantenimiento (más reciente primero)
    historialMantenimientos.sort((a, b) => {
      const dateA = a.maintenanceDate ? new Date(a.maintenanceDate) : new Date(0)
      const dateB = b.maintenanceDate ? new Date(b.maintenanceDate) : new Date(0)
      return dateB - dateA
    })

    return {
      dispositivoId: deviceId,
      dispositivoNombre: dispositivo.name,
      instalacionId: dispositivo.instalacionId,
      historialMantenimientos
    }
  } catch (error) {
    console.error("Error en getDeviceMaintenanceHistory:", error)
    throw error
  }
}

// Obtener todos los mantenimientos de todas las instalaciones del cliente
async function getAllClientMaintenances(clientUser) {
  try {
    if (!clientUser || clientUser.role !== "cliente") {
      throw new Error("Usuario no es un cliente válido")
    }

    if (!clientUser.instalacionesAsignadas || clientUser.instalacionesAsignadas.length === 0) {
      return []
    }

    // Obtener todos los dispositivos de las instalaciones asignadas
    const dispositivos = await assetsCollection
      .find({ 
        instalacionId: { $in: clientUser.instalacionesAsignadas },
        tenantId: clientUser.tenantId
      })
      .toArray()

    // Recopilar todos los mantenimientos con información del dispositivo e instalación
    const todosLosMantenimientos = []
    
    for (const dispositivo of dispositivos) {
      if (dispositivo.maintenanceHistory && dispositivo.maintenanceHistory.length > 0) {
        const mantenimientosConInfo = dispositivo.maintenanceHistory.map(mantenimiento => ({
          ...mantenimiento,
          dispositivoId: dispositivo._id.toString(),
          dispositivoNombre: dispositivo.name,
          instalacionId: dispositivo.instalacionId,
          categoria: dispositivo.category
        }))
        todosLosMantenimientos.push(...mantenimientosConInfo)
      }
    }

    // Ordenar todos los mantenimientos por fecha (más reciente primero)
    todosLosMantenimientos.sort((a, b) => {
      const dateA = a.maintenanceDate ? new Date(a.maintenanceDate) : new Date(0)
      const dateB = b.maintenanceDate ? new Date(b.maintenanceDate) : new Date(0)
      return dateB - dateA
    })

    return todosLosMantenimientos
  } catch (error) {
    console.error("Error en getAllClientMaintenances:", error)
    throw error
  }
}

export {
  getClientAssignedInstallations,
  getClientInstallationDetail,
  getClientDevices,
  getClientDeviceDetail,
  getDeviceMaintenanceHistory,
  getAllClientMaintenances,
}
