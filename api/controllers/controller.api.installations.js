import * as service from "../../services/installations.services.js"

// Obtener todas las instalaciones
async function getInstallations(req, res) {
  try {
    // Filtrar por tenant del usuario
    const tenantId = req.user.tenantId
    const installations = await service.getInstallations(tenantId)
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
    const tenantId = req.user.tenantId
    const installation = await service.getInstallationById(id, tenantId)
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
    const adminUser = req.user
    const tenantId = req.user.tenantId

    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        success: false,
        error: "No tienes permisos para crear instalaciones"
      })
    }

    // Agregar tenantId a los datos de la instalación
    installationData.tenantId = tenantId
    installationData.createdBy = adminUser._id

    const newInstallation = await service.createInstallation(installationData, adminUser)
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
    const adminUser = req.user
    const tenantId = req.user.tenantId

    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        success: false,
        error: "No tienes permisos para actualizar instalaciones"
      })
    }

    const updatedInstallation = await service.updateInstallation(id, installationData, tenantId, adminUser)
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
    console.log('🎯 [CONTROLLER] updateInstallationSubscription EJECUTÁNDOSE')
    console.log('🎯 [CONTROLLER] ID:', req.params.id)
    console.log('🎯 [CONTROLLER] Body recibido:', req.body)

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
    const adminUser = req.user
    const tenantId = req.user.tenantId

    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        success: false,
        error: "No tienes permisos para eliminar instalaciones"
      })
    }

    await service.deleteInstallation(id, tenantId, adminUser)
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

// Obtener todos los mantenimientos de dispositivo
async function getAllMaintenanceForDevice(req, res) {
  try {
    const { installationId, deviceId } = req.params
    console.log('📋 [AUTENTICADO] Solicitud de historial completo:', { installationId, deviceId })

    const maintenanceList = await service.getAllMaintenanceForDevice(installationId, deviceId)

    console.log('✅ Mantenimientos encontrados:', maintenanceList.length)

    // Log detallado de cada mantenimiento
    maintenanceList.forEach((m, index) => {
      console.log(`   [${index + 1}] _id:`, m._id)
      console.log(`   [${index + 1}] date:`, m.date)
      console.log(`   [${index + 1}] pdfUrl:`, m.pdfUrl || '❌ NO TIENE pdfUrl')
      console.log(`   [${index + 1}] formattedDate:`, m.formattedDate)
    })

    // Advertencia si algún mantenimiento no tiene pdfUrl
    const sinPdf = maintenanceList.filter(m => !m.pdfUrl)
    if (sinPdf.length > 0) {
      console.error(`⚠️ ADVERTENCIA: ${sinPdf.length} mantenimientos SIN pdfUrl`)
    }

    res.status(200).json({
      success: true,
      data: maintenanceList,
      count: maintenanceList.length
    })
  } catch (error) {
    console.error("❌ Error al obtener historial de mantenimientos:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al obtener el historial de mantenimientos",
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


// Subir documento a instalación
async function uploadInstallationDocument(req, res) {
  try {
    const { id } = req.params;

    // Verificar si se subió el archivo (el middleware ya lo procesó)
    if (!req.cloudinaryFile) {
      return res.status(400).json({
        success: false,
        error: "No se proporcionó ningún archivo"
      });
    }

    const documentData = {
      name: req.body.name || req.cloudinaryFile.original_filename,
      url: req.cloudinaryFile.secure_url,
      type: req.cloudinaryFile.format,
      size: req.cloudinaryFile.bytes,
      public_id: req.cloudinaryFile.public_id,
      uploadedBy: req.user._id,
      metadata: req.cloudinaryFile
    };

    const newDocument = await service.addDocumentToInstallation(id, documentData);

    res.status(201).json({
      success: true,
      message: "Documento subido exitosamente",
      data: newDocument
    });

  } catch (error) {
    console.error("Error al subir documento:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Error al subir el documento"
    });
  }
}


// Obtener todos los documentos de una instalación
async function getInstallationDocuments(req, res) {
  try {
    const { id } = req.params;

    // El middleware identifyTenantByHeader ya verifica el tenant
    // Podríamos añadir validación extra de pertenencia si es necesario, 
    // pero services.getDocumentsFromInstallation solo pide el ID por ahora.
    // Lo ideal sería validar que la instalación pertenezca al Tenant.
    // Sin embargo getInstallationById ya lo hace.
    // Usaremos el servicio.

    // Primero verificamos que la instalación pertenezca al tenant del usuario
    // (Opcional si confiamos en que el ID difícilmente se adivina, pero mejor seguridad)
    const tenantId = req.user.tenantId;
    await service.getInstallationById(id, tenantId); // Esto lanzará error si no existe o no es del tenant

    const documents = await service.getDocumentsFromInstallation(id);

    res.status(200).json({
      success: true,
      data: documents,
      count: documents.length
    });

  } catch (error) {
    console.error("Error al obtener documentos:", error);
    // Si es error de no encontrado, devolver 404
    if (error.message === "Instalación no encontrada") {
      return res.status(404).json({
        success: false,
        error: "Instalación no encontrada"
      });
    }

    res.status(400).json({
      success: false,
      error: error.message || "Error al obtener los documentos"
    });
  }
}

export {
  getInstallations,
  getInstallationById,
  createInstallation,
  updateInstallation,
  updateInstallationSubscription,
  deleteInstallation,
  addDeviceToInstallation,
  updateDeviceInInstallation,
  deleteDeviceFromInstallation,
  getDeviceForm,
  handleMaintenanceSubmission,
  getLastMaintenanceForDevice,
  getAllMaintenanceForDevice,
  getDevicesFromInstallation,
  assignAssetToInstallation,
  assignTemplateToDevice,
  uploadInstallationDocument,
  getInstallationDocuments, // New export
}