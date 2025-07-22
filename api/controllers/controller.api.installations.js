import * as service from "../../services/installations.services.js"

// Obtener todas las instalaciones
async function getInstallations(req, res) {
  try {
    const installations = await service.getInstallations()
    res.status(200).json(installations)
  } catch (error) {
    console.error("Error al obtener instalaciones:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    })
  }
}

// Obtener instalación por ID
async function getInstallationById(req, res) {
  try {
    const { id } = req.params
    const installation = await service.getInstallationById(id)
    res.status(200).json({
      success: true,
      data: installation,
    })
  } catch (error) {
    console.error("Error al obtener instalación por ID:", error)
    res.status(404).json({
      success: false,
      error: error.message || "Instalación no encontrada",
    })
  }
}

// Crear nueva instalación
async function createInstallation(req, res) {
  try {
    const installationData = req.body
    const newInstallation = await service.createInstallation(installationData)
    res.status(201).json({
      success: true,
      message: "Instalación creada exitosamente",
      data: newInstallation,
    })
  } catch (error) {
    console.error("Error al crear instalación:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al crear la instalación",
    })
  }
}

// Actualizar instalación
async function updateInstallation(req, res) {
  try {
    const { id } = req.params
    const installationData = req.body
    const updatedInstallation = await service.updateInstallation(id, installationData)
    res.status(200).json({
      success: true,
      message: "Instalación actualizada exitosamente",
      data: updatedInstallation,
    })
  } catch (error) {
    console.error("Error al actualizar instalación:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al actualizar la instalación",
    })
  }
}

// Actualizar solo información de suscripción
async function updateInstallationSubscription(req, res) {
  try {
    const { id } = req.params
    const subscriptionData = req.body

    const updatedInstallation = await service.updateInstallationSubscription(id, subscriptionData)
    
    res.status(200).json({
      success: true,
      message: "Información de suscripción actualizada exitosamente",
      data: updatedInstallation,
    })
  } catch (error) {
    console.error("Error al actualizar suscripción:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al actualizar la suscripción",
    })
  }
}

// Eliminar instalación
async function deleteInstallation(req, res) {
  try {
    const { id } = req.params
    await service.deleteInstallation(id)
    res.status(200).json({
      success: true,
      message: "Instalación eliminada exitosamente",
    })
  } catch (error) {
    console.error("Error al eliminar instalación:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al eliminar la instalación",
    })
  }
}

// FUNCIÓN PRINCIPAL: Asignar activo a instalación
async function assignAssetToInstallation(req, res) {
  try {
    const { id } = req.params
    const { assetId, ubicacion, categoria } = req.body

    const result = await service.assignAssetToInstallation(id, assetId, ubicacion, categoria)

    res.status(201).json({
      success: true,
      message: "Activo asignado exitosamente a la instalación",
      data: result,
    })
  } catch (error) {
    console.error("Error al asignar activo a instalación:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al asignar el activo a la instalación",
    })
  }
}

// Agregar dispositivo a instalación (AHORA REQUIERE ACTIVO)
async function addDeviceToInstallation(req, res) {
  try {
    const { id } = req.params
    const deviceData = req.body

    // Verificar que se proporcione assetId
    if (!deviceData.assetId) {
      return res.status(400).json({
        success: false,
        error: "Se requiere assetId. Los dispositivos deben basarse en activos existentes.",
      })
    }

    const result = await service.addDeviceToInstallation(id, deviceData)

    res.status(201).json({
      success: true,
      message: "Dispositivo agregado exitosamente",
      data: result,
    })
  } catch (error) {
    console.error("Error al agregar dispositivo:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al agregar el dispositivo",
    })
  }
}

// Actualizar dispositivo en instalación
async function updateDeviceInInstallation(req, res) {
  try {
    const { id, deviceId } = req.params
    const deviceData = req.body

    const result = await service.updateDeviceInInstallation(id, deviceId, deviceData)

    res.status(200).json({
      success: true,
      message: "Dispositivo actualizado exitosamente",
      data: result,
    })
  } catch (error) {
    console.error("Error al actualizar dispositivo:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al actualizar el dispositivo",
    })
  }
}

// Eliminar dispositivo de instalación
async function deleteDeviceFromInstallation(req, res) {
  try {
    const { id, deviceId } = req.params
    const result = await service.deleteDeviceFromInstallation(id, deviceId)

    res.status(200).json({
      success: true,
      message: "Dispositivo eliminado exitosamente",
      data: result,
    })
  } catch (error) {
    console.error("Error al eliminar dispositivo:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al eliminar el dispositivo",
    })
  }
}

// Obtener formulario de dispositivo
async function getDeviceForm(req, res) {
  try {
    const { installationId, deviceId } = req.params
    const formData = await service.getDeviceForm(installationId, deviceId)

    res.status(200).json({
      success: true,
      data: formData,
    })
  } catch (error) {
    console.error("Error al obtener formulario:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al obtener el formulario",
    })
  }
}

// Manejar envío de mantenimiento
async function handleMaintenanceSubmission(req, res) {
  try {
    const { installationId, deviceId } = req.params
    const formResponses = req.body

    console.log("Mantenimiento registrado")
    const result = await service.handleMaintenanceSubmission(installationId, deviceId, formResponses)

    res.status(201).json({
      success: true,
      message: "Mantenimiento registrado exitosamente",
      data: result,
    })
  } catch (error) {
    console.error("Error al procesar mantenimiento:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al procesar el mantenimiento",
    })
  }
}

// Obtener último mantenimiento de dispositivo
async function getLastMaintenanceForDevice(req, res) {
  try {
    const { installationId, deviceId } = req.params
    const maintenance = await service.getLastMaintenanceForDevice(installationId, deviceId)

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron registros de mantenimiento",
      })
    }

    res.status(200).json({
      success: true,
      data: maintenance,
    })
  } catch (error) {
    console.error("Error al obtener mantenimiento:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al obtener el mantenimiento",
    })
  }
}

// Obtener dispositivos de instalación
async function getDevicesFromInstallation(req, res) {
  try {
    const { id } = req.params
    const devices = await service.getDevicesFromInstallation(id)

    res.status(200).json({
      success: true,
      data: devices,
    })
  } catch (error) {
    console.error("Error al obtener dispositivos:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al obtener los dispositivos",
    })
  }
}

// Asignar plantilla a dispositivo (DEPRECADA)
async function assignTemplateToDevice(req, res) {
  try {
    const { id, deviceId } = req.params
    const { templateId } = req.body

    const result = await service.assignTemplateToDevice(id, deviceId, templateId)

    res.status(200).json({
      success: true,
      message: "Plantilla asignada exitosamente",
      warning: "Considera actualizar la plantilla del activo directamente",
      data: result,
    })
  } catch (error) {
    console.error("Error al asignar plantilla al dispositivo:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al asignar plantilla",
    })
  }
}

export {
  getInstallations,
  getInstallationById,
  createInstallation,
  updateInstallation,
  updateInstallationSubscription, // Nuevo export
  deleteInstallation,
  addDeviceToInstallation,
  updateDeviceInInstallation,
  deleteDeviceFromInstallation,
  getDeviceForm,
  handleMaintenanceSubmission,
  getLastMaintenanceForDevice,
  getDevicesFromInstallation,
  assignAssetToInstallation, // FUNCIÓN PRINCIPA
  assignTemplateToDevice,
}