import s3Client, { HETZNER_CONFIG, FOLDER_STRUCTURE } from '../config/hetzner.config.js';
import { Readable } from 'stream';

/**
 * Servicio para manejar archivos en Hetzner Object Storage
 */
class HetznerStorageService {
  
  /**
   * Crear carpetas base para un nuevo tenant
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<boolean>} - True si se crearon exitosamente
   */
  async createTenantFolders(tenantId) {
    try {
      const folders = FOLDER_STRUCTURE.getTenantFolders(tenantId);
      
      for (const folder of folders) {
        // Crear un archivo .keep para mantener la carpeta
        const keepFile = `${folder}.keep`;
        await s3Client.putObject({
          Bucket: HETZNER_CONFIG.bucket,
          Key: keepFile,
          Body: 'This file keeps the folder structure',
          ContentType: 'text/plain'
        }).promise();
        
        console.log(`✅ Carpeta creada: ${folder}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error al crear carpetas de tenant:', error);
      throw new Error(`Error al crear carpetas de tenant: ${error.message}`);
    }
  }

  /**
   * Crear carpeta para nueva instalación
   * @param {string} tenantId - ID del tenant
   * @param {string} instalacionId - ID de la instalación
   * @returns {Promise<boolean>} - True si se creó exitosamente
   */
  async createInstalacionFolder(tenantId, instalacionId) {
    try {
      const folder = FOLDER_STRUCTURE.getInstalacionFolder(tenantId, instalacionId);
      const keepFile = `${folder}.keep`;
      
      await s3Client.putObject({
        Bucket: HETZNER_CONFIG.bucket,
        Key: keepFile,
        Body: 'This file keeps the installation folder structure',
        ContentType: 'text/plain'
      }).promise();
      
      console.log(`✅ Carpeta de instalación creada: ${folder}`);
      return true;
    } catch (error) {
      console.error('Error al crear carpeta de instalación:', error);
      throw new Error(`Error al crear carpeta de instalación: ${error.message}`);
    }
  }

  /**
   * Crear carpeta para nuevo dispositivo
   * @param {string} tenantId - ID del tenant
   * @param {string} instalacionId - ID de la instalación
   * @param {string} dispositivoId - ID del dispositivo
   * @returns {Promise<boolean>} - True si se creó exitosamente
   */
  async createDispositivoFolder(tenantId, instalacionId, dispositivoId) {
    try {
      const folder = FOLDER_STRUCTURE.getDispositivoFolder(tenantId, instalacionId, dispositivoId);
      const keepFile = `${folder}.keep`;
      
      await s3Client.putObject({
        Bucket: HETZNER_CONFIG.bucket,
        Key: keepFile,
        Body: 'This file keeps the device folder structure',
        ContentType: 'text/plain'
      }).promise();
      
      console.log(`✅ Carpeta de dispositivo creada: ${folder}`);
      return true;
    } catch (error) {
      console.error('Error al crear carpeta de dispositivo:', error);
      throw new Error(`Error al crear carpeta de dispositivo: ${error.message}`);
    }
  }

  /**
   * Subir manual PDF a carpeta de tenant
   * @param {object} file - Archivo a subir
   * @param {string} tenantId - ID del tenant
   * @param {string} filename - Nombre del archivo
   * @returns {Promise<Object>} - Información del archivo subido
   */
  async uploadManualPDF(file, tenantId, filename) {
    try {
      console.log(`📤 Subiendo manual PDF para tenant: ${tenantId}`);
      
      // En desarrollo sin credenciales, simular subida local
      if (!s3Client) {
        console.log('⚠️ Modo desarrollo: Simulando subida de manual');
        
        const timestamp = Date.now();
        const simulatedKey = `tenants/${tenantId}/manuals/${timestamp}_${filename}`;
        
        const fileData = {
          key: simulatedKey,
          location: `http://localhost:2023/uploads/${simulatedKey}`,
          bucket: 'local-dev',
          etag: `"${timestamp}"`,
          publicUrl: `http://localhost:2023/uploads/${simulatedKey}`,
          filename: filename,
          contentType: file.mimetype,
          size: file.size,
          tenantId: tenantId,
          uploadedAt: new Date(),
          isDevelopment: true
        };
        
        console.log(`✅ Manual PDF simulado exitosamente:`, {
          key: fileData.key,
          publicUrl: fileData.publicUrl,
          size: fileData.size
        });
        
        return fileData;
      }
      
      // Generar key único para el archivo
      const timestamp = Date.now();
      const key = FOLDER_STRUCTURE.getManualPath(tenantId, `${timestamp}_${filename}`);
      
      // Convertir buffer a stream si es necesario
      let body = file.buffer;
      
      // Manejar diferentes tipos de buffer
      if (file.buffer instanceof ArrayBuffer) {
        body = Buffer.from(file.buffer);
      } else if (Buffer.isBuffer(file.buffer)) {
        body = file.buffer;
      } else {
        body = Buffer.from(file.buffer);
      }
      
      const uploadParams = {
        Bucket: HETZNER_CONFIG.bucket,
        Key: key,
        Body: body,
        ContentType: file.mimetype || 'application/pdf',
        ContentDisposition: `inline; filename="${filename}"`,
        // Metadatos adicionales
        Metadata: {
          'tenant-id': tenantId,
          'upload-date': new Date().toISOString(),
          'original-name': filename
        }
      };
      
      console.log(`📋 Parámetros de subida:`, {
        bucket: uploadParams.Bucket,
        key: uploadParams.Key,
        contentType: uploadParams.ContentType,
        tenantId
      });
      
      const result = await s3Client.upload(uploadParams).promise();
      
      const fileData = {
        key: result.Key,
        location: result.Location,
        bucket: result.Bucket,
        etag: result.ETag,
        // URL pública para acceso directo
        publicUrl: `${HETZNER_CONFIG.publicUrl}/${result.Key}`,
        // Información adicional
        filename: filename,
        contentType: file.mimetype,
        size: file.size,
        tenantId: tenantId,
        uploadedAt: new Date()
      };
      
      console.log(`✅ Manual PDF subido exitosamente:`, {
        key: fileData.key,
        publicUrl: fileData.publicUrl,
        size: fileData.size
      });
      
      return fileData;
      
    } catch (error) {
      console.error('❌ Error al subir manual PDF:', error);
      throw new Error(`Error al subir manual: ${error.message}`);
    }
  }

