import { db } from "../db.js"
import { ObjectId } from "mongodb"
import { generatePDF } from "./pdfGenerator.services.js"
import { getFormFieldsByCategory, getFormTemplateById } from "./formFields.services.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import cloudinary from "../config/cloudinary.config.js"
import { Readable } from "stream"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const installationsCollection = db.collection("instalaciones")
const assetsCollection = db.collection("activos")

// Asegurarse de que el directorio de PDFs exista (para respaldo local)
const pdfDirectory = path.join(__dirname, "..", "..", "public", "pdfs")
if (!fs.existsSync(pdfDirectory)) {
  fs.mkdirSync(pdfDirectory, { recursive: true })
}

// Función para formatear la fecha en formato DD/MM/YYYY HH:MM
function formatDateTime(date) {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return {
    formattedDate: `${day}/${month}/${year}`,
    formattedTime: `${hours}:${minutes}`,
    fullDateTime: `${day}/${month}/${year} ${hours}:${minutes}`,
  }
}

// Función para subir un buffer a Cloudinary
async function uploadBufferToCloudinary(buffer, installationId, deviceId, timestamp) {
  return new Promise((resolve, reject) => {
    const stream = Readable.from(buffer)
    const folder = `instalaciones/${installationId}/dispositivos/${deviceId}`
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: `maintenance_${timestamp}`,
        resource_type: "raw",
        format: "pdf",
      },
      (error, result) => {
        if (error) {
          console.error("Error al subir a Cloudinary:", error)
          reject(error)
        } else {
          resolve(result)
        }
      },
    )
    stream.pipe(uploadStream)
  })
}

// Obtener todas las instalaciones
async function getInstallations(tenantId = null) {
  try {
    const query = {}
    if (tenantId) {
      query.tenantId = tenantId
    }
    
    const installations = await installationsCollection.find(query).sort({ _id: -1 }).toArray()
    return installations
  } catch (error) {
    console.error("Error en getInstallations:", error)
    throw new Error("Error al obtener las instalaciones")
  }
}

// Obtener instalación por ID
async function getInstallationById(id, tenantId = null) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("El ID de la instalación no es válido")
    }

    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    const installation = await installationsCollection.findOne(query)

    if (!installation) {
      throw new Error("Instalación no encontrada")
    }

    return installation
  } catch (error) {
    console.error("Error en getInstallationById:", error)
    throw error
  }
}

// Crear nueva instalación
async function createInstallation(installationData, adminUser) {
  try {
    const { company, address, floorSector, postalCode, city, province, installationType, fechaInicio, fechaFin, frecuencia, mesesFrecuencia, estado, tenantId } = installationData

    // Verificar que se proporcione tenantId
    if (!tenantId) {
      throw new Error("Se requiere tenantId para crear la instalación")
    }

    // Verificar que el usuario tenga permisos para este tenant
    if (adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
      throw new Error("No tienes permisos para crear instalaciones en este tenant")
    }

    const newInstallation = {
      company,
      address,
      floorSector,
      postalCode,
      city,
      province,
      installationType,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      frecuencia,
      mesesFrecuencia,
      estado: estado || "Activo",
      tenantId, // Agregar tenantId
      createdBy: adminUser._id, // Agregar quien creó la instalación
      createdAt: new Date(),
      updatedAt: new Date(),
      devices: [],
    }

    const result = await installationsCollection.insertOne(newInstallation)
    const insertedId = result.insertedId.toString()

    return { ...newInstallation, _id: insertedId }
  } catch (error) {
    console.error("Error en createInstallation:", error)
    throw new Error("Error al crear la instalación")
  }
}

// Actualizar instalación
async function updateInstallation(id, installationData, tenantId, adminUser) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("El ID de la instalación no es válido")
    }

    // Verificar que el usuario tenga permisos para este tenant
    if (adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
      throw new Error("No tienes permisos para actualizar instalaciones en este tenant")
    }

    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    const dataToUpdate = {
      ...installationData,
      updatedAt: new Date(),
      updatedBy: adminUser._id,
    }
    // Si se envía fechaInicio o fechaFin, convertirlas a Date
    if (dataToUpdate.fechaInicio) dataToUpdate.fechaInicio = new Date(dataToUpdate.fechaInicio)
    if (dataToUpdate.fechaFin) dataToUpdate.fechaFin = new Date(dataToUpdate.fechaFin)

    const result = await installationsCollection.findOneAndUpdate(
      query,
      { $set: dataToUpdate },
      { returnDocument: "after" },
    )

    if (!result) {
      throw new Error("No se encontró la instalación para actualizar")
    }

    return result
  } catch (error) {
    console.error("Error en updateInstallation:", error)
    throw error
  }
}

