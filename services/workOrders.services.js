import { db } from "../db.js"
import { ObjectId } from "mongodb"
import { generateWorkOrderPDF } from "./workOrderPdfGenerator.services.js"
import { getFormFieldsByCategory } from "./formFields.services.js"
import cloudinary from "../config/cloudinary.config.js"
import { Readable } from "stream"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const workOrdersCollection = db.collection("ordenes_trabajo")
const installationsCollection = db.collection("instalaciones")
const accountsCollection = db.collection("cuentas")

// Asegurarse de que el directorio de PDFs exista
const pdfDirectory = path.join(__dirname, "..", "..", "public", "pdfs", "work-orders")
if (!fs.existsSync(pdfDirectory)) {
  fs.mkdirSync(pdfDirectory, { recursive: true })
}

// Función para formatear fecha y hora
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

// Función para subir PDF a Cloudinary
async function uploadWorkOrderPDFToCloudinary(buffer, workOrderId, timestamp) {
  return new Promise((resolve, reject) => {
    const stream = Readable.from(buffer)
    const folder = `ordenes-trabajo/${workOrderId}`
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: `work_order_${timestamp}`,
        resource_type: "raw",
        format: "pdf",
      },
      (error, result) => {
        if (error) {
          console.error("Error al subir PDF a Cloudinary:", error)
          reject(error)
        } else {
          resolve(result)
        }
      },
    )
    stream.pipe(uploadStream)
  })
}

// Obtener todas las órdenes de trabajo con filtros
async function getAllWorkOrders(filters = {}) {
  try {
    const query = {}
    if (filters.estado) {
      query.estado = filters.estado
    }
    if (filters.tecnicoId) {
      query.tecnicoAsignado = new ObjectId(filters.tecnicoId)
    }
    if (filters.instalacionId) {
      query.instalacionId = new ObjectId(filters.instalacionId)
    }

    const workOrders = await workOrdersCollection
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: "instalaciones",
            localField: "instalacionId",
            foreignField: "_id",
            as: "instalacion",
          },
        },
        {
          $lookup: {
            from: "cuentas",
            localField: "tecnicoAsignado",
            foreignField: "_id",
            as: "tecnico",
          },
        },
        {
          $lookup: {
            from: "cuentas",
            localField: "creadoPor",
            foreignField: "_id",
            as: "creador",
          },
        },
        {
          $addFields: {
            instalacion: { $arrayElemAt: ["$instalacion", 0] },
            tecnico: {
              $cond: {
                if: { $gt: [{ $size: "$tecnico" }, 0] },
                then: { $arrayElemAt: ["$tecnico", 0] },
                else: null,
              },
            },
            creador: {
              $cond: {
                if: { $gt: [{ $size: "$creador" }, 0] },
                then: { $arrayElemAt: ["$creador", 0] },
                else: null,
              },
            },
          },
        },
        {
          $project: {
            titulo: 1,
            descripcion: 1,
            estado: 1,
            prioridad: 1,
            tipoTrabajo: 1,
            fechaProgramada: 1,
            horaProgramada: 1,
            fechaCreacion: 1,
            fechaAsignacion: 1,
            fechaInicio: 1,
            fechaCompletada: 1,
            observaciones: 1,
            instalacion: {
              company: 1,
              address: 1,
              city: 1,
            },
            tecnico: {
              _id: 1,
              userName: 1,
              email: 1,
            },
            creador: {
              _id: 1,
              userName: 1,
              email: 1,
            },
            creadoPor: 1,
            dispositivoId: 1,
            dispositivo: 1,
            tecnicoAsignado: 1,
            historial: 1,
          },
        },
        { $sort: { fechaCreacion: -1 } },
      ])
      .toArray()

    return workOrders
  } catch (error) {
    console.error("Error en getAllWorkOrders:", error)
    throw new Error("Error al obtener las órdenes de trabajo")
  }
}

