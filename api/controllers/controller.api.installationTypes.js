import * as service from "../../services/installationTypes.services.js"

const getInstallationTypes = (req, res) => {
  const filter = req.query
  
  // Obtener tenantId del usuario o del request
  const tenantId = req.user.tenantId || req.tenantId
  
  console.log('🔍 [CONTROLLER] getInstallationTypes - tenantId:', tenantId)
  console.log('🔍 [CONTROLLER] req.user.tenantId:', req.user.tenantId)
  console.log('🔍 [CONTROLLER] req.tenantId:', req.tenantId)
  
  service.getInstallationTypes(filter, tenantId).then((tipos) => {
    console.log('✅ [CONTROLLER] Tipos encontrados:', tipos.length)
    res.status(200).json(tipos)
  }).catch((error) => {
    console.error("Error al obtener tipos de instalación:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  })
}

const getInstallationTypeById = (req, res) => {
  const id = req.params.id
  const tenantId = req.user.tenantId
  service.getInstallationTypeById(id, tenantId).then((tipo) => {
    if (tipo) {
      res.status(200).json(tipo)
    } else {
      res.status(404).json({ error: "Tipo de instalación no encontrado" })
    }
  }).catch((error) => {
    console.error("Error al obtener tipo de instalación:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  })
}

const addInstallationType = async (req, res) => {
  try {
    const tipo = { ...req.body }
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: "No tienes permisos para crear tipos de instalación"
      })
    }
    
    // Agregar tenantId a los datos del tipo
    tipo.tenantId = tenantId
    tipo.createdBy = adminUser._id
    
    const newType = await service.addInstallationType(tipo, adminUser)
    res.status(201).json(newType)
  } catch (error) {
    console.error("Error al agregar tipo de instalación:", error)
    res.status(400).json({ error: error.message || "Error al crear el tipo de instalación" })
  }
}

const updateInstallationType = async (req, res) => {
  try {
    const id = req.params.id
    const tipo = { ...req.body }
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: "No tienes permisos para actualizar tipos de instalación"
      })
    }
    
    tipo.updatedBy = adminUser._id
    tipo.updatedAt = new Date()
    
    const updatedType = await service.updateInstallationType(id, tipo, tenantId, adminUser)
    res.status(200).json({ message: "Tipo de instalación actualizado correctamente" })
  } catch (error) {
    console.error("Error al actualizar tipo de instalación:", error)
    res.status(400).json({ error: error.message || "Error al actualizar el tipo de instalación" })
  }
}

const deleteInstallationType = async (req, res) => {
  try {
    const id = req.params.id
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        error: "No tienes permisos para eliminar tipos de instalación"
      })
    }
    
    await service.deleteInstallationType(id, tenantId, adminUser)
    res.status(200).json({ message: "Tipo de instalación eliminado correctamente" })
  } catch (error) {
    console.error("Error al eliminar tipo de instalación:", error)
    res.status(400).json({ error: error.message || "Error al eliminar el tipo de instalación" })
  }
}

export { 
  getInstallationTypes, 
  getInstallationTypeById, 
  addInstallationType, 
  updateInstallationType, 
  deleteInstallationType 
}