import subscriptionPlanService from '../../services/subscriptionPlans.services.js';

const subscriptionPlanController = {
    // Crear plan de suscripción
    createPlan: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const planData = req.body;

            const result = await subscriptionPlanService.createPlan(planData, tenantId);

            res.status(201).json({
                success: true,
                message: 'Plan de suscripción creado exitosamente',
                data: result
            });
        } catch (error) {
            console.error('Error en createPlan:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Obtener todos los planes
    getPlans: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { status } = req.query;

            const plans = await subscriptionPlanService.getPlans(tenantId, status);

            res.status(200).json({
                success: true,
                message: 'Planes obtenidos exitosamente',
                data: plans,
                count: plans.length
            });
        } catch (error) {
            console.error('Error en getPlans:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Obtener plan por ID
    getPlanById: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { planId } = req.params;

            const plan = await subscriptionPlanService.getPlanById(planId, tenantId);

            res.status(200).json({
                success: true,
                message: 'Plan obtenido exitosamente',
                data: plan
            });
        } catch (error) {
            console.error('Error en getPlanById:', error);
            res.status(404).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Buscar planes en MercadoPago
    searchMPPlans: async (req, res) => {
        try {
            const filters = req.query;

            const result = await subscriptionPlanService.searchMPPlans(filters);

            res.status(200).json({
                success: true,
                message: 'Búsqueda completada exitosamente',
                data: result
            });
        } catch (error) {
            console.error('Error en searchMPPlans:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Obtener plan de MercadoPago por ID
    getMPPlanById: async (req, res) => {
        try {
            const { mpPlanId } = req.params;

            const mpPlan = await subscriptionPlanService.getMPPlanById(mpPlanId);

            res.status(200).json({
                success: true,
                message: 'Plan de MercadoPago obtenido exitosamente',
                data: mpPlan
            });
        } catch (error) {
            console.error('Error en getMPPlanById:', error);
            res.status(404).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Actualizar plan
    updatePlan: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { planId } = req.params;
            const updateData = req.body;

            const plan = await subscriptionPlanService.updatePlan(planId, tenantId, updateData);

            res.status(200).json({
                success: true,
                message: 'Plan actualizado exitosamente',
                data: plan
            });
        } catch (error) {
            console.error('Error en updatePlan:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Calcular precio con descuento
    calculatePrice: async (req, res) => {
        try {
            const { price, discountPercentage, frequency } = req.body;

            const discountedPrice = subscriptionPlanService.calculateDiscountedPrice(
                price, 
                discountPercentage, 
                frequency
            );

            res.status(200).json({
                success: true,
                message: 'Precio calculado exitosamente',
                data: {
                    originalPrice: price,
                    discountPercentage: discountPercentage,
                    frequency: frequency,
                    discountedPrice: discountedPrice,
                    savings: price - discountedPrice
                }
            });
        } catch (error) {
            console.error('Error en calculatePrice:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Eliminar plan (marcar como cancelado)
    deletePlan: async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { planId } = req.params;

            const plan = await subscriptionPlanService.deletePlan(planId, tenantId);

            res.status(200).json({
                success: true,
                message: 'Plan eliminado (cancelado) exitosamente',
                data: plan
            });
        } catch (error) {
            console.error('Error en deletePlan:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    },

    // Obtener estadísticas de planes
    getPlansStats: async (req, res) => {
        try {
            const { tenantId } = req.user;

            const allPlans = await subscriptionPlanService.getPlans(tenantId);
            const activePlans = allPlans.filter(plan => plan.status === 'active');
            const cancelledPlans = allPlans.filter(plan => plan.status === 'cancelled');

            const stats = {
                total: allPlans.length,
                active: activePlans.length,
                cancelled: cancelledPlans.length,
                monthlyPlans: allPlans.filter(plan => plan.frequency === 'monthly').length,
                annualPlans: allPlans.filter(plan => plan.frequency === 'annual').length,
                avgPrice: allPlans.length > 0 ? 
                    allPlans.reduce((sum, plan) => sum + plan.price, 0) / allPlans.length : 0
            };

            res.status(200).json({
                success: true,
                message: 'Estadísticas obtenidas exitosamente',
                data: stats
            });
        } catch (error) {
            console.error('Error en getPlansStats:', error);
            res.status(400).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    }
};

export default subscriptionPlanController; 