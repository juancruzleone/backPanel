import express from 'express';
import subscriptionController from '../controllers/controller.api.subscriptions.js';
import { validateToken } from '../../middleware/auth.validate.middleware.js';
import { isAdmin } from '../../middleware/auth.role.middleware.js';
import { identifyTenantByHeader } from '../../middleware/tenant.middleware.js';

const router = express.Router();

// Aplicar middleware de autenticación, rol admin y tenant a todas las rutas
router.use(validateToken);
router.use(isAdmin);
router.use(identifyTenantByHeader);

// @POST /api/subscriptions - Crear suscripción
router.post('/', subscriptionController.createSubscription);

// @GET /api/subscriptions - Obtener suscripciones
router.get('/', subscriptionController.getSubscriptions);

// @GET /api/subscriptions/stats - Obtener estadísticas de suscripciones
router.get('/stats', subscriptionController.getSubscriptionsStats);

// @GET /api/subscriptions/export - Exportar suscripciones
router.get('/export', subscriptionController.exportSubscriptions);

// @GET /api/subscriptions/mp/search - Buscar suscripciones en MercadoPago
router.get('/mp/search', subscriptionController.searchMPSubscriptions);

// @GET /api/subscriptions/mp/:mpSubscriptionId - Obtener suscripción de MercadoPago por ID
router.get('/mp/:mpSubscriptionId', subscriptionController.getMPSubscriptionById);

// @POST /api/subscriptions/checkout/:planId - Crear checkout para un plan específico
router.post('/checkout/:planId', subscriptionController.createCheckout);

// @GET /api/subscriptions/:subscriptionId - Obtener suscripción por ID
router.get('/:subscriptionId', subscriptionController.getSubscriptionById);

// @PUT /api/subscriptions/:subscriptionId - Actualizar suscripción
router.put('/:subscriptionId', subscriptionController.updateSubscription);

// @POST /api/subscriptions/:subscriptionId/pause - Pausar suscripción
router.post('/:subscriptionId/pause', subscriptionController.pauseSubscription);

// @POST /api/subscriptions/:subscriptionId/reactivate - Reactivar suscripción
router.post('/:subscriptionId/reactivate', subscriptionController.reactivateSubscription);

// @POST /api/subscriptions/:subscriptionId/cancel - Cancelar suscripción
router.post('/:subscriptionId/cancel', subscriptionController.cancelSubscription);

// @POST /api/subscriptions/:subscriptionId/sync - Sincronizar con MercadoPago
router.post('/:subscriptionId/sync', subscriptionController.syncWithMercadoPago);

export default router; 