// Actualizar solo información de suscripción
async function updateInstallationSubscription(id, subscriptionData) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("El ID de la instalación no es válido")
    }

    const objectId = new ObjectId(id)
    
    // Preparar datos de suscripción con conversión de fechas
    const dataToUpdate = {
      fechaInicio: new Date(subscriptionData.fechaInicio),
      fechaFin: subscriptionData.fechaFin ? new Date(subscriptionData.fechaFin) : null,
      frecuencia: subscriptionData.frecuencia,
      mesesFrecuencia: subscriptionData.mesesFrecuencia,
      fechaActualizacion: new Date(),
    }

    const result = await installationsCollection.findOneAndUpdate(
      { _id: objectId },
      { $set: dataToUpdate },
      { returnDocument: "after" },
    )

    if (!result) {
      throw new Error("No se encontró la instalación para actualizar la suscripción")
    }

    return result
  } catch (error) {
    console.error("Error en updateInstallationSubscription:", error)
    throw error
  }
}

// Eliminar instalación
async function deleteInstallation(id, tenantId, adminUser) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("El ID de la instalación no es válido")
    }

    // Verificar que el usuario tenga permisos para este tenant
    if (adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
      throw new Error("No tienes permisos para eliminar instalaciones en este tenant")
    }

    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    const result = await installationsCollection.deleteOne(query)

    if (result.deletedCount === 0) {
      throw new Error("No se pudo eliminar la instalación")
    }

    return { message: "Instalación eliminada correctamente" }
  } catch (error) {
    console.error("Error en deleteInstallation:", error)
    throw error
  }
}

// Asignar activo a instalación (FUNCIÓN PRINCIPAL PARA AGREGAR DISPOSITIVOS)
async function assignAssetToInstallation(installationId, assetId, ubicacion, categoria) {
  try {
    if (!ObjectId.isValid(installationId) || !ObjectId.isValid(assetId)) {
      throw new Error("El ID de la instalación o del activo no es válido")
    }

    const installationObjectId = new ObjectId(installationId)
    const assetObjectId = new ObjectId(assetId)

    // Verificar que la instalación existe
    const installation = await installationsCollection.findOne({ _id: installationObjectId })
    if (!installation) {
      throw new Error("La instalación no existe")
    }

    // Verificar que el activo existe
    const asset = await assetsCollection.findOne({ _id: assetObjectId })
    if (!asset) {
      throw new Error("El activo no existe")
    }

    // Verificar que el activo tiene una plantilla asignada
    if (!asset.templateId) {
      throw new Error("El activo debe tener una plantilla de formulario asignada")
    }

    // Verificar que la plantilla existe
    const template = await getFormTemplateById(asset.templateId.toString())
    if (!template) {
      throw new Error("La plantilla de formulario del activo no existe")
    }

    // Crear un nuevo dispositivo basado en el activo
    const deviceId = new ObjectId()
    // --- MODIFICACIÓN: Usar FRONTEND_URL de .env ---
    const frontendUrl = process.env.FRONTEND_URL || "https://panelmantenimiento.netlify.app"
    // Elimina barra final si existe
    const cleanFrontendUrl = frontendUrl.replace(/\/$/, "")
    const formUrl = `${cleanFrontendUrl}/formulario/${installationId}/${deviceId}`

    const newDevice = {
      _id: deviceId,
      assetId: assetObjectId,
      nombre: asset.nombre,
      marca: asset.marca,
      modelo: asset.modelo,
      numeroSerie: asset.numeroSerie,
      ubicacion: ubicacion,
      categoria: categoria,
      templateId: asset.templateId, // Heredar la plantilla del activo
      codigoQR: formUrl, // <--- AQUÍ VA LA URL COMPLETA DEL FRONT
      maintenanceHistory: [],
      fechaCreacion: new Date(),
      estado: "Activo", // <--- AGREGADO PARA QUE SE GUARDE EL ESTADO
    }

    const result = await installationsCollection.updateOne(
      { _id: installationObjectId },
      { $push: { devices: newDevice } },
    )

    if (result.modifiedCount === 0) {
      throw new Error("No se pudo asignar el activo a la instalación")
    }

    return {
      message: "Activo asignado correctamente a la instalación",
      device: newDevice,
      templateName: template.nombre,
      assetInfo: {
        nombre: asset.nombre,
        marca: asset.marca,
        modelo: asset.modelo,
        numeroSerie: asset.numeroSerie,
      },
    }
  } catch (error) {
    console.error("Error en assignAssetToInstallation:", error)
    throw error
  }
}

