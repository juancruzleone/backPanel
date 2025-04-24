import * as service from "../../services/installations.services.js"

// Obtener todas las instalaciones
async function getInstallations(req, res) {
  try {
    const installations = await service.getInstallations()
    res.status(200).json(installations)
  } catch (error) {
    console.error("Error al obtener instalaciones:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
}

// Crear una nueva instalación
async function createInstallation(req, res) {
  try {
    const installationData = req.body
    const newInstallation = await service.createInstallation(installationData)
    res.status(201).json(newInstallation)
  } catch (error) {
    console.error("Error al crear instalación:", error)
    res.status(400).json({ error: error.message || "Error al crear la instalación" })
  }
}

// Actualizar una instalación existente
async function updateInstallation(req, res) {
  try {
    const { id } = req.params
    const installationData = req.body
    const updatedInstallation = await service.updateInstallation(id, installationData)
    res.status(200).json(updatedInstallation)
  } catch (error) {
    console.error("Error al actualizar instalación:", error)
    res.status(400).json({ error: error.message || "Error al actualizar la instalación" })
  }
}

// Eliminar una instalación
async function deleteInstallation(req, res) {
  try {
    const { id } = req.params
    await service.deleteInstallation(id)
    res.status(204).send()
  } catch (error) {
    console.error("Error al eliminar instalación:", error)
    res.status(400).json({ error: error.message || "Error al eliminar la instalación" })
  }
}

// Agregar un dispositivo a una instalación
async function addDeviceToInstallation(req, res) {
  try {
    const { id } = req.params
    const deviceData = req.body
    const result = await service.addDeviceToInstallation(id, deviceData)
    res.status(201).json(result)
  } catch (error) {
    console.error("Error al agregar dispositivo:", error)
    res.status(400).json({ error: error.message || "Error al agregar el dispositivo" })
  }
}

// Actualizar un dispositivo en una instalación
async function updateDeviceInInstallation(req, res) {
  try {
    const { id, deviceId } = req.params
    const deviceData = req.body
    const result = await service.updateDeviceInInstallation(id, deviceId, deviceData)
    res.status(200).json(result)
  } catch (error) {
    console.error("Error al actualizar dispositivo:", error)
    res.status(400).json({ error: error.message || "Error al actualizar el dispositivo" })
  }
}

// Eliminar un dispositivo de una instalación
async function deleteDeviceFromInstallation(req, res) {
  try {
    const { id, deviceId } = req.params
    const result = await service.deleteDeviceFromInstallation(id, deviceId)
    res.status(200).json(result)
  } catch (error) {
    console.error("Error al eliminar dispositivo:", error)
    res.status(400).json({ error: error.message || "Error al eliminar el dispositivo" })
  }
}

// Obtener el formulario de un dispositivo
async function getDeviceForm(req, res) {
  try {
    const { installationId, deviceId } = req.params
    const formData = await service.getDeviceForm(installationId, deviceId)
    res.status(200).json(formData)
  } catch (error) {
    console.error("Error al obtener formulario:", error)
    res.status(400).json({ error: error.message || "Error al obtener el formulario" })
  }
}

// Manejar el envío de un formulario de mantenimiento
async function handleMaintenanceSubmission(req, res) {
  try {
    const { installationId, deviceId } = req.params
    const formResponses = req.body
    const result = await service.handleMaintenanceSubmission(installationId, deviceId, formResponses)
    res.status(201).json(result)
  } catch (error) {
    console.error("Error al procesar mantenimiento:", error)
    res.status(400).json({ error: error.message || "Error al procesar el mantenimiento" })
  }
}

// Obtener el último mantenimiento de un dispositivo
async function getLastMaintenanceForDevice(req, res) {
  try {
    const { installationId, deviceId } = req.params
    const maintenance = await service.getLastMaintenanceForDevice(installationId, deviceId)
    if (!maintenance) {
      return res.status(404).json({ message: "No se encontraron registros de mantenimiento" })
    }
    res.status(200).json(maintenance)
  } catch (error) {
    console.error("Error al obtener mantenimiento:", error)
    res.status(400).json({ error: error.message || "Error al obtener el mantenimiento" })
  }
}

// Obtener todos los dispositivos de una instalación
async function getDevicesFromInstallation(req, res) {
  try {
    const { id } = req.params
    const devices = await service.getDevicesFromInstallation(id)
    res.status(200).json(devices)
  } catch (error) {
    console.error("Error al obtener dispositivos:", error)
    res.status(400).json({ error: error.message || "Error al obtener los dispositivos" })
  }
}

// Agregar un activo existente a una instalación
async function addExistingAssetToInstallation(req, res) {
  try {
    const { id } = req.params
    const { assetId } = req.body
    const result = await service.addExistingAssetToInstallation(id, assetId)
    res.status(201).json(result)
  } catch (error) {
    console.error("Error al agregar activo existente:", error)
    res.status(400).json({ error: error.message || "Error al agregar el activo a la instalación" })
  }
}

// Nueva función específica para asignar plantilla a un dispositivo
async function assignTemplateToDevice(req, res) {
  try {
    const { id, deviceId } = req.params
    const { templateId } = req.body

    const result = await service.assignTemplateToDevice(id, deviceId, templateId)
    res.status(200).json(result)
  } catch (error) {
    console.error("Error al asignar plantilla al dispositivo:", error)
    res.status(400).json({ error: error.message || "Error al asignar plantilla" })
  }
}

export {
  getInstallations,
  createInstallation,
  updateInstallation,
  deleteInstallation,
  addDeviceToInstallation,
  updateDeviceInInstallation,
  deleteDeviceFromInstallation,
  getDeviceForm,
  handleMaintenanceSubmission,
  getLastMaintenanceForDevice,
  getDevicesFromInstallation,
  addExistingAssetToInstallation,
  assignTemplateToDevice
}