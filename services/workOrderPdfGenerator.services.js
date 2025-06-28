import PDFDocument from "pdfkit"
import { getFormTemplateById } from "./formFields.services.js"

export async function generateWorkOrderPDF(workOrder, completionData, user, completionDateTime) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 })
      const buffers = []

      doc.on("data", buffers.push.bind(buffers))
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })

      // Encabezado
      doc.fontSize(20).font("Helvetica-Bold").text("ORDEN DE TRABAJO COMPLETADA", { align: "center" })
      doc.moveDown()

      // Información de la orden
      doc.fontSize(14).font("Helvetica-Bold").text("INFORMACIÓN DE LA ORDEN", { underline: true })
      doc.moveDown(0.5)

      doc.fontSize(12).font("Helvetica")
      doc.text(`Título: ${workOrder.titulo}`)
      doc.text(`Descripción: ${workOrder.descripcion}`)
      doc.text(`Tipo de trabajo: ${workOrder.tipoTrabajo}`)
      doc.text(`Prioridad: ${workOrder.prioridad}`)
      doc.text(`Estado: ${workOrder.estado}`)
      doc.moveDown()

      // Información de fechas
      doc.font("Helvetica-Bold").text("FECHAS", { underline: true })
      doc.moveDown(0.5)
      doc.font("Helvetica")
      doc.text(`Fecha programada: ${new Date(workOrder.fechaProgramada).toLocaleDateString("es-ES")}`)
      doc.text(`Hora programada: ${workOrder.horaProgramada}`)
      if (workOrder.fechaInicio) {
        doc.text(`Fecha de inicio: ${new Date(workOrder.fechaInicio).toLocaleString("es-ES")}`)
      }
      doc.text(`Fecha de finalización: ${completionDateTime}`)
      doc.moveDown()

      // Información del técnico
      doc.font("Helvetica-Bold").text("TÉCNICO RESPONSABLE", { underline: true })
      doc.moveDown(0.5)
      doc.font("Helvetica")
      doc.text(`Completado por: ${user.userName}`)
      doc.text(`Tiempo de trabajo: ${completionData.tiempoTrabajo} horas`)
      doc.moveDown()

      // Trabajo realizado
      doc.font("Helvetica-Bold").text("TRABAJO REALIZADO", { underline: true })
      doc.moveDown(0.5)
      doc.font("Helvetica")
      doc.text(completionData.trabajoRealizado, { width: 500, align: "justify" })
      doc.moveDown()

      // Materiales utilizados
      if (completionData.materialesUtilizados && completionData.materialesUtilizados.length > 0) {
        doc.font("Helvetica-Bold").text("MATERIALES UTILIZADOS", { underline: true })
        doc.moveDown(0.5)
        doc.font("Helvetica")

        completionData.materialesUtilizados.forEach((material, index) => {
          doc.text(`${index + 1}. ${material.nombre} - Cantidad: ${material.cantidad} ${material.unidad}`)
        })
        doc.moveDown()
      }

      // NUEVA SECCIÓN: Formulario personalizado del dispositivo
      if (workOrder.dispositivo && workOrder.dispositivoId && completionData.formularioRespuestas) {
        await generateCustomFormSection(doc, workOrder, completionData.formularioRespuestas)
      }

      // Estado del dispositivo
      if (completionData.estadoDispositivo) {
        doc.font("Helvetica-Bold").text("ESTADO DEL DISPOSITIVO", { underline: true })
        doc.moveDown(0.5)
        doc.font("Helvetica")
        doc.text(`Estado final: ${completionData.estadoDispositivo}`)
        doc.moveDown()
      }

      // Observaciones
      doc.font("Helvetica-Bold").text("OBSERVACIONES", { underline: true })
      doc.moveDown(0.5)
      doc.font("Helvetica")
      doc.text(completionData.observaciones, { width: 500, align: "justify" })
      doc.moveDown()

      // Información de la instalación
      if (workOrder.instalacion && workOrder.instalacion.length > 0) {
        const instalacion = workOrder.instalacion[0]
        doc.font("Helvetica-Bold").text("INFORMACIÓN DE LA INSTALACIÓN", { underline: true })
        doc.moveDown(0.5)
        doc.font("Helvetica")
        doc.text(`Empresa: ${instalacion.company}`)
        doc.text(`Dirección: ${instalacion.address}`)
        doc.text(`Ciudad: ${instalacion.city}`)
        doc.moveDown()
      }

      // Información del dispositivo
      if (workOrder.dispositivo) {
        doc.font("Helvetica-Bold").text("INFORMACIÓN DEL DISPOSITIVO", { underline: true })
        doc.moveDown(0.5)
        doc.font("Helvetica")
        doc.text(`Nombre: ${workOrder.dispositivo.nombre}`)
        doc.text(`Ubicación: ${workOrder.dispositivo.ubicacion}`)
        doc.text(`Categoría: ${workOrder.dispositivo.categoria}`)
        doc.moveDown()
      }

      // Pie de página
      doc.fontSize(10).font("Helvetica")
      doc.text(`Documento generado automáticamente el ${completionDateTime}`, { align: "center" })

      doc.end()
    } catch (error) {
      console.error("Error generando PDF de orden de trabajo:", error)
      reject(error)
    }
  })
}