// Crear nueva orden de trabajo
async function createWorkOrder(workOrderData, adminUser) {
  try {
    const {
      titulo,
      descripcion,
      instalacionId,
      dispositivoId,
      prioridad,
      fechaProgramada,
      horaProgramada,
      tipoTrabajo,
      observaciones,
    } = workOrderData

    // Verificar que la instalación existe
    if (!ObjectId.isValid(instalacionId)) {
      throw new Error("ID de instalación inválido")
    }

    const installation = await installationsCollection.findOne({ _id: new ObjectId(instalacionId) })
    if (!installation) {
      throw new Error("La instalación especificada no existe")
    }

    let dispositivo = null
    if (dispositivoId) {
      if (!ObjectId.isValid(dispositivoId)) {
        throw new Error("ID de dispositivo inválido")
      }
      // Buscar el dispositivo en la instalación
      dispositivo = installation.devices?.find((device) => device._id.toString() === dispositivoId)
      if (!dispositivo) {
        throw new Error("El dispositivo especificado no existe en la instalación")
      }
    }

    const newWorkOrder = {
      titulo,
      descripcion,
      instalacionId: new ObjectId(instalacionId),
      dispositivoId: dispositivoId ? new ObjectId(dispositivoId) : null,
      dispositivo: dispositivo
        ? {
            nombre: dispositivo.nombre,
            ubicacion: dispositivo.ubicacion,
            categoria: dispositivo.categoria,
            templateId: dispositivo.templateId,
          }
        : null,
      estado: "pendiente",
      prioridad,
      tipoTrabajo,
      fechaProgramada: new Date(fechaProgramada),
      horaProgramada,
      observaciones: observaciones || "",
      tecnicoAsignado: null,
      creadoPor: new ObjectId(adminUser._id),
      fechaCreacion: new Date(),
      historial: [
        {
          accion: "creada",
          fecha: new Date(),
          usuario: adminUser.userName,
          observaciones: "Orden de trabajo creada",
        },
      ],
    }

    const result = await workOrdersCollection.insertOne(newWorkOrder)
    return {
      ...newWorkOrder,
      _id: result.insertedId,
    }
  } catch (error) {
    console.error("Error en createWorkOrder:", error)
    throw error
  }
}

// Actualizar orden de trabajo
async function updateWorkOrder(id, workOrderData, adminUser) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("ID de orden de trabajo inválido")
    }

    const workOrder = await workOrdersCollection.findOne({ _id: new ObjectId(id) })
    if (!workOrder) {
      throw new Error("Orden de trabajo no encontrada")
    }

    // No permitir actualizar órdenes completadas o canceladas
    if (workOrder.estado === "completada" || workOrder.estado === "cancelada") {
      throw new Error("No se puede actualizar una orden de trabajo completada o cancelada")
    }

    const updateData = {
      ...workOrderData,
      fechaActualizacion: new Date(),
    }

    // Si se cambia la instalación, verificar que existe
    if (workOrderData.instalacionId && workOrderData.instalacionId !== workOrder.instalacionId.toString()) {
      const installation = await installationsCollection.findOne({ _id: new ObjectId(workOrderData.instalacionId) })
      if (!installation) {
        throw new Error("La instalación especificada no existe")
      }
      updateData.instalacionId = new ObjectId(workOrderData.instalacionId)
    }

    // Si se especifica un dispositivo, verificar que existe
    if (workOrderData.dispositivoId) {
      const installation = await installationsCollection.findOne({
        _id: updateData.instalacionId || workOrder.instalacionId,
      })
      const dispositivo = installation.devices?.find((device) => device._id.toString() === workOrderData.dispositivoId)
      if (!dispositivo) {
        throw new Error("El dispositivo especificado no existe en la instalación")
      }
      updateData.dispositivoId = new ObjectId(workOrderData.dispositivoId)
      updateData.dispositivo = {
        nombre: dispositivo.nombre,
        ubicacion: dispositivo.ubicacion,
        categoria: dispositivo.categoria,
        templateId: dispositivo.templateId,
      }
    }

    // Agregar entrada al historial
    const historialEntry = {
      accion: "actualizada",
      fecha: new Date(),
      usuario: adminUser.userName,
      observaciones: "Orden de trabajo actualizada",
    }

    const result = await workOrdersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: updateData,
        $push: { historial: historialEntry },
      },
      { returnDocument: "after" },
    )

    return result
  } catch (error) {
    console.error("Error en updateWorkOrder:", error)
    throw error
  }
}

