import hetznerService from './hetzner.services.js';

/**
 * Servicio para manejar la creación automática de carpetas en Hetzner Object Storage
 */
class TenantFoldersService {

  /**
   * Crear carpetas base cuando se crea un nuevo tenant
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<boolean>} - True si se crearon exitosamente
   */
  async onTenantCreated(tenantId) {
    try {
      console.log(`🏢 Creando carpetas base para tenant: ${tenantId}`);
      
      // Crear carpetas base del tenant
      await hetznerService.createTenantFolders(tenantId);
      
      console.log(`✅ Carpetas base creadas para tenant: ${tenantId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error al crear carpetas para tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Crear carpeta cuando se crea una nueva instalación
   * @param {string} tenantId - ID del tenant
   * @param {string} instalacionId - ID de la instalación
   * @param {string} instalacionNombre - Nombre de la instalación
   * @returns {Promise<boolean>} - True si se creó exitosamente
   */
  async onInstalacionCreated(tenantId, instalacionId, instalacionNombre = '') {
    try {
      console.log(`🏭 Creando carpeta para instalación: ${instalacionNombre} (${instalacionId})`);
      
      // Crear carpeta de la instalación
      await hetznerService.createInstalacionFolder(tenantId, instalacionId);
      
      console.log(`✅ Carpeta de instalación creada: ${instalacionId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error al crear carpeta para instalación ${instalacionId}:`, error);
      throw error;
    }
  }

  /**
   * Crear carpeta cuando se agrega un nuevo dispositivo/activo
   * @param {string} tenantId - ID del tenant
   * @param {string} instalacionId - ID de la instalación
   * @param {string} dispositivoId - ID del dispositivo/activo
   * @param {string} dispositivoNombre - Nombre del dispositivo/activo
   * @returns {Promise<boolean>} - True si se creó exitosamente
   */
  async onDispositivoCreated(tenantId, instalacionId, dispositivoId, dispositivoNombre = '') {
    try {
      console.log(`⚙️ Creando carpeta para dispositivo: ${dispositivoNombre} (${dispositivoId})`);
      
      // Crear carpeta del dispositivo
      await hetznerService.createDispositivoFolder(tenantId, instalacionId, dispositivoId);
      
      console.log(`✅ Carpeta de dispositivo creada: ${dispositivoId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error al crear carpeta para dispositivo ${dispositivoId}:`, error);
      // No lanzar error para no interrumpir la creación del dispositivo
      console.log(`⚠️ Continuando sin crear carpeta para dispositivo ${dispositivoId}`);
      return false;
    }
  }

  /**
   * Verificar y crear estructura de carpetas si no existe
   * @param {string} tenantId - ID del tenant
   * @param {string} instalacionId - ID de la instalación (opcional)
   * @param {string} dispositivoId - ID del dispositivo (opcional)
   * @returns {Promise<boolean>} - True si la estructura existe o se creó
   */
  async ensureFolderStructure(tenantId, instalacionId = null, dispositivoId = null) {
    try {
      // Verificar carpetas base del tenant
      await hetznerService.createTenantFolders(tenantId);
      
      // Si se especifica instalación, verificar su carpeta
      if (instalacionId) {
        await hetznerService.createInstalacionFolder(tenantId, instalacionId);
        
        // Si se especifica dispositivo, verificar su carpeta
        if (dispositivoId) {
          await hetznerService.createDispositivoFolder(tenantId, instalacionId, dispositivoId);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error al verificar estructura de carpetas:', error);
      return false;
    }
  }

  /**
   * Listar archivos de un tenant específico
   * @param {string} tenantId - ID del tenant
   * @param {string} tipo - Tipo de archivos ('manuales' o 'reportes')
   * @returns {Promise<Array>} - Lista de archivos
   */
  async listTenantFiles(tenantId, tipo = 'manuales') {
    try {
      let prefix;
      
      if (tipo === 'manuales') {
        prefix = `${tenantId}/manuales/`;
      } else if (tipo === 'reportes') {
        prefix = `${tenantId}/instalaciones/`;
      } else {
        prefix = `${tenantId}/`;
      }
      
      return await hetznerService.listFiles(prefix);
    } catch (error) {
      console.error(`Error al listar archivos del tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Listar reportes de un dispositivo específico
   * @param {string} tenantId - ID del tenant
   * @param {string} instalacionId - ID de la instalación
   * @param {string} dispositivoId - ID del dispositivo
   * @returns {Promise<Array>} - Lista de reportes
   */
  async listDispositivoReportes(tenantId, instalacionId, dispositivoId) {
    try {
      const prefix = `${tenantId}/instalaciones/${instalacionId}/dispositivos/${dispositivoId}/reportes/`;
      return await hetznerService.listFiles(prefix);
    } catch (error) {
      console.error(`Error al listar reportes del dispositivo ${dispositivoId}:`, error);
      throw error;
    }
  }
}

export default new TenantFoldersService();