// FUNCIÓN DEPRECADA - Ahora todos los dispositivos deben basarse en activos
async function addDeviceToInstallation(installationId, deviceData) {
  // Redirigir a assignAssetToInstallation
  const { assetId, ubicacion, categoria } = deviceData

  if (!assetId) {
    throw new Error("Se requiere un assetId. Los dispositivos deben basarse en activos existentes.")
  }

  return await assignAssetToInstallation(installationId, assetId, ubicacion, categoria)
}

// Actualizar dispositivo en instalación
async function updateDeviceInInstallation(installationId, deviceId, deviceData) {
  try {
    if (!ObjectId.isValid(installationId) || !ObjectId.isValid(deviceId)) {
      throw new Error("El ID de la instalación o el dispositivo no es válido")
    }

    const installationObjectId = new ObjectId(installationId)
    const deviceObjectId = new ObjectId(deviceId)

    // Obtener el dispositivo actual
    const installation = await installationsCollection.findOne(
      { _id: installationObjectId, "devices._id": deviceObjectId },
      { projection: { "devices.$": 1 } },
    )

    if (!installation || !installation.devices || installation.devices.length === 0) {
      throw new Error("No se encontró el dispositivo en la instalación")
    }

    const currentDevice = installation.devices[0]

    // Si se está cambiando el assetId, verificar que el nuevo activo existe
    if (deviceData.assetId && deviceData.assetId !== currentDevice.assetId?.toString()) {
      if (!ObjectId.isValid(deviceData.assetId)) {
        throw new Error("El ID del activo no es válido")
      }

      const newAsset = await assetsCollection.findOne({ _id: new ObjectId(deviceData.assetId) })
      if (!newAsset) {
        throw new Error("El nuevo activo no existe")
      }

      if (!newAsset.templateId) {
        throw new Error("El nuevo activo debe tener una plantilla de formulario asignada")
      }

      // Actualizar con información del nuevo activo
      deviceData.nombre = newAsset.nombre
      deviceData.marca = newAsset.marca
      deviceData.modelo = newAsset.modelo
      deviceData.numeroSerie = newAsset.numeroSerie
      deviceData.templateId = newAsset.templateId
      deviceData.assetId = new ObjectId(deviceData.assetId)
    }

    // Crear el dispositivo actualizado preservando datos importantes
    const updatedDevice = {
      ...currentDevice,
      ...deviceData,
      _id: deviceObjectId,
      maintenanceHistory: currentDevice.maintenanceHistory || [],
      fechaActualizacion: new Date(),
    }

    const result = await installationsCollection.updateOne(
      { _id: installationObjectId, "devices._id": deviceObjectId },
      { $set: { "devices.$": updatedDevice } },
    )

    if (result.modifiedCount === 0) {
      throw new Error("No se pudo actualizar el dispositivo en la instalación")
    }

    return { message: "Dispositivo actualizado correctamente", device: updatedDevice }
  } catch (error) {
    console.error("Error en updateDeviceInInstallation:", error)
    throw error
  }
}

// Eliminar dispositivo de instalación
async function deleteDeviceFromInstallation(installationId, deviceId) {
  try {
    if (!ObjectId.isValid(installationId) || !ObjectId.isValid(deviceId)) {
      throw new Error("El ID de la instalación o el dispositivo no es válido")
    }

    const installationObjectId = new ObjectId(installationId)
    const deviceObjectId = new ObjectId(deviceId)

    const result = await installationsCollection.updateOne(
      { _id: installationObjectId },
      { $pull: { devices: { _id: deviceObjectId } } },
    )

    if (result.modifiedCount === 0) {
      throw new Error("No se pudo eliminar el dispositivo de la instalación")
    }

    return { message: "Dispositivo eliminado correctamente" }
  } catch (error) {
    console.error("Error en deleteDeviceFromInstallation:", error)
    throw error
  }
}

