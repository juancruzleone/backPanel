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
async function getInstallations() {
  try {
    const installations = await installationsCollection.find().sort({ _id: -1 }).toArray()
    return installations
  } catch (error) {
    console.error("Error en getInstallations:", error)
    throw new Error("Error al obtener las instalaciones")
  }
}

// NUEVA FUNCIÓN: Obtener instalación por ID
async function getInstallationById(id) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("El ID de la instalación no es válido")
    }
    const objectId = new ObjectId(id)
    const installation = await installationsCollection.findOne({ _id: objectId })
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
async function createInstallation(installationData) {
  try {
    const { company, address, floorSector, postalCode, city, province, installationType } = installationData
    const newInstallation = {
      company,
      address,
      floorSector,
      postalCode,
      city,
      province,
      installationType,
      devices: [],
      fechaCreacion: new Date(),
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
async function updateInstallation(id, installationData) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("El ID de la instalación no es válido")
    }
    const objectId = new ObjectId(id)
    const dataToUpdate = {
      ...installationData,
      fechaActualizacion: new Date(),
    }
    const result = await installationsCollection.findOneAndUpdate(
      { _id: objectId },
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

// Eliminar instalación
async function deleteInstallation(id) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("El ID de la instalación no es válido")
    }
    const objectId = new ObjectId(id)
    const result = await installationsCollection.deleteOne({ _id: objectId })
    if (result.deletedCount === 0) {
      throw new Error("No se pudo eliminar la instalación")
    }
    return { message: "Instalación eliminada correctamente" }
  } catch (error) {
    console.error("Error en deleteInstallation:", error)
    throw error
  }
}

// Asignar activo a instalación
async function assignAssetToInstallation(installationId, assetId, ubicacion, categoria, templateId, estado) {
  try {
    if (!ObjectId.isValid(installationId) || !ObjectId.isValid(assetId) || !ObjectId.isValid(templateId)) {
      throw new Error("El ID de la instalación, del activo o de la plantilla no es válido")
    }

    const installationObjectId = new ObjectId(installationId)
    const assetObjectId = new ObjectId(assetId)
    const templateObjectId = new ObjectId(templateId)

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

    // Verificar que la plantilla existe
    const template = await getFormTemplateById(templateId)
    if (!template) {
      throw new Error("La plantilla de formulario especificada no existe")
    }

    // Validar que el estado sea válido
    const estadosValidos = ["Activo", "Inactivo", "En mantenimiento", "Fuera de servicio", "Pendiente de revisión"]
    if (!estadosValidos.includes(estado)) {
      throw new Error("El estado proporcionado no es válido")
    }

    // Crear un nuevo dispositivo basado en el activo
    const deviceId = new ObjectId()

    // CAMBIO PRINCIPAL: Usar FRONTEND_URL en lugar de CLIENT_URL
    const frontendUrl = process.env.FRONTEND_URL || "https://panelmantenimiento.netlify.app"
    const formUrl = `${frontendUrl.replace(/\/$/, "")}/formulario/${installationId}/${deviceId}`

    const newDevice = {
      _id: deviceId,
      assetId: assetObjectId,
      nombre: asset.nombre,
      ubicacion: ubicacion,
      categoria: categoria,
      templateId: templateObjectId,
      codigoQR: formUrl,
      maintenanceHistory: [],
      estado: estado,
      marca: asset.marca,
      modelo: asset.modelo,
      numeroSerie: asset.numeroSerie,
      fechaCreacion: new Date(),
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
    }
  } catch (error) {
    console.error("Error en assignAssetToInstallation:", error)
    throw error
  }
}

