import * as service from "../../services/clientViews.services.js"

// Obtener todas las instalaciones asignadas al cliente
const getMyInstallations = async (req, res) => {
  try {
    const instalaciones = await service.getClientAssignedInstallations(req.user)
    res.status(200).json(instalaciones)
  } catch (error) {
    console.error("Error en getMyInstallations:", error)
    res.status(500).json({ 
      error: { 
        message: error.message || "Error al obtener las instalaciones" 
      } 
    })
  }
}

// Obtener detalle de una instalación específica con dispositivos
const getInstallationDetail = async (req, res) => {
  try {
    const { id } = req.params
    const instalacion = await service.getClientInstallationDetail(id, req.user)
    res.status(200).json(instalacion)
  } catch (error) {
    console.error("Error en getInstallationDetail:", error)
    const status = error.message.includes("no encontrada") || error.message.includes("No tienes acceso") ? 404 : 400
    res.status(status).json({ 
      error: { 
        message: error.message || "Error al obtener el detalle de la instalación" 
      } 
    })
  }
}

// Obtener todos los dispositivos de las instalaciones del cliente
const getMyDevices = async (req, res) => {
  try {
    const dispositivos = await service.getClientDevices(req.user)
    res.status(200).json(dispositivos)
  } catch (error) {
    console.error("Error en getMyDevices:", error)
    res.status(500).json({ 
      error: { 
        message: error.message || "Error al obtener los dispositivos" 
      } 
    })
  }
}

// Obtener detalle de un dispositivo específico
const getDeviceDetail = async (req, res) => {
  try {
    const { id } = req.params
    const dispositivo = await service.getClientDeviceDetail(id, req.user)
    res.status(200).json(dispositivo)
  } catch (error) {
    console.error("Error en getDeviceDetail:", error)
    const status = error.message.includes("no encontrado") || error.message.includes("No tienes acceso") ? 404 : 400
    res.status(status).json({ 
      error: { 
        message: error.message || "Error al obtener el detalle del dispositivo" 
      } 
    })
  }
}

// Obtener historial de mantenimientos de un dispositivo
const getDeviceMaintenanceHistory = async (req, res) => {
  try {
    const { id } = req.params
    const historial = await service.getDeviceMaintenanceHistory(id, req.user)
    res.status(200).json(historial)
  } catch (error) {
    console.error("Error en getDeviceMaintenanceHistory:", error)
    const status = error.message.includes("no encontrado") || error.message.includes("No tienes acceso") ? 404 : 400
    res.status(status).json({ 
      error: { 
        message: error.message || "Error al obtener el historial de mantenimientos" 
      } 
    })
  }
}

// Obtener todos los mantenimientos de todas las instalaciones del cliente
const getAllMyMaintenances = async (req, res) => {
  try {
    const mantenimientos = await service.getAllClientMaintenances(req.user)
    res.status(200).json(mantenimientos)
  } catch (error) {
    console.error("Error en getAllMyMaintenances:", error)
    res.status(500).json({ 
      error: { 
        message: error.message || "Error al obtener los mantenimientos" 
      } 
    })
  }
}

export {
  getMyInstallations,
  getInstallationDetail,
  getMyDevices,
  getDeviceDetail,
  getDeviceMaintenanceHistory,
  getAllMyMaintenances,
}
