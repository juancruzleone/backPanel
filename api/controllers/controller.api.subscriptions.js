import subscriptionService from '../../services/subscriptions.services.js';

const subscriptionController = {
    // Crear suscripción
    createSubscription: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const subscriptionData = req.body;

            const result = await subscriptionService.createSubscription(subscriptionData, tenantId);

            res.status(201).json({
                success: true,
                message: 'Suscripción creada exitosamente',
                data: result
            });
        } catch (error) {
            console.error('Error en createSubscription:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Obtener suscripciones
    getSubscriptions: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const filters = req.query;

            const subscriptions = await subscriptionService.getSubscriptions(tenantId, filters);

            res.status(200).json({
                success: true,
                message: 'Suscripciones obtenidas exitosamente',
                data: subscriptions,
                count: subscriptions.length
            });
        } catch (error) {
            console.error('Error en getSubscriptions:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Obtener suscripción por ID
    getSubscriptionById: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { subscriptionId } = req.params;

            const subscription = await subscriptionService.getSubscriptionById(subscriptionId, tenantId);

            res.status(200).json({
                success: true,
                message: 'Suscripción obtenida exitosamente',
                data: subscription
            });
        } catch (error) {
            console.error('Error en getSubscriptionById:', error);
            res.status(404).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Buscar suscripciones en MercadoPago
    searchMPSubscriptions: async (req, res) => {
        try {
            const filters = req.query;

            const result = await subscriptionService.searchMPSubscriptions(filters);

            res.status(200).json({
                success: true,
                message: 'Búsqueda completada exitosamente',
                data: result
            });
        } catch (error) {
            console.error('Error en searchMPSubscriptions:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Obtener suscripción de MercadoPago por ID
    getMPSubscriptionById: async (req, res) => {
        try {
            const { mpSubscriptionId } = req.params;

            const mpSubscription = await subscriptionService.getMPSubscriptionById(mpSubscriptionId);

            res.status(200).json({
                success: true,
                message: 'Suscripción de MercadoPago obtenida exitosamente',
                data: mpSubscription
            });
        } catch (error) {
            console.error('Error en getMPSubscriptionById:', error);
            res.status(404).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Actualizar suscripción
    updateSubscription: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { subscriptionId } = req.params;
            const updateData = req.body;

            const subscription = await subscriptionService.updateSubscription(subscriptionId, tenantId, updateData);

            res.status(200).json({
                success: true,
                message: 'Suscripción actualizada exitosamente',
                data: subscription
            });
        } catch (error) {
            console.error('Error en updateSubscription:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Pausar suscripción
    pauseSubscription: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { subscriptionId } = req.params;

            const subscription = await subscriptionService.pauseSubscription(subscriptionId, tenantId);

            res.status(200).json({
                success: true,
                message: 'Suscripción pausada exitosamente',
                data: subscription
            });
        } catch (error) {
            console.error('Error en pauseSubscription:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Reactivar suscripción
    reactivateSubscription: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { subscriptionId } = req.params;

            const subscription = await subscriptionService.reactivateSubscription(subscriptionId, tenantId);

            res.status(200).json({
                success: true,
                message: 'Suscripción reactivada exitosamente',
                data: subscription
            });
        } catch (error) {
            console.error('Error en reactivateSubscription:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Cancelar suscripción
    cancelSubscription: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { subscriptionId } = req.params;

            const subscription = await subscriptionService.cancelSubscription(subscriptionId, tenantId);

            res.status(200).json({
                success: true,
                message: 'Suscripción cancelada exitosamente',
                data: subscription
            });
        } catch (error) {
            console.error('Error en cancelSubscription:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Exportar suscripciones
    exportSubscriptions: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const filters = req.query;

            const exportData = await subscriptionService.exportSubscriptions(tenantId, filters);

            res.status(200).json({
                success: true,
                message: 'Exportación completada exitosamente',
                data: exportData
            });
        } catch (error) {
            console.error('Error en exportSubscriptions:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Sincronizar con MercadoPago
    syncWithMercadoPago: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { subscriptionId } = req.params;

            const subscription = await subscriptionService.syncWithMercadoPago(subscriptionId, tenantId);

            res.status(200).json({
                success: true,
                message: 'Sincronización completada exitosamente',
                data: subscription
            });
        } catch (error) {
            console.error('Error en syncWithMercadoPago:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Crear checkout para un plan específico
    createCheckout: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { planId } = req.params;
            const { clientId, payerEmail } = req.body;

            const subscriptionData = {
                subscriptionPlan: planId,
                client: clientId,
                payerEmail: payerEmail,
                backUrl: req.body.backUrl || `${req.protocol}://${req.get('host')}/subscription/success`
            };

            const result = await subscriptionService.createSubscription(subscriptionData, tenantId);

            res.status(201).json({
                success: true,
                message: 'Checkout creado exitosamente',
                data: {
                    subscriptionId: result.subscription._id,
                    checkoutUrl: result.checkoutUrl,
                    initPoint: result.checkoutUrl
                }
            });
        } catch (error) {
            console.error('Error en createCheckout:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Obtener estadísticas de suscripciones
    getSubscriptionsStats: async (req, res) => {
        try {
            const { tenantId } = req.user;

            const allSubscriptions = await subscriptionService.getSubscriptions(tenantId);
            const activeSubscriptions = allSubscriptions.filter(sub => sub.status === 'authorized');
            const pendingSubscriptions = allSubscriptions.filter(sub => sub.status === 'pending');
            const cancelledSubscriptions = allSubscriptions.filter(sub => sub.status === 'cancelled');

            const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + sub.amount, 0);
            const monthlyRevenue = activeSubscriptions
                .filter(sub => sub.frequency === 'monthly')
                .reduce((sum, sub) => sum + sub.amount, 0);

            const stats = {
                total: allSubscriptions.length,
                active: activeSubscriptions.length,
                pending: pendingSubscriptions.length,
                cancelled: cancelledSubscriptions.length,
                paused: allSubscriptions.filter(sub => sub.status === 'paused').length,
                totalRevenue: totalRevenue,
                monthlyRevenue: monthlyRevenue,
                annualRevenue: activeSubscriptions
                    .filter(sub => sub.frequency === 'annual')
                    .reduce((sum, sub) => sum + sub.amount, 0)
            };

            res.status(200).json({
                success: true,
                message: 'Estadísticas obtenidas exitosamente',
                data: stats
            });
        } catch (error) {
            console.error('Error en getSubscriptionsStats:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    }
};

export default subscriptionController; 