// Eliminar orden de trabajo
async function deleteWorkOrder(id, adminUser) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("ID de orden de trabajo inválido")
    }

    const workOrder = await workOrdersCollection.findOne({ _id: new ObjectId(id) })
    if (!workOrder) {
      throw new Error("Orden de trabajo no encontrada")
    }

    // Solo permitir eliminar si no está completada
    if (workOrder.estado === "completada") {
      throw new Error("No se puede eliminar una orden de trabajo completada")
    }

    const result = await workOrdersCollection.deleteOne({ _id: new ObjectId(id) })
    if (result.deletedCount === 0) {
      throw new Error("No se pudo eliminar la orden de trabajo")
    }

    return { message: "Orden de trabajo eliminada correctamente" }
  } catch (error) {
    console.error("Error en deleteWorkOrder:", error)
    throw error
  }
}

// Asignar orden de trabajo a técnico
async function assignWorkOrder(id, tecnicoId, adminUser) {
  try {
    if (!ObjectId.isValid(id) || !ObjectId.isValid(tecnicoId)) {
      throw new Error("IDs inválidos")
    }

    const workOrder = await workOrdersCollection.findOne({ _id: new ObjectId(id) })
    if (!workOrder) {
      throw new Error("Orden de trabajo no encontrada")
    }

    // Verificar que el técnico existe y tiene el rol correcto (aceptar 'tecnico' y 'técnico')
    const tecnico = await accountsCollection.findOne({
      _id: new ObjectId(tecnicoId),
      role: { $in: ["tecnico", "técnico"] },
      status: "active",
    })
    if (!tecnico) {
      throw new Error("Técnico no encontrado o inactivo")
    }

    // Solo se pueden asignar órdenes pendientes
    if (workOrder.estado !== "pendiente") {
      throw new Error("Solo se pueden asignar órdenes de trabajo pendientes")
    }

    const historialEntry = {
      accion: "asignada",
      fecha: new Date(),
      usuario: adminUser.userName,
      observaciones: `Asignada al técnico: ${tecnico.userName}`,
    }

    const result = await workOrdersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          tecnicoAsignado: new ObjectId(tecnicoId),
          estado: "asignada",
          fechaAsignacion: new Date(),
        },
        $push: { historial: historialEntry },
      },
      { returnDocument: "after" },
    )

    return result
  } catch (error) {
    console.error("Error en assignWorkOrder:", error)
    throw error
  }
}

// Actualizar estado de orden de trabajo
async function updateWorkOrderStatus(id, estado, observaciones, adminUser) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("ID de orden de trabajo inválido")
    }

    const workOrder = await workOrdersCollection.findOne({ _id: new ObjectId(id) })
    if (!workOrder) {
      throw new Error("Orden de trabajo no encontrada")
    }

    const estadosValidos = ["pendiente", "asignada", "en_progreso", "completada", "cancelada"]
    if (!estadosValidos.includes(estado)) {
      throw new Error("Estado inválido")
    }

    const updateData = {
      estado,
      fechaActualizacion: new Date(),
    }

    if (estado === "cancelada") {
      updateData.fechaCancelada = new Date()
    }

    const historialEntry = {
      accion: "cambio_estado",
      fecha: new Date(),
      usuario: adminUser.userName,
      observaciones: `Estado cambiado a: ${estado}${observaciones ? ". " + observaciones : ""}`,
    }

    const result = await workOrdersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: updateData,
        $push: { historial: historialEntry },
      },
      { returnDocument: "after" },
    )

    return result
  } catch (error) {
    console.error("Error en updateWorkOrderStatus:", error)
    throw error
  }
}