  /**
   * Subir reporte PDF a carpeta de dispositivo
   * @param {Buffer} buffer - Buffer del archivo
   * @param {string} originalName - Nombre original del archivo
   * @param {string} tenantId - ID del tenant
   * @param {string} instalacionId - ID de la instalación
   * @param {string} dispositivoId - ID del dispositivo
   * @returns {Promise<Object>} - Información del archivo subido
   */
  async uploadReportePDF(buffer, originalName, tenantId, instalacionId, dispositivoId) {
    try {
      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const fileName = originalName.split('.')[0];
      const finalFileName = `reporte_${fileName}_${timestamp}.pdf`;
      const key = FOLDER_STRUCTURE.getReportPath(tenantId, instalacionId, dispositivoId, finalFileName);

      // Parámetros para la subida
      const uploadParams = {
        Bucket: HETZNER_CONFIG.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
        ContentDisposition: `inline; filename="${originalName}"`,
        ACL: 'public-read',
        Metadata: {
          'original-name': originalName,
          'upload-timestamp': timestamp.toString(),
          'content-type': 'application/pdf',
          'tenant-id': tenantId,
          'instalacion-id': instalacionId,
          'dispositivo-id': dispositivoId,
          'file-type': 'reporte'
        }
      };

      const result = await s3Client.upload(uploadParams).promise();
      const publicUrl = `${HETZNER_CONFIG.publicUrl}/${key}`;

      return {
        secure_url: publicUrl,
        public_id: key,
        original_filename: originalName,
        bytes: buffer.length,
        format: 'pdf',
        resource_type: 'raw',
        created_at: new Date().toISOString(),
        bucket: HETZNER_CONFIG.bucket,
        key: key,
        etag: result.ETag,
        location: result.Location,
        tenant_id: tenantId,
        instalacion_id: instalacionId,
        dispositivo_id: dispositivoId,
        file_type: 'reporte'
      };

    } catch (error) {
      console.error('Error al subir reporte PDF:', error);
      throw new Error(`Error al subir reporte: ${error.message}`);
    }
  }

  /**
   * Subir archivo PDF a Hetzner Object Storage (método genérico - DEPRECADO)
   * @param {Buffer} buffer - Buffer del archivo
   * @param {string} originalName - Nombre original del archivo
   * @param {string} folder - Carpeta donde guardar (opcional)
   * @returns {Promise<Object>} - Información del archivo subido
   */
  async uploadPDF(buffer, originalName, folder = 'manuales') {
    try {
      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const fileName = originalName.split('.')[0];
      const key = `${folder}/manual_${fileName}_${timestamp}.pdf`;

      // Parámetros para la subida
      const uploadParams = {
        Bucket: HETZNER_CONFIG.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
        ContentDisposition: `inline; filename="${originalName}"`,
        // ACL público para acceso directo
        ACL: 'public-read',
        // Metadatos
        Metadata: {
          'original-name': originalName,
          'upload-timestamp': timestamp.toString(),
          'content-type': 'application/pdf'
        }
      };

      // Subir archivo
      const result = await s3Client.upload(uploadParams).promise();

      // Construir URL pública
      const publicUrl = `${HETZNER_CONFIG.publicUrl}/${key}`;

      return {
        secure_url: publicUrl,
        public_id: key,
        original_filename: originalName,
        bytes: buffer.length,
        format: 'pdf',
        resource_type: 'raw',
        created_at: new Date().toISOString(),
        // Información adicional de Hetzner
        bucket: HETZNER_CONFIG.bucket,
        key: key,
        etag: result.ETag,
        location: result.Location
      };

    } catch (error) {
      console.error('Error al subir archivo a Hetzner Object Storage:', error);
      throw new Error(`Error al subir archivo: ${error.message}`);
    }
  }

