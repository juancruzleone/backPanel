import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Verificar si estamos en desarrollo y si faltan credenciales
const isDevelopment = process.env.NODE_ENV !== 'production';
const hasCredentials = process.env.HETZNER_SECRET_KEY && process.env.HETZNER_ACCESS_KEY;

// Configuración de Hetzner Object Storage (S3 Compatible)
const hetznerConfig = {
  accessKeyId: process.env.HETZNER_ACCESS_KEY || 'fake-dev-key',
  secretAccessKey: process.env.HETZNER_SECRET_KEY || 'fake-dev-secret',
  endpoint: process.env.HETZNER_ENDPOINT || 'https://fsn1.your-objectstorage.com',
  region: process.env.HETZNER_REGION || 'fsn1',
  s3ForcePathStyle: true, // Necesario para Hetzner
  signatureVersion: 'v4'
};

// Crear cliente S3 para Hetzner solo si tenemos credenciales reales
let s3Client = null;
if (hasCredentials) {
  s3Client = new AWS.S3(hetznerConfig);
  console.log('✅ Cliente Hetzner S3 configurado');
} else if (isDevelopment) {
  console.log('⚠️ Modo desarrollo: Hetzner deshabilitado (faltan credenciales)');
} else {
  console.error('❌ Credenciales de Hetzner requeridas en producción');
}

// Configuración del bucket
export const HETZNER_CONFIG = {
  bucket: process.env.HETZNER_BUCKET_NAME || 'leonix-gmao',
  region: hetznerConfig.region,
  endpoint: hetznerConfig.endpoint,
  // URLs públicas para acceso directo
  publicUrl: `https://${process.env.HETZNER_BUCKET_NAME || 'leonix-gmao'}.${hetznerConfig.region}.your-objectstorage.com`
};

// Estructura de carpetas jerárquica
export const FOLDER_STRUCTURE = {
  // Estructura: tenant/instalacion/dispositivo/reportes/
  getReportPath: (tenantId, instalacionId, dispositivoId, fileName) => {
    return `${tenantId}/instalaciones/${instalacionId}/dispositivos/${dispositivoId}/reportes/${fileName}`;
  },

  // Estructura: tenant/manuales/
  getManualPath: (tenantId, fileName) => {
    return `${tenantId}/manuales/${fileName}`;
  },

  // Estructura: tenant/instalaciones/[instalacionId]/contratos/
  getContractPath: (tenantId, instalacionId, fileName) => {
    return `${tenantId}/instalaciones/${instalacionId}/contratos/${fileName}`;
  },

  // Estructura: tenant/instalaciones/[instalacionId]/documentos/
  getDocumentPath: (tenantId, instalacionId, fileName) => {
    return `${tenantId}/instalaciones/${instalacionId}/documentos/${fileName}`;
  },

  // Crear carpetas base para un nuevo tenant
  getTenantFolders: (tenantId) => {
    return [
      `${tenantId}/instalaciones/`,
      `${tenantId}/manuales/`,
      `${tenantId}/contratos/`
    ];
  },

  // Crear carpeta para nueva instalación
  getInstalacionFolder: (tenantId, instalacionId) => {
    return `${tenantId}/instalaciones/${instalacionId}/dispositivos/`;
  },

  // Crear carpeta para nuevo dispositivo
  getDispositivoFolder: (tenantId, instalacionId, dispositivoId) => {
    return `${tenantId}/instalaciones/${instalacionId}/dispositivos/${dispositivoId}/reportes/`;
  }
};

export default s3Client;
