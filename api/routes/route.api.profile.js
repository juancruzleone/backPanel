import { Router } from 'express';
import * as controllers from '../controllers/controller.api.profile.js';
import { validateProfile } from '../../middleware/profile.validate.middleware.js'; 

const route = Router();

route.put('/cuenta/profile', validateProfile, controllers.editProfile); 

export default route;
