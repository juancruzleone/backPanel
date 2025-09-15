/**
 * Rutas API unificadas de pagos
 * Maneja checkout con MercadoPago (Argentina) y Polar.sh (Internacional)
 */

import express from 'express';
import paymentsController from '../controllers/controller.api.payments.js';

const router = express.Router();

// Middleware para parsear raw body en webhooks
const rawBodyMiddleware = (req, res, next) => {
  if (req.path.includes('/webhook/')) {
    req.rawBody = JSON.stringify(req.body);
  }
  next();
};

router.use(rawBodyMiddleware);

/**
 * @route POST /api/payments/checkout
 * @desc Crear checkout unificado con detección automática de país
 * @access Private (requiere token JWT)
 * @body {
 *   planId: string,
 *   billingCycle?: 'monthly' | 'yearly',
 *   country?: string (opcional, se detecta automáticamente)
 * }
 */
router.post('/checkout', paymentsController.createCheckout);

/**
 * @route POST /api/payments/webhook/mercadopago
 * @desc Webhook de MercadoPago para procesar pagos exitosos
 * @access Public (webhook)
 */
router.post('/webhook/mercadopago', paymentsController.webhookMercadoPago);

/**
 * @route POST /api/payments/webhook/polar
 * @desc Webhook de Polar.sh para procesar pagos exitosos
 * @access Public (webhook)
 */
router.post('/webhook/polar', paymentsController.webhookPolar);

/**
 * @route GET /api/payments/subscription/:processor/:id
 * @desc Obtener información de suscripción
 * @access Private
 * @params processor: 'mercadopago' | 'polar'
 * @params id: subscription ID
 */
router.get('/subscription/:processor/:id', paymentsController.getSubscription);

/**
 * @route POST /api/payments/subscription/cancel
 * @desc Cancelar suscripción
 * @access Private (requiere token JWT)
 * @body {
 *   processor: 'mercadopago' | 'polar',
 *   subscriptionId: string
 * }
 */
router.post('/subscription/cancel', paymentsController.cancelSubscription);

/**
 * @route GET /api/payments/stats
 * @desc Obtener estadísticas de pagos por procesador
 * @access Private
 */
router.get('/stats', paymentsController.getPaymentStats);

/**
 * @route GET /api/payments/validate
 * @desc Validar configuración de procesadores
 * @access Private
 */
router.get('/validate', paymentsController.validateProcessors);

/**
 * @route GET /api/payments/detect-country
 * @desc Detectar país del usuario para determinar procesador
 * @access Public
 */
router.get('/detect-country', paymentsController.detectCountry);

export default router;