// Función auxiliar para generar la sección del formulario personalizado
async function generateCustomFormSection(doc, workOrder, formularioRespuestas) {
  try {
    // Obtener la plantilla del formulario del dispositivo
    let template = null

    // Primero intentar obtener la plantilla desde el dispositivo en la orden
    if (workOrder.dispositivo && workOrder.dispositivo.templateId) {
      template = await getFormTemplateById(workOrder.dispositivo.templateId.toString())
    }

    // Si no hay template en el dispositivo de la orden, buscar en la instalación original
    if (!template && workOrder.instalacionId && workOrder.dispositivoId) {
      const { db } = await import("../db.js")
      const { ObjectId } = await import("mongodb")

      const installationsCollection = db.collection("instalaciones")
      const installation = await installationsCollection.findOne(
        {
          _id: new ObjectId(workOrder.instalacionId),
          "devices._id": new ObjectId(workOrder.dispositivoId),
        },
        { projection: { "devices.$": 1 } },
      )

      if (installation && installation.devices && installation.devices[0] && installation.devices[0].templateId) {
        template = await getFormTemplateById(installation.devices[0].templateId.toString())
      }
    }

    if (!template || !template.campos || template.campos.length === 0) {
      // Si no hay plantilla, mostrar las respuestas tal como están
      doc.font("Helvetica-Bold").text("DATOS DEL FORMULARIO", { underline: true })
      doc.moveDown(0.5)
      doc.font("Helvetica")

      Object.entries(formularioRespuestas).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")
          doc.text(`${label}: ${formatFieldValue(value)}`)
        }
      })
      doc.moveDown()
      return
    }

    // Generar sección con la plantilla del formulario
    doc.font("Helvetica-Bold").text(`FORMULARIO: ${template.nombre.toUpperCase()}`, { underline: true })
    doc.moveDown(0.5)

    if (template.descripcion) {
      doc.fontSize(10).font("Helvetica").text(template.descripcion, { style: "italic" })
      doc.fontSize(12).moveDown(0.3)
    }

    doc.font("Helvetica")

    // Procesar cada campo de la plantilla
    template.campos.forEach((campo) => {
      const valor = formularioRespuestas[campo.name]

      if (valor !== null && valor !== undefined && valor !== "") {
        const valorFormateado = formatFieldValueByType(valor, campo.type, campo.options)
        doc.text(`${campo.label}: ${valorFormateado}`)
      } else if (campo.required) {
        // Mostrar campos requeridos aunque estén vacíos
        doc.text(`${campo.label}: [No completado]`)
      }
    })

    // Mostrar campos adicionales que no están en la plantilla
    const camposPlantilla = template.campos.map((c) => c.name)
    const camposAdicionales = Object.keys(formularioRespuestas).filter(
      (key) =>
        !camposPlantilla.includes(key) &&
        formularioRespuestas[key] !== null &&
        formularioRespuestas[key] !== undefined &&
        formularioRespuestas[key] !== "",
    )

    if (camposAdicionales.length > 0) {
      doc.moveDown(0.5)
      doc.font("Helvetica-Bold").text("INFORMACIÓN ADICIONAL:", { underline: true })
      doc.moveDown(0.3)
      doc.font("Helvetica")

      camposAdicionales.forEach((key) => {
        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")
        doc.text(`${label}: ${formatFieldValue(formularioRespuestas[key])}`)
      })
    }

    doc.moveDown()
  } catch (error) {
    console.error("Error generando sección de formulario personalizado:", error)
    // En caso de error, mostrar las respuestas de forma básica
    doc.font("Helvetica-Bold").text("DATOS DEL FORMULARIO", { underline: true })
    doc.moveDown(0.5)
    doc.font("Helvetica")

    Object.entries(formularioRespuestas).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")
        doc.text(`${label}: ${formatFieldValue(value)}`)
      }
    })
    doc.moveDown()
  }
}

// Función para formatear valores según el tipo de campo
function formatFieldValueByType(value, fieldType, options = null) {
  if (value === null || value === undefined) return "N/A"

  switch (fieldType) {
    case "date":
      try {
        const date = new Date(value)
        return date.toLocaleDateString("es-ES")
      } catch {
        return value.toString()
      }

    case "checkbox":
      return value ? "Sí" : "No"

    case "select":
    case "radio":
      // Si hay opciones definidas, verificar si el valor está en ellas
      if (options && Array.isArray(options)) {
        return options.includes(value) ? value : `${value} (personalizado)`
      }
      return value.toString()

    case "number":
      return typeof value === "number" ? value.toString() : value

    case "textarea":
      // Para campos de texto largo, limitar la longitud en el PDF
      const text = value.toString()
      return text.length > 200 ? text.substring(0, 200) + "..." : text

    case "file":
      return typeof value === "string" ? `Archivo: ${value}` : "Archivo adjunto"

    default:
      return value.toString()
  }
}

// Función auxiliar para formatear valores genéricos
function formatFieldValue(value) {
  if (value === null || value === undefined) return "N/A"
  if (typeof value === "boolean") return value ? "Sí" : "No"
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "object") return JSON.stringify(value)
  return value.toString()
}
