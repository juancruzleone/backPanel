import multer from "multer"
import { v2 as cloudinary } from "cloudinary"
import { Readable } from "stream"

// Configuración de multer para almacenar archivos en memoria
const storage = multer.memoryStorage()

// Configuración de multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Límite de 10MB
  },
  fileFilter: (req, file, cb) => {
    // Verificar que el archivo sea un PDF
    if (file.mimetype === "application/pdf") {
      cb(null, true)
    } else {
      cb(new Error("Solo se permiten archivos PDF"), false)
    }
  },
})

// Función para subir archivo a Cloudinary
const uploadToCloudinary = (buffer, originalName) => {
  return new Promise((resolve, reject) => {
    // Generar un nombre único para el archivo
    const timestamp = Date.now()
    const fileName = originalName.split(".")[0]
    const publicId = `manual_${fileName}_${timestamp}`

    // Crear un stream desde el buffer
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "manuales", // Carpeta en Cloudinary
        public_id: publicId,
        resource_type: "raw", // Para archivos que no son imágenes
        format: "pdf",
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      },
    )

    // Convertir buffer a stream y hacer pipe al upload stream
    const bufferStream = new Readable()
    bufferStream.push(buffer)
    bufferStream.push(null)
    bufferStream.pipe(uploadStream)
  })
}

// Middleware para subir archivo a Cloudinary después de multer
const uploadPDFToCloudinary = async (req, res, next) => {
  if (!req.file) {
    return next()
  }

  try {
    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname)

    // Agregar información del archivo subido al request
    req.cloudinaryFile = {
      secure_url: result.secure_url,
      public_id: result.public_id,
      original_filename: req.file.originalname,
      bytes: result.bytes,
      format: result.format,
      resource_type: result.resource_type,
      created_at: result.created_at,
    }

    next()
  } catch (error) {
    console.error("Error al subir archivo a Cloudinary:", error)
    res.status(500).json({
      error: { message: "Error al subir el archivo a Cloudinary" },
    })
  }
}

// Middleware para manejar errores de multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: { message: "El archivo es demasiado grande. Máximo 10MB permitido." },
      })
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: { message: "Campo de archivo inesperado." },
      })
    }
  }

  if (error.message === "Solo se permiten archivos PDF") {
    return res.status(400).json({
      error: { message: "Solo se permiten archivos PDF." },
    })
  }

  return res.status(500).json({
    error: { message: "Error al procesar el archivo." },
  })
}

// Función para eliminar archivo de Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "raw",
    })
    return result
  } catch (error) {
    console.error("Error al eliminar archivo de Cloudinary:", error)
    throw error
  }
}

export { upload, uploadPDFToCloudinary, handleUploadError, uploadToCloudinary, deleteFromCloudinary }
