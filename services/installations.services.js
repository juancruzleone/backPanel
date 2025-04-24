import { db } from "../db.js"
import { ObjectId } from "mongodb"
import { generatePDF } from "./pdfGenerator.services.js"
import { getFormFieldsByCategory } from "./formFields.services.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const installationsCollection = db.collection("instalaciones")
const assetsCollection = db.collection("activos")

// Asegurarse de que el directorio de PDFs exista
const pdfDirectory = path.join(__dirname, "..", "..", "public", "pdfs")
if (!fs.existsSync(pdfDirectory)) {
  fs.mkdirSync(pdfDirectory, { recursive: true })
}

async function getInstallations() {
  const installations = await installationsCollection.find().sort({ _id: -1 }).toArray()
  return installations
}

async function createInstallation(installationData) {
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
}

async function updateInstallation(id, installationData) {
  if (!ObjectId.isValid(id)) {
    throw new Error("El ID de la instalación no es válido")
  }
  const objectId = new ObjectId(id)

  // Añadir fecha de actualización
  const dataToUpdate = {
    ...installationData,
    fechaActualizacion: new Date(),
  }

  const result = await installationsCollection.findOneAndUpdate(
    { _id: objectId },
    { $set: dataToUpdate },
    { returnDocument: "after" },
  )
  if (!result.value) {
    throw new Error("No se encontró la instalación para actualizar")
  }
  return result.value
}

async function deleteInstallation(id) {
  if (!ObjectId.isValid(id)) {
    throw new Error("El ID de la instalación no es válido")
  }
  const objectId = new ObjectId(id)
  const result = await installationsCollection.deleteOne({ _id: objectId })
  if (result.deletedCount === 0) {
    throw new Error("No se pudo eliminar la instalación")
  }
  return { message: "Instalación eliminada correctamente" }
}

// Método para agregar un activo existente a una instalación
async function addExistingAssetToInstallation(installationId, assetId) {
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
  
  // Verificar si el activo ya está en la instalación
  const deviceExists = installation.devices && installation.devices.some(device => 
    device.assetId && device.assetId.toString() === assetId
  )
  
  if (deviceExists) {
    throw new Error("Este activo ya está asociado a esta instalación")
  }
  
  // Crear un nuevo dispositivo basado en el activo
  const deviceId = new ObjectId()
  const formUrl = `${process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, "") : ""}/formulario/${installationId}/${deviceId}`
  
  const newDevice = {
    _id: deviceId,
    assetId: assetObjectId, // Referencia al activo original
    nombre: asset.nombre,
    ubicacion: asset.ubicacion || installation.address,
    categoria: asset.categoria,
    templateId: asset.templateId || null, // Usar la plantilla del activo si existe
    codigoQR: formUrl,
    maintenanceHistory: [],
    estado: asset.estado || "Activo",
    marca: asset.marca,
    modelo: asset.modelo,
    numeroSerie: asset.numeroSerie,
    fechaCreacion: new Date(),
  }
  
  const result = await installationsCollection.updateOne(
    { _id: installationObjectId },
    { $push: { devices: newDevice } }
  )
  
  if (result.modifiedCount === 0) {
    throw new Error("No se pudo agregar el activo a la instalación")
  }
  
  return { 
    message: "Activo agregado correctamente a la instalación", 
    device: newDevice 
  }
}

async function addDeviceToInstallation(installationId, deviceData) {
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
  const formUrl = `${process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, "") : ""}/formulario/${installationId}/${deviceId}`
  const newDevice = {
    _id: deviceId,
    nombre,
    ubicacion,
    categoria,
    templateId: templateId ? new ObjectId(templateId) : null, // ID de la plantilla de formulario personalizada
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
}

async function updateDeviceInInstallation(installationId, deviceId, deviceData) {
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
}

async function deleteDeviceFromInstallation(installationId, deviceId) {
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
}

async function getDeviceForm(installationId, deviceId) {
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

  // Obtener campos de formulario según la categoría y/o plantilla personalizada
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
}

async function handleMaintenanceSubmission(installationId, deviceId, formResponses) {
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

  // Obtener campos de formulario según la categoría y/o plantilla personalizada
  const formFields = await getFormFieldsByCategory(device.categoria, device.templateId)

  // Verificar si todos los campos requeridos están llenos
  const missingFields = formFields
    .filter((field) => field.required && !formResponses[field.name])
    .map((field) => field.label)

  if (missingFields.length > 0) {
    throw new Error(`Los siguientes campos son obligatorios: ${missingFields.join(", ")}`)
  }

  // Generar PDF
  const pdfBuffer = await generatePDF(formResponses, device)

  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error("Error al generar el PDF: El buffer está vacío")
  }

  // Guardar PDF en el sistema de archivos
  const timestamp = Date.now()
  const pdfFileName = `maintenance_${installationId}_${deviceId}_${timestamp}.pdf`
  const pdfPath = path.join(pdfDirectory, pdfFileName)

  fs.writeFileSync(pdfPath, pdfBuffer)

  // URL relativa para acceder al PDF
  const pdfUrl = `/pdfs/${pdfFileName}`

  // Registrar el mantenimiento
  const maintenanceRecord = {
    _id: new ObjectId(),
    date: new Date(),
    responses: formResponses,
    pdfUrl: pdfUrl,
  }

  // Actualizar el dispositivo con el nuevo registro de mantenimiento
  const result = await installationsCollection.updateOne(
    { _id: installationObjectId, "devices._id": deviceObjectId },
    {
      $push: { "devices.$.maintenanceHistory": maintenanceRecord },
      $set: { "devices.$.fechaUltimoMantenimiento": new Date(), "devices.$.estado": formResponses.estado || "Activo" },
    },
  )

  if (result.modifiedCount === 0) {
    throw new Error("No se pudo registrar el mantenimiento")
  }

  return { message: "Mantenimiento registrado correctamente", maintenanceRecord }
}

async function getLastMaintenanceForDevice(installationId, deviceId) {
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
}

async function getDevicesFromInstallation(installationId) {
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
}

// Nueva función específica para asignar plantilla a un dispositivo
async function assignTemplateToDevice(installationId, deviceId, templateId) {
  if (!ObjectId.isValid(installationId) || !ObjectId.isValid(deviceId) || !ObjectId.isValid(templateId)) {
    throw new Error("Los IDs proporcionados no son válidos")
  }
  
  const installationObjectId = new ObjectId(installationId)
  const deviceObjectId = new ObjectId(deviceId)
  const templateObjectId = new ObjectId(templateId)
  
  // Verificar que la instalación y el dispositivo existen
  const installation = await installationsCollection.findOne(
    { _id: installationObjectId, "devices._id": deviceObjectId },
    { projection: { "devices.$": 1 } }
  )
  
  if (!installation || !installation.devices || installation.devices.length === 0) {
    throw new Error("No se encontró el dispositivo en la instalación")
  }
  
  // Actualizar solo el campo templateId del dispositivo
  const result = await installationsCollection.updateOne(
    { _id: installationObjectId, "devices._id": deviceObjectId },
    { $set: { "devices.$.templateId": templateObjectId, "devices.$.fechaActualizacion": new Date() } }
  )
  
  if (result.modifiedCount === 0) {
    throw new Error("No se pudo asignar la plantilla al dispositivo")
  }
  
  return { 
    message: "Plantilla asignada correctamente al dispositivo",
    installationId,
    deviceId,
    templateId
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