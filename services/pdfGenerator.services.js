import PDFDocument from "pdfkit"

export async function generatePDF(formResponses, device) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument()
    const buffers = []

    doc.on("data", buffers.push.bind(buffers))
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers)
      resolve(pdfData)
    })

    // Generar el contenido del PDF
    doc.fontSize(18).text(`Mantenimiento - ${device.nombre}`, { align: "center" })
    doc.moveDown()
    doc.fontSize(14).text(`Ubicación: ${device.ubicacion}`)
    doc.fontSize(14).text(`Categoría: ${device.categoria}`)
    doc.moveDown()

    // Añadir fecha y hora del mantenimiento
    const fechaActual = new Date().toLocaleString()
    doc.fontSize(12).text(`Fecha de mantenimiento: ${fechaActual}`)
    doc.moveDown()

    // Verificar si formResponses es un objeto o un array
    if (Array.isArray(formResponses)) {
      formResponses.forEach((response) => {
        doc.fontSize(12).text(`${response.question}: ${response.answer}`)
      })
    } else if (typeof formResponses === "object" && formResponses !== null) {
      Object.entries(formResponses).forEach(([key, value]) => {
        // Formatear la clave para que sea más legible (convertir camelCase a palabras)
        const formattedKey = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())

        // Manejar diferentes tipos de valores
        let displayValue = value
        if (value instanceof Date) {
          displayValue = value.toLocaleString()
        } else if (typeof value === "object" && value !== null) {
          displayValue = JSON.stringify(value)
        }

        doc.fontSize(12).text(`${formattedKey}: ${displayValue}`)
      })
    } else {
      doc.fontSize(12).text("No se proporcionaron respuestas válidas.")
    }

    doc.end()
  })
}
