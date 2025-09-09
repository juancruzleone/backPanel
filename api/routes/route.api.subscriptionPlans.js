import express from 'express';
import subscriptionPlanController from '../controllers/controller.api.subscriptionPlans.js';
import { validateToken } from '../../middleware/auth.validate.middleware.js';
import { isAdmin } from '../../middleware/auth.role.middleware.js';
import { identifyTenantByHeader } from '../../middleware/tenant.middleware.js';

const router = express.Router();

// Aplicar middleware de autenticación, rol admin y tenant a todas las rutas
router.use(validateToken);
router.use(isAdmin);
router.use(identifyTenantByHeader);

// @POST /api/subscription-plans - Crear plan de suscripción
router.post('/', subscriptionPlanController.createPlan);

// @GET /api/subscription-plans - Obtener planes de suscripción
router.get('/', subscriptionPlanController.getPlans);

// @GET /api/subscription-plans/stats - Obtener estadísticas de planes
router.get('/stats', subscriptionPlanController.getPlansStats);

// @GET /api/subscription-plans/mp/search - Buscar planes en MercadoPago
router.get('/mp/search', subscriptionPlanController.searchMPPlans);

// @GET /api/subscription-plans/mp/:mpPlanId - Obtener plan de MercadoPago por ID
router.get('/mp/:mpPlanId', subscriptionPlanController.getMPPlanById);

// @POST /api/subscription-plans/calculate-price - Calcular precio con descuento
router.post('/calculate-price', subscriptionPlanController.calculatePrice);

// @GET /api/subscription-plans/:planId - Obtener plan por ID
router.get('/:planId', subscriptionPlanController.getPlanById);

// @PUT /api/subscription-plans/:planId - Actualizar plan
router.put('/:planId', subscriptionPlanController.updatePlan);

// @DELETE /api/subscription-plans/:planId - Eliminar plan (marcar como cancelado)
router.delete('/:planId', subscriptionPlanController.deletePlan);

export default router; 