// Obtener órdenes de trabajo del técnico
async function getTechnicianWorkOrders(tecnicoId, estado = null) {
  try {
    const query = { tecnicoAsignado: new ObjectId(tecnicoId) }
    if (estado) {
      query.estado = estado
    }

    const workOrders = await workOrdersCollection
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: "instalaciones",
            localField: "instalacionId",
            foreignField: "_id",
            as: "instalacion",
          },
        },
        {
          $project: {
            titulo: 1,
            descripcion: 1,
            estado: 1,
            prioridad: 1,
            tipoTrabajo: 1,
            fechaProgramada: 1,
            horaProgramada: 1,
            fechaAsignacion: 1,
            fechaInicio: 1,
            observaciones: 1,
            "instalacion.company": 1,
            "instalacion.address": 1,
            "instalacion.city": 1,
            dispositivoId: 1,
            dispositivo: 1,
          },
        },
        { $sort: { fechaProgramada: 1, prioridad: -1 } },
      ])
      .toArray()

    return workOrders
  } catch (error) {
    console.error("Error en getTechnicianWorkOrders:", error)
    throw new Error("Error al obtener las órdenes del técnico")
  }
}

// Obtener orden de trabajo por ID
async function getWorkOrderById(id, user) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("ID de orden de trabajo inválido")
    }

    const workOrder = await workOrdersCollection
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $lookup: {
            from: "instalaciones",
            localField: "instalacionId",
            foreignField: "_id",
            as: "instalacion",
          },
        },
        {
          $lookup: {
            from: "cuentas",
            localField: "tecnicoAsignado",
            foreignField: "_id",
            as: "tecnico",
          },
        },
        {
          $lookup: {
            from: "cuentas",
            localField: "creadoPor",
            foreignField: "_id",
            as: "creador",
          },
        },
      ])
      .toArray()

    if (!workOrder || workOrder.length === 0) {
      throw new Error("Orden de trabajo no encontrada")
    }

    const orden = workOrder[0]

    // Si es técnico, solo puede ver sus propias órdenes
    if (
      user.role === "tecnico" &&
      (!orden.tecnicoAsignado || orden.tecnicoAsignado.toString() !== user._id.toString())
    ) {
      throw new Error("No tienes permisos para ver esta orden de trabajo")
    }

    return orden
  } catch (error) {
    console.error("Error en getWorkOrderById:", error)
    throw error
  }
}

// Obtener formulario para orden de trabajo
async function getWorkOrderForm(id, user) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("ID de orden de trabajo inválido")
    }

    const workOrder = await workOrdersCollection.findOne({ _id: new ObjectId(id) })
    if (!workOrder) {
      throw new Error("Orden de trabajo no encontrada")
    }

    // Verificar permisos
    if (
      user.role === "técnico" &&
      (!workOrder.tecnicoAsignado || workOrder.tecnicoAsignado.toString() !== user._id.toString())
    ) {
      throw new Error("No tienes permisos para ver esta orden de trabajo")
    }

    // Si no hay dispositivo, devolver formulario básico
    if (!workOrder.dispositivoId) {
      return {
        workOrderInfo: {
          titulo: workOrder.titulo,
          descripcion: workOrder.descripcion,
          tipoTrabajo: workOrder.tipoTrabajo,
        },
        formFields: [],
      }
    }

    // Obtener el dispositivo actual de la instalación
    const installation = await installationsCollection.findOne(
      {
        _id: workOrder.instalacionId,
        "devices._id": workOrder.dispositivoId,
      },
      { projection: { "devices.$": 1 } },
    )

    if (!installation || !installation.devices || installation.devices.length === 0) {
      throw new Error("No se encontró el dispositivo en la instalación")
    }

    const device = installation.devices[0]

    // Obtener los campos del formulario
    const formFields = await getFormFieldsByCategory(device.categoria, device.templateId)

    return {
      workOrderInfo: {
        titulo: workOrder.titulo,
        descripcion: workOrder.descripcion,
        tipoTrabajo: workOrder.tipoTrabajo,
      },
      deviceInfo: {
        nombre: device.nombre,
        ubicacion: device.ubicacion,
        categoria: device.categoria,
        templateId: device.templateId,
      },
      formFields,
    }
  } catch (error) {
    console.error("Error en getWorkOrderForm:", error)
    throw error
  }
}

