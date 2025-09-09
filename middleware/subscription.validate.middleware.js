const { body, param, query, validationResult } = require('express-validator');

const subscriptionValidation = {
    // Validaciones para crear suscripción
    validateCreateSubscription: [
        body('subscriptionPlan')
            .isMongoId()
            .withMessage('ID de plan de suscripción inválido'),
        
        body('client')
            .isMongoId()
            .withMessage('ID de cliente inválido'),
        
        body('payerEmail')
            .isEmail()
            .withMessage('Email del pagador debe ser válido')
            .normalizeEmail(),
        
        body('reason')
            .optional()
            .trim()
            .isLength({ min: 5, max: 200 })
            .withMessage('La razón debe tener entre 5 y 200 caracteres'),
        
        body('amount')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('El monto debe ser un número mayor o igual a 0'),
        
        body('cardTokenId')
            .optional()
            .isString()
            .withMessage('El token de tarjeta debe ser una cadena válida'),
        
        body('backUrl')
            .optional()
            .isURL()
            .withMessage('La URL de retorno debe ser válida'),
    ],

    // Validaciones para actualizar suscripción
    validateUpdateSubscription: [
        param('subscriptionId')
            .isMongoId()
            .withMessage('ID de suscripción inválido'),
        
        body('reason')
            .optional()
            .trim()
            .isLength({ min: 5, max: 200 })
            .withMessage('La razón debe tener entre 5 y 200 caracteres'),
        
        body('status')
            .optional()
            .isIn(['pending', 'authorized', 'paused', 'cancelled'])
            .withMessage('El estado debe ser pending, authorized, paused o cancelled'),
        
        body('cardTokenId')
            .optional()
            .isString()
            .withMessage('El token de tarjeta debe ser una cadena válida'),
        
        body('backUrl')
            .optional()
            .isURL()
            .withMessage('La URL de retorno debe ser válida'),
    ],

    // Validación para obtener suscripción por ID
    validateGetSubscription: [
        param('subscriptionId')
            .isMongoId()
            .withMessage('ID de suscripción inválido'),
    ],

    // Validación para crear checkout
    validateCreateCheckout: [
        param('planId')
            .isMongoId()
            .withMessage('ID de plan inválido'),
        
        body('clientId')
            .isMongoId()
            .withMessage('ID de cliente inválido'),
        
        body('payerEmail')
            .isEmail()
            .withMessage('Email del pagador debe ser válido')
            .normalizeEmail(),
        
        body('backUrl')
            .optional()
            .isURL()
            .withMessage('La URL de retorno debe ser válida'),
    ],

    // Validaciones para filtros de búsqueda
    validateSearchFilters: [
        query('status')
            .optional()
            .isIn(['pending', 'authorized', 'paused', 'cancelled'])
            .withMessage('El estado debe ser pending, authorized, paused o cancelled'),
        
        query('client')
            .optional()
            .isMongoId()
            .withMessage('ID de cliente inválido'),
        
        query('subscriptionPlan')
            .optional()
            .isMongoId()
            .withMessage('ID de plan de suscripción inválido'),
        
        query('payerEmail')
            .optional()
            .isEmail()
            .withMessage('Email del pagador debe ser válido'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe ser entre 1 y 100'),
        
        query('offset')
            .optional()
            .isInt({ min: 0 })
            .withMessage('El offset debe ser mayor o igual a 0'),
    ],

    // Validaciones para búsqueda en MercadoPago
    validateMPSearch: [
        query('q')
            .optional()
            .trim()
            .isLength({ min: 2 })
            .withMessage('La consulta debe tener al menos 2 caracteres'),
        
        query('payer_email')
            .optional()
            .isEmail()
            .withMessage('Email del pagador debe ser válido'),
        
        query('status')
            .optional()
            .isString()
            .withMessage('El estado debe ser una cadena válida'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage('El límite debe ser entre 1 y 50'),
        
        query('offset')
            .optional()
            .isInt({ min: 0 })
            .withMessage('El offset debe ser mayor o igual a 0'),
    ],

    // Validación para ID de MercadoPago
    validateMPId: [
        param('mpSubscriptionId')
            .isString()
            .isLength({ min: 10 })
            .withMessage('ID de suscripción de MercadoPago inválido'),
    ],

    // Validación para ID de plan de MercadoPago
    validateMPPlanId: [
        param('mpPlanId')
            .isString()
            .isLength({ min: 10 })
            .withMessage('ID de plan de MercadoPago inválido'),
    ],

    // Validaciones para exportar
    validateExport: [
        query('preapproval_plan_id')
            .optional()
            .isString()
            .withMessage('ID de plan debe ser una cadena válida'),
        
        query('status')
            .optional()
            .isString()
            .withMessage('El estado debe ser una cadena válida'),
        
        query('sort')
            .optional()
            .matches(/^[a-zA-Z_]+:(asc|desc)$/)
            .withMessage('El ordenamiento debe tener el formato campo:asc|desc'),
    ],

    // Middleware para manejar errores de validación
    handleValidationErrors: (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación',
                errors: errors.array()
            });
        }
        next();
    }
};

module.exports = subscriptionValidation; 