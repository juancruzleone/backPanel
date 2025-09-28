import express from 'express';
import subscriptionController from '../controllers/controller.api.subscription.js';
import { validateToken } from '../../middleware/auth.validate.middleware.js';

const router = express.Router();

// Cancelar suscripción
router.post('/cancel', validateToken, subscriptionController.cancelSubscription);

export default router;