// Completar orden de trabajo (MODIFICADO para validaciones más flexibles)
async function completeWorkOrder(id, completionData, user) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("ID de orden de trabajo inválido")
    }

    const workOrder = await workOrdersCollection.findOne({ _id: new ObjectId(id) })
    if (!workOrder) {
      throw new Error("Orden de trabajo no encontrada")
    }

    // Verificar permisos
    if (
      user.role === "tecnico" &&
      (!workOrder.tecnicoAsignado || workOrder.tecnicoAsignado.toString() !== user._id.toString())
    ) {
      throw new Error("No tienes permisos para completar esta orden de trabajo")
    }

    // Solo se pueden completar órdenes asignadas o en progreso
    if (workOrder.estado !== "asignada" && workOrder.estado !== "en_progreso") {
      throw new Error("Solo se pueden completar órdenes asignadas o en progreso")
    }

    const currentDateTime = new Date()
    const formattedDateTime = formatDateTime(currentDateTime)

    // VALIDACIÓN OPCIONAL del formulario personalizado (solo advertencias, no errores)
    if (workOrder.dispositivoId && completionData.formularioRespuestas) {
      try {
        await validateCustomFormResponses(workOrder, completionData.formularioRespuestas)
      } catch (validationError) {
        // Solo registrar la advertencia, no fallar la operación
        console.warn("Advertencia en formulario personalizado:", validationError.message)
      }
    }

    // Generar PDF con la información de la orden completada
    const pdfBuffer = await generateWorkOrderPDF(workOrder, completionData, user, formattedDateTime.fullDateTime)
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("Error al generar el PDF de la orden de trabajo")
    }

    const timestamp = Date.now()

    // Subir PDF a Cloudinary
    const cloudinaryResult = await uploadWorkOrderPDFToCloudinary(pdfBuffer, id, timestamp)

    // Guardar copia local como respaldo
    const pdfFileName = `work_order_${id}_${timestamp}.pdf`
    const pdfPath = path.join(pdfDirectory, pdfFileName)
    fs.writeFileSync(pdfPath, pdfBuffer)

    const pdfUrl = cloudinaryResult.secure_url

    // Actualizar estado del dispositivo si se especificó
    if (workOrder.dispositivoId && completionData.estadoDispositivo) {
      await installationsCollection.updateOne(
        {
          _id: workOrder.instalacionId,
          "devices._id": workOrder.dispositivoId,
        },
        {
          $set: {
            "devices.$.estado": completionData.estadoDispositivo,
            "devices.$.fechaUltimoMantenimiento": currentDateTime,
          },
        },
      )
    }

    const historialEntry = {
      accion: "completada",
      fecha: currentDateTime,
      usuario: user.userName,
      observaciones: `Orden completada. ${completionData.observaciones}`,
    }

    const completionRecord = {
      fechaCompletada: currentDateTime,
      completadoPor: user.userName,
      observaciones: completionData.observaciones,
      trabajoRealizado: completionData.trabajoRealizado,
      materialesUtilizados: completionData.materialesUtilizados || [],
      tiempoTrabajo: completionData.tiempoTrabajo,
      estadoDispositivo: completionData.estadoDispositivo,
      formularioRespuestas: completionData.formularioRespuestas || {},
      pdfUrl: pdfUrl,
    }

    const result = await workOrdersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          estado: "completada",
          ...completionRecord,
        },
        $push: { historial: historialEntry },
      },
      { returnDocument: "after" },
    )

    return {
      ...result,
      pdfUrl: pdfUrl,
    }
  } catch (error) {
    console.error("Error en completeWorkOrder:", error)
    throw error
  }
}

