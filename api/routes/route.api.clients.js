import { Router } from 'express';
import * as controllers from '../controllers/controller.api.clients.js';
import { validateClient, validateClientPatch } from '../../middleware/clients.validate.middleware.js';
import { isAdmin } from '../../middleware/auth.role.middleware.js'; 

const route = Router();

route.get('/clientes', [isAdmin], controllers.getClients); 
route.get('/clientes/:id', [isAdmin] ,controllers.getClientById);
route.post('/clientes',[validateClient, isAdmin], controllers.addClient);
route.put('/clientes/:id', [validateClient, isAdmin], controllers.putClient);
route.patch('/clientes/:id', [validateClientPatch, isAdmin], controllers.patchClient);
route.delete('/clientes/:id', [isAdmin] ,controllers.deleteClient);

export default route;