// Agregar dispositivo a instalación
async function addDeviceToInstallation(installationId, deviceData) {
  try {
    const { nombre, ubicacion, categoria, templateId } = deviceData

    if (!ObjectId.isValid(installationId)) {
      throw new Error("El ID de la instalación no es válido")
    }

    const installationObjectId = new ObjectId(installationId)
    const installation = await installationsCollection.findOne({ _id: installationObjectId })
    if (!installation) {
      throw new Error("La instalación no existe")
    }

    // Verificar si se proporcionó un templateId y si es válido
    if (templateId && !ObjectId.isValid(templateId)) {
      throw new Error("El ID de la plantilla no es válido")
    }

    const deviceId = new ObjectId()

    // CAMBIO PRINCIPAL: Usar FRONTEND_URL en lugar de CLIENT_URL
    const frontendUrl = process.env.FRONTEND_URL || "https://panelmantenimiento.netlify.app"
    const formUrl = `${frontendUrl.replace(/\/$/, "")}/formulario/${installationId}/${deviceId}`

    const newDevice = {
      _id: deviceId,
      nombre,
      ubicacion,
      categoria,
      templateId: templateId ? new ObjectId(templateId) : null,
      codigoQR: formUrl,
      maintenanceHistory: [],
      estado: "Activo",
      fechaCreacion: new Date(),
    }

    const result = await installationsCollection.updateOne(
      { _id: installationObjectId },
      { $push: { devices: newDevice } },
    )

    if (result.modifiedCount === 0) {
      throw new Error("No se pudo agregar el dispositivo a la instalación")
    }

    return { message: "Dispositivo agregado correctamente", device: newDevice }
  } catch (error) {
    console.error("Error en addDeviceToInstallation:", error)
    throw error
  }
}

// Actualizar dispositivo en instalación
async function updateDeviceInInstallation(installationId, deviceId, deviceData) {
  try {
    if (!ObjectId.isValid(installationId) || !ObjectId.isValid(deviceId)) {
      throw new Error("El ID de la instalación o el dispositivo no es válido")
    }

    const installationObjectId = new ObjectId(installationId)
    const deviceObjectId = new ObjectId(deviceId)

    // Verificar si se proporcionó un templateId y si es válido
    if (deviceData.templateId && !ObjectId.isValid(deviceData.templateId)) {
      throw new Error("El ID de la plantilla no es válido")
    }

    // Obtener el dispositivo actual para preservar datos importantes
    const installation = await installationsCollection.findOne(
      { _id: installationObjectId, "devices._id": deviceObjectId },
      { projection: { "devices.$": 1 } },
    )

    if (!installation || !installation.devices || installation.devices.length === 0) {
      throw new Error("No se encontró el dispositivo en la instalación")
    }

    const currentDevice = installation.devices[0]

    // Crear el dispositivo actualizado preservando datos importantes
    const updatedDevice = {
      ...currentDevice,
      ...deviceData,
      _id: deviceObjectId,
      templateId: deviceData.templateId ? new ObjectId(deviceData.templateId) : currentDevice.templateId,
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

    return { message: "Dispositivo actualizado correctamente" }
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

// Obtener formulario de dispositivo
async function getDeviceForm(installationId, deviceId) {
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
    const formFields = await getFormFieldsByCategory(device.categoria, device.templateId)

    return {
      deviceInfo: {
        nombre: device.nombre,
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

// Manejar envío de mantenimiento
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
    const formFields = await getFormFieldsByCategory(device.categoria, device.templateId)

    // Usar directamente la fecha del servidor
    const currentDateTime = new Date()
    const formattedDateTime = formatDateTime(currentDateTime)

    // Añadir automáticamente la fecha y hora a las respuestas del formulario
    formResponses.fechaRevision = formattedDateTime.formattedDate
    formResponses.horaRevision = formattedDateTime.formattedTime

    // Verificar si todos los campos requeridos están llenos
    const missingFields = formFields
      .filter(
        (field) =>
          field.required &&
          !formResponses[field.name] &&
          field.name !== "fechaRevision" &&
          field.name !== "horaRevision",
      )
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
          "devices.$.estado": formResponses.estado || "Activo",
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

// Asignar plantilla a dispositivo
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
  getInstallationById, // NUEVA FUNCIÓN EXPORTADA
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
  assignAssetToInstallation,
  assignTemplateToDevice,
}