// Obtener formulario de dispositivo con información de instalación
async function getDeviceForm(installationId, deviceId) {
  try {
    if (!ObjectId.isValid(installationId) || !ObjectId.isValid(deviceId)) {
      throw new Error("El ID de la instalación o el dispositivo no es válido")
    }

    const installationObjectId = new ObjectId(installationId)
    const deviceObjectId = new ObjectId(deviceId)

    // Obtener la instalación completa con el dispositivo específico
    const installation = await installationsCollection.findOne(
      { _id: installationObjectId, "devices._id": deviceObjectId },
      { 
        projection: { 
          "devices.$": 1,
          "company": 1,
          "address": 1,
          "floorSector": 1,
          "city": 1,
          "province": 1,
          "installationType": 1
        } 
      }
    )

    if (!installation || !installation.devices || installation.devices.length === 0) {
      throw new Error("No se encontró la instalación o el dispositivo")
    }

    const device = installation.devices[0]

    // Usar la plantilla del dispositivo (que viene del activo)
    let formFields = []
    if (device.templateId) {
      const template = await getFormTemplateById(device.templateId.toString())
      if (template) {
        formFields = await getFormFieldsByCategory(template.categoria, device.templateId.toString())
      }
    } else {
      // Fallback a campos por categoría
      formFields = await getFormFieldsByCategory(device.categoria)
    }

    return {
      installationInfo: {
        _id: installation._id,
        company: installation.company,
        address: installation.address,
        floorSector: installation.floorSector,
        city: installation.city,
        province: installation.province,
        installationType: installation.installationType,
        fullAddress: `${installation.address}${installation.floorSector ? ', ' + installation.floorSector : ''}, ${installation.city}, ${installation.province}`
      },
      deviceInfo: {
        _id: device._id,
        assetId: device.assetId,
        nombre: device.nombre,
        marca: device.marca,
        modelo: device.modelo,
        numeroSerie: device.numeroSerie,
        ubicacion: device.ubicacion,
        categoria: device.categoria,
        templateId: device.templateId,
      },
      formFields,
    }
  } catch (error) {
    console.error("Error en getDeviceForm:", error)
    throw error
  }
}

// Manejar envío de mantenimiento - FUNCIÓN COMPLETA CORREGIDA
async function handleMaintenanceSubmission(installationId, deviceId, formResponses) {
  try {
    if (!ObjectId.isValid(installationId) || !ObjectId.isValid(deviceId)) {
      throw new Error("El ID de la instalación o el dispositivo no es válido")
    }

    const installationObjectId = new ObjectId(installationId)
    const deviceObjectId = new ObjectId(deviceId)

    const installation = await installationsCollection.findOne(
      { _id: installationObjectId, "devices._id": deviceObjectId },
      { projection: { "devices.$": 1 } },
    )

    if (!installation || !installation.devices || installation.devices.length === 0) {
      throw new Error("No se encontró la instalación o el dispositivo")
    }

    const device = installation.devices[0]

    // Obtener campos del formulario basados en la plantilla del dispositivo
    let formFields = []
    if (device.templateId) {
      const template = await getFormTemplateById(device.templateId.toString())
      if (template) {
        formFields = await getFormFieldsByCategory(template.categoria, device.templateId.toString())
      }
    } else {
      formFields = await getFormFieldsByCategory(device.categoria)
    }

    // Usar directamente la fecha del servidor
    const currentDateTime = new Date()
    const formattedDateTime = formatDateTime(currentDateTime)

    // Añadir automáticamente la fecha y hora a las respuestas del formulario
    formResponses.fechaRevision = formattedDateTime.formattedDate
    formResponses.horaRevision = formattedDateTime.formattedTime

    // Verificar si todos los campos requeridos están llenos
    const missingFields = formFields
      .filter((field) => {
        // Si es fecha o hora de revisión, ya se agregaron automáticamente
        if (field.name === "fechaRevision" || field.name === "horaRevision") {
          return false
        }
        
        // Si el campo es requerido
        if (field.required) {
          const fieldValue = formResponses[field.name]
          
          // Para checkboxes, verificar que exista la propiedad (puede ser true o false)
          if (field.type === "checkbox") {
            return fieldValue === undefined || fieldValue === null
          }
          
          // Para otros campos, verificar que tengan un valor truthy
          return !fieldValue && fieldValue !== 0 && fieldValue !== false
        }
        
        return false
      })
      .map((field) => field.label)

    if (missingFields.length > 0) {
      throw new Error(`Los siguientes campos son obligatorios: ${missingFields.join(", ")}`)
    }

    // Generar PDF con la información
    const pdfBuffer = await generatePDF(formResponses, device, null, formattedDateTime.fullDateTime)

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("Error al generar el PDF: El buffer está vacío")
    }

    const timestamp = Date.now()

    // Subir el PDF a Cloudinary
    const cloudinaryResult = await uploadBufferToCloudinary(pdfBuffer, installationId, deviceId, timestamp)

    // Guardar también una copia local como respaldo
    const pdfFileName = `maintenance_${installationId}_${deviceId}_${timestamp}.pdf`
    const pdfPath = path.join(pdfDirectory, pdfFileName)
    fs.writeFileSync(pdfPath, pdfBuffer)

    const pdfUrl = cloudinaryResult.secure_url

    // Registrar el mantenimiento
    const maintenanceRecord = {
      _id: new ObjectId(),
      date: currentDateTime,
      formattedDate: formattedDateTime.fullDateTime,
      responses: formResponses,
      pdfUrl: pdfUrl,
    }

    // Actualizar el dispositivo con el nuevo registro de mantenimiento
    const result = await installationsCollection.updateOne(
      { _id: installationObjectId, "devices._id": deviceObjectId },
      {
        $push: { "devices.$.maintenanceHistory": maintenanceRecord },
        $set: {
          "devices.$.fechaUltimoMantenimiento": currentDateTime,
        },
      },
    )

    if (result.modifiedCount === 0) {
      throw new Error("No se pudo registrar el mantenimiento")
    }

    return { message: "Mantenimiento registrado correctamente", maintenanceRecord }
  } catch (error) {
    console.error("Error en handleMaintenanceSubmission:", error)
    throw error
  }
}

