import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de Hetzner Object Storage (S3 Compatible)
const hetznerConfig = {
  accessKeyId: process.env.HETZNER_ACCESS_KEY || '1FPJGHH21OGY80SORF45',
  secretAccessKey: process.env.HETZNER_SECRET_KEY,
  endpoint: process.env.HETZNER_ENDPOINT || 'https://fsn1.your-objectstorage.com',
  region: process.env.HETZNER_REGION || 'fsn1',
  s3ForcePathStyle: true, // Necesario para Hetzner
  signatureVersion: 'v4'
};

// Crear cliente S3 para Hetzner
const s3Client = new AWS.S3(hetznerConfig);

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
  
  // Crear carpetas base para un nuevo tenant
  getTenantFolders: (tenantId) => {
    return [
      `${tenantId}/instalaciones/`,
      `${tenantId}/manuales/`
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
