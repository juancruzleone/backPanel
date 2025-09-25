import express from 'express';
import webhookController from '../controllers/controller.api.webhooks.js';

const router = express.Router();

// Webhook de MercadoPago (SIN autenticación - MercadoPago necesita acceso directo)
router.post('/mercadopago', webhookController.mercadoPagoWebhook);

// Webhook de Polar.sh (SIN autenticación - Polar.sh necesita acceso directo)
router.post('/polar', webhookController.polarWebhook);

// Endpoints para testing y administración (CON autenticación)
router.post('/process-payment', webhookController.processSuccessfulPayment);

// Verificar estado de suscripción
router.get('/check-subscription/:subscriptionId', webhookController.checkSubscriptionStatus);

export default router; 