  /**
   * Eliminar archivo de Hetzner Object Storage
   * @param {string} key - Clave del archivo (public_id)
   * @returns {Promise<Object>} - Resultado de la eliminación
   */
  async deleteFile(key) {
    try {
      const deleteParams = {
        Bucket: HETZNER_CONFIG.bucket,
        Key: key
      };

      const result = await s3Client.deleteObject(deleteParams).promise();
      
      return {
        result: 'ok',
        key: key,
        deleted: true
      };

    } catch (error) {
      console.error('Error al eliminar archivo de Hetzner Object Storage:', error);
      throw new Error(`Error al eliminar archivo: ${error.message}`);
    }
  }

  /**
   * Obtener información de un archivo
   * @param {string} key - Clave del archivo
   * @returns {Promise<Object>} - Información del archivo
   */
  async getFileInfo(key) {
    try {
      const params = {
        Bucket: HETZNER_CONFIG.bucket,
        Key: key
      };

      const result = await s3Client.headObject(params).promise();
      
      return {
        key: key,
        size: result.ContentLength,
        lastModified: result.LastModified,
        contentType: result.ContentType,
        metadata: result.Metadata,
        etag: result.ETag
      };

    } catch (error) {
      console.error('Error al obtener información del archivo:', error);
      throw new Error(`Error al obtener información: ${error.message}`);
    }
  }

  /**
   * Listar archivos en una carpeta
   * @param {string} folder - Carpeta a listar
   * @param {number} maxKeys - Máximo número de archivos a listar
   * @returns {Promise<Array>} - Lista de archivos
   */
  async listFiles(folder = 'manuales', maxKeys = 100) {
    try {
      const params = {
        Bucket: HETZNER_CONFIG.bucket,
        Prefix: `${folder}/`,
        MaxKeys: maxKeys
      };

      const result = await s3Client.listObjectsV2(params).promise();
      
      return result.Contents.map(file => ({
        key: file.Key,
        size: file.Size,
        lastModified: file.LastModified,
        etag: file.ETag,
        publicUrl: `${HETZNER_CONFIG.publicUrl}/${file.Key}`
      }));

    } catch (error) {
      console.error('Error al listar archivos:', error);
      throw new Error(`Error al listar archivos: ${error.message}`);
    }
  }

  /**
   * Generar URL firmada para acceso temporal (opcional)
   * @param {string} key - Clave del archivo
   * @param {number} expiresIn - Tiempo de expiración en segundos (default: 1 hora)
   * @returns {string} - URL firmada
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      const params = {
        Bucket: HETZNER_CONFIG.bucket,
        Key: key,
        Expires: expiresIn
      };

      return s3Client.getSignedUrl('getObject', params);

    } catch (error) {
      console.error('Error al generar URL firmada:', error);
      throw new Error(`Error al generar URL firmada: ${error.message}`);
    }
  }

  /**
   * Verificar si el bucket existe y crear si no existe
   * @returns {Promise<boolean>} - True si existe o se creó exitosamente
   */
  async ensureBucketExists() {
    try {
      // Verificar si el bucket existe
      await s3Client.headBucket({ Bucket: HETZNER_CONFIG.bucket }).promise();
      console.log(`✅ Bucket ${HETZNER_CONFIG.bucket} existe`);
      return true;

    } catch (error) {
      if (error.statusCode === 404) {
        // Bucket no existe, intentar crear
        try {
          await s3Client.createBucket({ 
            Bucket: HETZNER_CONFIG.bucket,
            CreateBucketConfiguration: {
              LocationConstraint: HETZNER_CONFIG.region
            }
          }).promise();
          
          console.log(`✅ Bucket ${HETZNER_CONFIG.bucket} creado exitosamente`);
          return true;

        } catch (createError) {
          console.error('Error al crear bucket:', createError);
          throw new Error(`Error al crear bucket: ${createError.message}`);
        }
      } else {
        console.error('Error al verificar bucket:', error);
        throw new Error(`Error al verificar bucket: ${error.message}`);
      }
    }
  }
}

export default new HetznerStorageService();
 