import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dhvbvxnxw',
  api_key: process.env.CLOUDINARY_API_KEY || '786542324239318',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'n3jdAhPmntgRrpT64P1HsEbxEpA',
  secure: true
});

export default cloudinary;