// Obtener último mantenimiento de dispositivo
async function getLastMaintenanceForDevice(installationId, deviceId) {
  try {
    if (!ObjectId.isValid(installationId) || !ObjectId.isValid(deviceId)) {
      throw new Error("El ID de la instalación o el dispositivo no es válido")
    }

    const installationObjectId = new ObjectId(installationId)
    const deviceObjectId = new ObjectId(deviceId)

    const result = await installationsCollection.findOne(
      { _id: installationObjectId, "devices._id": deviceObjectId },
      { projection: { "devices.$": 1 } },
    )

    if (!result || !result.devices || result.devices.length === 0) {
      throw new Error("No se encontró la instalación o el dispositivo")
    }

    const device = result.devices[0]

    if (!device.maintenanceHistory || device.maintenanceHistory.length === 0) {
      return null
    }

    return device.maintenanceHistory[device.maintenanceHistory.length - 1]
  } catch (error) {
    console.error("Error en getLastMaintenanceForDevice:", error)
    throw error
  }
}

// Obtener dispositivos de instalación
async function getDevicesFromInstallation(installationId) {
  try {
    if (!ObjectId.isValid(installationId)) {
      throw new Error("El ID de la instalación no es válido")
    }

    const installationObjectId = new ObjectId(installationId)

    const installation = await installationsCollection.findOne(
      { _id: installationObjectId },
      { projection: { devices: 1 } },
    )

    if (!installation) {
      throw new Error("No se encontró la instalación")
    }

    return installation.devices || []
  } catch (error) {
    console.error("Error en getDevicesFromInstallation:", error)
    throw error
  }
}

// Asignar plantilla a dispositivo (DEPRECADA - la plantilla viene del activo)
async function assignTemplateToDevice(installationId, deviceId, templateId) {
  try {
    if (!ObjectId.isValid(installationId) || !ObjectId.isValid(deviceId) || !ObjectId.isValid(templateId)) {
      throw new Error("Los IDs proporcionados no son válidos")
    }

    const installationObjectId = new ObjectId(installationId)
    const deviceObjectId = new ObjectId(deviceId)
    const templateObjectId = new ObjectId(templateId)

    // Verificar que la instalación y el dispositivo existen
    const installation = await installationsCollection.findOne(
      { _id: installationObjectId, "devices._id": deviceObjectId },
      { projection: { "devices.$": 1 } },
    )

    if (!installation || !installation.devices || installation.devices.length === 0) {
      throw new Error("No se encontró el dispositivo en la instalación")
    }

    // Verificar que la plantilla existe
    const template = await getFormTemplateById(templateId)
    if (!template) {
      throw new Error("La plantilla de formulario especificada no existe")
    }

    // ADVERTENCIA: Esto sobrescribe la plantilla del activo
    console.warn(
      "ADVERTENCIA: Se está sobrescribiendo la plantilla del activo. Considera actualizar el activo directamente.",
    )

    // Actualizar solo el campo templateId del dispositivo
    const result = await installationsCollection.updateOne(
      { _id: installationObjectId, "devices._id": deviceObjectId },
      { $set: { "devices.$.templateId": templateObjectId, "devices.$.fechaActualizacion": new Date() } },
    )

    if (result.modifiedCount === 0) {
      throw new Error("No se pudo asignar la plantilla al dispositivo")
    }

    return {
      message: "Plantilla asignada correctamente al dispositivo",
      warning: "La plantilla del dispositivo ahora es diferente a la del activo original",
      installationId,
      deviceId,
      templateId,
      templateName: template.nombre,
    }
  } catch (error) {
    console.error("Error en assignTemplateToDevice:", error)
    throw error
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
  assignAssetToInstallation,
  assignTemplateToDevice,
}