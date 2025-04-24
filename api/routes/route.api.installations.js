import { Router } from 'express';
import * as controllers from '../controllers/controller.api.installations.js';
import { validateToken } from '../../middleware/auth.validate.middleware.js';
import { validateInstallations, validateDevice, validateTemplateAssignment } from '../../middleware/installations.validate.middleware.js';
import { isAdmin } from '../../middleware/auth.role.middleware.js'; 
import { validateAssetId } from '../../middleware/asset.validate.middleware.js';

const route = Router();

route.get('/instalaciones', [validateToken, isAdmin], controllers.getInstallations); 
route.post('/instalaciones', [validateToken, isAdmin, validateInstallations], controllers.createInstallation);
route.put('/instalaciones/:id', [validateToken, isAdmin, validateInstallations], controllers.updateInstallation);
route.delete('/instalaciones/:id', [validateToken, isAdmin], controllers.deleteInstallation);

route.get('/instalaciones/:id/dispositivos', [validateToken, isAdmin], controllers.getDevicesFromInstallation); 
route.post('/instalaciones/:id/dispositivos', [validateToken, isAdmin, validateDevice], controllers.addDeviceToInstallation);

// Ruta para actualización completa de dispositivos (requiere todos los campos)
route.put('/instalaciones/:id/dispositivos/:deviceId', [validateToken, isAdmin, validateDevice], controllers.updateDeviceInInstallation);

// Nueva ruta específica para asignar plantilla a un dispositivo
route.patch('/instalaciones/:id/dispositivos/:deviceId/plantilla', [validateToken, isAdmin, validateTemplateAssignment], controllers.assignTemplateToDevice);

route.delete('/instalaciones/:id/dispositivos/:deviceId', [validateToken, isAdmin], controllers.deleteDeviceFromInstallation);

// Nueva ruta para agregar un activo existente a una instalación
route.post('/instalaciones/:id/activos', [validateToken, isAdmin, validateAssetId], controllers.addExistingAssetToInstallation);

route.post('/instalaciones/:installationId/dispositivos/:deviceId/mantenimiento', [validateToken, isAdmin], controllers.handleMaintenanceSubmission);
route.get('/instalaciones/:installationId/dispositivos/:deviceId/ultimo-mantenimiento', controllers.getLastMaintenanceForDevice);
route.get('/instalaciones/:installationId/dispositivos/:deviceId/formulario', [validateToken, isAdmin],  controllers.getDeviceForm);

export default route;