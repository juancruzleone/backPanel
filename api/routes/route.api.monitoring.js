/**
 * Rutas para monitoreo de suscripciones
 * Endpoints para ejecutar verificaciones manuales y obtener estadísticas
 */

import { Router } from 'express';
import { 
    checkActiveSubscriptions,
    checkExpiredSubscriptions, 
    checkSpecificSubscription,
    getMonitoringStats
} from '../controllers/controller.api.monitoring.js';

const router = Router();

// Verificar suscripciones activas manualmente
router.post('/check-active', checkActiveSubscriptions);

// Verificar suscripciones expiradas manualmente  
router.post('/check-expired', checkExpiredSubscriptions);

// Verificar una suscripción específica
router.get('/subscription/:subscriptionId', checkSpecificSubscription);

// Obtener estadísticas de monitoreo
router.get('/stats', getMonitoringStats);

export default router;
