const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/controller.api.subscription');
const authMiddleware = require('../../middleware/auth.middleware');

// Cancelar suscripción
router.post('/cancel', authMiddleware, subscriptionController.cancelSubscription);

module.exports = router;
