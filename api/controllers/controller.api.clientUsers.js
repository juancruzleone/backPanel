import * as service from "../../services/clientUsers.services.js"

// Crear un nuevo usuario cliente
const createClientUser = async (req, res) => {
  try {
    const tenantId = req.user.tenantId
    const result = await service.createClientUser(req.body, req.user, tenantId)
    res.status(201).json(result)
  } catch (error) {
    console.error("Error en createClientUser:", error)
    res.status(400).json({ 
      error: { 
        message: error.message || "Error al crear el cliente" 
      } 
    })
  }
}

// Obtener todos los usuarios clientes del tenant
const getClientUsers = async (req, res) => {
  try {
    const tenantId = req.user.tenantId
    const clientes = await service.getClientUsers(tenantId)
    res.status(200).json(clientes)
  } catch (error) {
    console.error("Error en getClientUsers:", error)
    res.status(500).json({ 
      error: { 
        message: error.message || "Error al obtener los clientes" 
      } 
    })
  }
}

// Obtener un usuario cliente por ID
const getClientUserById = async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.user.tenantId
    const cliente = await service.getClientUserById(id, tenantId)
    res.status(200).json(cliente)
  } catch (error) {
    console.error("Error en getClientUserById:", error)
    const status = error.message.includes("no encontrado") ? 404 : 400
    res.status(status).json({ 
      error: { 
        message: error.message || "Error al obtener el cliente" 
      } 
    })
  }
}

// Actualizar un usuario cliente
const updateClientUser = async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.user.tenantId
    const result = await service.updateClientUser(id, req.body, req.user, tenantId)
    res.status(200).json(result)
  } catch (error) {
    console.error("Error en updateClientUser:", error)
    const status = error.message.includes("no encontrado") ? 404 : 400
    res.status(status).json({ 
      error: { 
        message: error.message || "Error al actualizar el cliente" 
      } 
    })
  }
}

// Eliminar un usuario cliente (soft delete)
const deleteClientUser = async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.user.tenantId
    const result = await service.deleteClientUser(id, req.user, tenantId)
    res.status(200).json(result)
  } catch (error) {
    console.error("Error en deleteClientUser:", error)
    const status = error.message.includes("no encontrado") ? 404 : 400
    res.status(status).json({ 
      error: { 
        message: error.message || "Error al eliminar el cliente" 
      } 
    })
  }
}

// Asignar instalaciones a un cliente
const assignInstallations = async (req, res) => {
  try {
    const { id } = req.params
    const { installationIds } = req.body
    const tenantId = req.user.tenantId
    const result = await service.assignInstallationsToClient(id, installationIds, req.user, tenantId)
    res.status(200).json(result)
  } catch (error) {
    console.error("Error en assignInstallations:", error)
    const status = error.message.includes("no encontrado") ? 404 : 400
    res.status(status).json({ 
      error: { 
        message: error.message || "Error al asignar instalaciones" 
      } 
    })
  }
}

// Obtener instalaciones de un cliente
const getClientInstallations = async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.user.tenantId
    const instalaciones = await service.getClientInstallations(id, tenantId)
    res.status(200).json(instalaciones)
  } catch (error) {
    console.error("Error en getClientInstallations:", error)
    const status = error.message.includes("no encontrado") ? 404 : 400
    res.status(status).json({ 
      error: { 
        message: error.message || "Error al obtener instalaciones del cliente" 
      } 
    })
  }
}

export {
  createClientUser,
  getClientUsers,
  getClientUserById,
  updateClientUser,
  deleteClientUser,
  assignInstallations,
  getClientInstallations,
}
