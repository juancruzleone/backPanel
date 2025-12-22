import { db } from "../db.js"
import { ObjectId } from "mongodb"

const installationsCollection = db.collection("instalaciones")
const assetsCollection = db.collection("activos")
const cuentaCollection = db.collection("cuentas")
const workOrdersCollection = db.collection("ordenesTrabajo")
const manualsCollection = db.collection("manuales")

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

// Obtener todas las órdenes de trabajo de las instalaciones del cliente
async function getClientWorkOrders(clientUser) {
  try {
    if (!clientUser || clientUser.role !== "cliente") {
      throw new Error("Usuario no es un cliente válido")
    }

    if (!clientUser.instalacionesAsignadas || clientUser.instalacionesAsignadas.length === 0) {
      return []
    }

    // Obtener todas las órdenes de trabajo de las instalaciones asignadas
    const ordenesTrabajo = await workOrdersCollection
      .find({ 
        instalacionId: { $in: clientUser.instalacionesAsignadas },
        tenantId: clientUser.tenantId
      })
      .sort({ createdAt: -1 })
      .toArray()

    return ordenesTrabajo
  } catch (error) {
    console.error("Error en getClientWorkOrders:", error)
    throw error
  }
}

// Obtener detalle de una orden de trabajo específica
async function getClientWorkOrderDetail(workOrderId, clientUser) {
  try {
    if (!clientUser || clientUser.role !== "cliente") {
      throw new Error("Usuario no es un cliente válido")
    }

    if (!ObjectId.isValid(workOrderId)) {
      throw new Error("El ID de la orden de trabajo no es válido")
    }

    // Obtener la orden de trabajo
    const ordenTrabajo = await workOrdersCollection.findOne({ 
      _id: new ObjectId(workOrderId),
      tenantId: clientUser.tenantId
    })

    if (!ordenTrabajo) {
      throw new Error("Orden de trabajo no encontrada")
    }

    // Verificar que la orden pertenece a una instalación asignada al cliente
    if (!clientUser.instalacionesAsignadas || !clientUser.instalacionesAsignadas.includes(ordenTrabajo.instalacionId)) {
      throw new Error("No tienes acceso a esta orden de trabajo")
    }

    return ordenTrabajo
  } catch (error) {
    console.error("Error en getClientWorkOrderDetail:", error)
    throw error
  }
}

// Obtener todos los manuales de los activos de las instalaciones del cliente
async function getClientManuals(clientUser) {
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

    // Obtener los IDs de activos únicos
    const assetIds = [...new Set(dispositivos.map(d => d._id.toString()))]

    if (assetIds.length === 0) {
      return []
    }

    // Obtener todos los manuales de esos activos
    const manuales = await manualsCollection
      .find({ 
        assetId: { $in: assetIds },
        tenantId: clientUser.tenantId
      })
      .sort({ _id: -1 })
      .toArray()

    return manuales
  } catch (error) {
    console.error("Error en getClientManuals:", error)
    throw error
  }
}

// Obtener detalle de un manual específico
async function getClientManualDetail(manualId, clientUser) {
  try {
    if (!clientUser || clientUser.role !== "cliente") {
      throw new Error("Usuario no es un cliente válido")
    }

    if (!ObjectId.isValid(manualId)) {
      throw new Error("El ID del manual no es válido")
    }

    // Obtener el manual
    const manual = await manualsCollection.findOne({ 
      _id: new ObjectId(manualId),
      tenantId: clientUser.tenantId
    })

    if (!manual) {
      throw new Error("Manual no encontrado")
    }

    // Verificar que el manual pertenece a un activo de una instalación asignada
    const dispositivo = await assetsCollection.findOne({ 
      _id: new ObjectId(manual.assetId),
      tenantId: clientUser.tenantId
    })

    if (!dispositivo) {
      throw new Error("Activo asociado no encontrado")
    }

    if (!clientUser.instalacionesAsignadas || !clientUser.instalacionesAsignadas.includes(dispositivo.instalacionId)) {
      throw new Error("No tienes acceso a este manual")
    }

    return manual
  } catch (error) {
    console.error("Error en getClientManualDetail:", error)
    throw error
  }
}

// Obtener manuales de un activo específico
async function getClientManualsByAsset(assetId, clientUser) {
  try {
    if (!clientUser || clientUser.role !== "cliente") {
      throw new Error("Usuario no es un cliente válido")
    }

    if (!ObjectId.isValid(assetId)) {
      throw new Error("El ID del activo no es válido")
    }

    // Verificar que el activo pertenece a una instalación asignada
    const dispositivo = await assetsCollection.findOne({ 
      _id: new ObjectId(assetId),
      tenantId: clientUser.tenantId
    })

    if (!dispositivo) {
      throw new Error("Activo no encontrado")
    }

    if (!clientUser.instalacionesAsignadas || !clientUser.instalacionesAsignadas.includes(dispositivo.instalacionId)) {
      throw new Error("No tienes acceso a este activo")
    }

    // Obtener los manuales del activo
    const manuales = await manualsCollection
      .find({ 
        assetId: assetId,
        tenantId: clientUser.tenantId
      })
      .sort({ _id: -1 })
      .toArray()

    return manuales
  } catch (error) {
    console.error("Error en getClientManualsByAsset:", error)
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
  getClientWorkOrders,
  getClientWorkOrderDetail,
  getClientManuals,
  getClientManualDetail,
  getClientManualsByAsset,
}
