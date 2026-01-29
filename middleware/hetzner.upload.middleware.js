import multer from "multer";
import hetznerService from "../services/hetzner.services.js";

// Configuración de multer para almacenar archivos en memoria
const storage = multer.memoryStorage();

// Configuración de multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Límite de 10MB
  },
  fileFilter: (req, file, cb) => {
    // Verificar que el archivo sea un PDF
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos PDF"), false);
    }
  },
});

// Middleware para subir manual PDF a Hetzner Object Storage después de multer
const uploadPDFToHetzner = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    // Obtener tenantId del usuario autenticado
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        error: { message: "No se pudo identificar el tenant del usuario" }
      });
    }

    // Subir manual PDF a carpeta específica del tenant
    const result = await hetznerService.uploadManualPDF(
      req.file,
      tenantId,
      req.file.originalname
    );

    // Agregar información del archivo subido al request
    // Mantener la misma estructura que Cloudinary para compatibilidad
    req.cloudinaryFile = {
      secure_url: result.publicUrl || result.location,
      public_id: result.key,
      original_filename: result.filename,
      bytes: result.size,
      format: 'pdf',
      resource_type: 'raw', // Para PDFs
      created_at: result.uploadedAt || new Date(),
      // Información adicional de Hetzner
      hetzner: {
        bucket: result.bucket,
        key: result.key,
        etag: result.etag,
        location: result.location
      }
    };

    console.log(`✅ Archivo subido a Hetzner: ${result.publicUrl}`);
    next();

  } catch (error) {
    console.error("Error al subir archivo a Hetzner Object Storage:", error);
    res.status(500).json({
      error: { message: "Error al subir el archivo a Hetzner Object Storage" },
    });
  }
};

// Middleware para subir documento de instalación a Hetzner
const uploadInstallationDocumentToHetzner = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const tenantId = req.user?.tenantId;
    const { id: installationId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        error: { message: "No se pudo identificar el tenant del usuario" }
      });
    }

    if (!installationId) {
      return res.status(400).json({
        error: { message: "No se proporcionó el ID de la instalación" }
      });
    }

    // Subir documento PDF
    const result = await hetznerService.uploadInstallationDocument(
      req.file.buffer,
      req.file.originalname,
      tenantId,
      installationId
    );

    // Agregar información al request
    req.cloudinaryFile = {
      ...result,
      hetzner: {
        bucket: result.bucket,
        key: result.key,
        etag: result.etag,
        location: result.location
      }
    };

    console.log(`✅ Documento subido a Hetzner: ${result.publicUrl}`);
    next();

  } catch (error) {
    console.error("Error al subir documento a Hetzner:", error);
    res.status(500).json({
      error: { message: "Error al subir el documento a Hetzner Object Storage" },
    });
  }
};

// Middleware para manejar errores de multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: { message: "El archivo es demasiado grande. Máximo 10MB permitido." },
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: { message: "Campo de archivo inesperado." },
      });
    }
  }

  if (error.message === "Solo se permiten archivos PDF") {
    return res.status(400).json({
      error: { message: "Solo se permiten archivos PDF." },
    });
  }

  return res.status(500).json({
    error: { message: "Error al procesar el archivo." },
  });
};

// Función para eliminar archivo de Hetzner Object Storage
const deleteFromHetzner = async (publicId) => {
  try {
    const result = await hetznerService.deleteFile(publicId);
    return result;
  } catch (error) {
    console.error("Error al eliminar archivo de Hetzner Object Storage:", error);
    throw error;
  }
};

export {
  upload,
  uploadPDFToHetzner,
  uploadInstallationDocumentToHetzner,
  handleUploadError,
  deleteFromHetzner,
  // Alias para compatibilidad con código existente
  uploadPDFToHetzner as uploadPDFToCloudinary,
  deleteFromHetzner as deleteFromCloudinary
};