// Validar respuestas del formulario personalizado (MODIFICADO para ser más flexible)
async function validateCustomFormResponses(workOrder, formularioRespuestas) {
  try {
    if (!workOrder.dispositivoId) return

    // Obtener el dispositivo actual
    const installation = await installationsCollection.findOne(
      {
        _id: workOrder.instalacionId,
        "devices._id": workOrder.dispositivoId,
      },
      { projection: { "devices.$": 1 } },
    )

    if (!installation || !installation.devices || installation.devices.length === 0) {
      return
    }

    const device = installation.devices[0]

    // Obtener los campos del formulario
    const formFields = await getFormFieldsByCategory(device.categoria, device.templateId)

    // Solo validar campos críticos (no todos los requeridos)
    const criticalFields = formFields.filter(
      (field) => field.required && field.critical === true, // Solo si está marcado como crítico
    )

    const missingCriticalFields = criticalFields
      .filter((field) => !formularioRespuestas[field.name] || formularioRespuestas[field.name] === "")
      .map((field) => field.label || field.name)

    if (missingCriticalFields.length > 0) {
      console.warn(`Campos críticos faltantes: ${missingCriticalFields.join(", ")}`)
      // No lanzar error, solo advertir
    }

    // Validaciones básicas por tipo de campo (solo para campos completados)
    for (const field of formFields) {
      const value = formularioRespuestas[field.name]
      if (value !== null && value !== undefined && value !== "") {
        // Validar según el tipo de campo
        switch (field.type) {
          case "number":
            if (isNaN(Number(value))) {
              console.warn(`El campo "${field.label}" debe ser un número válido`)
            }
            break
          case "date":
            if (isNaN(Date.parse(value))) {
              console.warn(`El campo "${field.label}" debe ser una fecha válida`)
            }
            break
          case "select":
          case "radio":
            if (field.options && Array.isArray(field.options) && !field.options.includes(value)) {
              console.warn(`El valor seleccionado para "${field.label}" no es válido`)
            }
            break
        }
      }
    }
  } catch (error) {
    console.error("Error validando formulario personalizado:", error)
    // No lanzar error, solo registrar
  }
}

// Iniciar orden de trabajo
async function startWorkOrder(id, user) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("ID de orden de trabajo inválido")
    }

    const workOrder = await workOrdersCollection.findOne({ _id: new ObjectId(id) })
    if (!workOrder) {
      throw new Error("Orden de trabajo no encontrada")
    }

    // Verificar permisos
    if (
      user.role === "tecnico" &&
      (!workOrder.tecnicoAsignado || workOrder.tecnicoAsignado.toString() !== user._id.toString())
    ) {
      throw new Error("No tienes permisos para iniciar esta orden de trabajo")
    }

    // Solo se pueden iniciar órdenes asignadas
    if (workOrder.estado !== "asignada") {
      throw new Error("Solo se pueden iniciar órdenes de trabajo asignadas")
    }

    const historialEntry = {
      accion: "iniciada",
      fecha: new Date(),
      usuario: user.userName,
      observaciones: "Orden de trabajo iniciada",
    }

    const result = await workOrdersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          estado: "en_progreso",
          fechaInicio: new Date(),
        },
        $push: { historial: historialEntry },
      },
      { returnDocument: "after" },
    )

    return result
  } catch (error) {
    console.error("Error en startWorkOrder:", error)
    throw error
  }
}

// Obtener historial de orden de trabajo
async function getWorkOrderHistory(id, user) {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("ID de orden de trabajo inválido")
    }

    const workOrder = await workOrdersCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { historial: 1, tecnicoAsignado: 1 } },
    )

    if (!workOrder) {
      throw new Error("Orden de trabajo no encontrada")
    }

    // Verificar permisos
    if (
      user.role === "tecnico" &&
      (!workOrder.tecnicoAsignado || workOrder.tecnicoAsignado.toString() !== user._id.toString())
    ) {
      throw new Error("No tienes permisos para ver el historial de esta orden de trabajo")
    }

    return workOrder.historial || []
  } catch (error) {
    console.error("Error en getWorkOrderHistory:", error)
    throw error
  }
}

export {
  getAllWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  assignWorkOrder,
  updateWorkOrderStatus,
  getTechnicianWorkOrders,
  getWorkOrderById,
  getWorkOrderForm,
  completeWorkOrder,
  startWorkOrder,
  getWorkOrderHistory,
}