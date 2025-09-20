import multer from "multer";
import hetznerService from "../services/hetzner.services.js";

// Configuración de multer para almacenar archivos en memoria
const storage = multer.memoryStorage();

// Configuración de multer para reportes
const uploadReporte = multer({
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

// Middleware para subir reporte PDF a Hetzner Object Storage
const uploadReportePDFToHetzner = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    // Obtener datos necesarios del request
    const tenantId = req.user?.tenantId;
    const instalacionId = req.body?.instalacionId || req.params?.instalacionId;
    const dispositivoId = req.body?.dispositivoId || req.params?.dispositivoId;

    // Validaciones
    if (!tenantId) {
      return res.status(400).json({
        error: { message: "No se pudo identificar el tenant del usuario" }
      });
    }

    if (!instalacionId) {
      return res.status(400).json({
        error: { message: "Se requiere el ID de la instalación" }
      });
    }

    if (!dispositivoId) {
      return res.status(400).json({
        error: { message: "Se requiere el ID del dispositivo" }
      });
    }

    // Crear carpeta del dispositivo si no existe
    await hetznerService.createDispositivoFolder(tenantId, instalacionId, dispositivoId);

    // Subir reporte PDF a carpeta específica del dispositivo
    const result = await hetznerService.uploadReportePDF(
      req.file.buffer, 
      req.file.originalname,
      tenantId,
      instalacionId,
      dispositivoId
    );

    // Agregar información del archivo subido al request
    req.reporteFile = {
      secure_url: result.secure_url,
      public_id: result.public_id,
      original_filename: result.original_filename,
      bytes: result.bytes,
      format: result.format,
      resource_type: result.resource_type,
      created_at: result.created_at,
      // Información adicional de Hetzner
      hetzner: {
        bucket: result.bucket,
        key: result.key,
        etag: result.etag,
        location: result.location,
        tenant_id: result.tenant_id,
        instalacion_id: result.instalacion_id,
        dispositivo_id: result.dispositivo_id,
        file_type: result.file_type
      }
    };

    console.log(`✅ Reporte subido a Hetzner: ${result.secure_url}`);
    next();

  } catch (error) {
    console.error("Error al subir reporte a Hetzner Object Storage:", error);
    res.status(500).json({
      error: { message: "Error al subir el reporte a Hetzner Object Storage" },
    });
  }
};

// Middleware para manejar errores de multer en reportes
const handleReporteUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: { message: "El reporte es demasiado grande. Máximo 10MB permitido." },
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
      error: { message: "Solo se permiten archivos PDF para reportes." },
    });
  }

  return res.status(500).json({
    error: { message: "Error al procesar el reporte." },
  });
};

export { 
  uploadReporte, 
  uploadReportePDFToHetzner, 
  handleReporteUploadError
};
