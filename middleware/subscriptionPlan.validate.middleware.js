const { body, param, validationResult } = require('express-validator');

const subscriptionPlanValidation = {
    // Validaciones para crear plan
    validateCreatePlan: [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('El nombre del plan es requerido')
            .isLength({ min: 3, max: 100 })
            .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
        
        body('description')
            .trim()
            .notEmpty()
            .withMessage('La descripción del plan es requerida')
            .isLength({ min: 10, max: 500 })
            .withMessage('La descripción debe tener entre 10 y 500 caracteres'),
        
        body('price')
            .isFloat({ min: 0 })
            .withMessage('El precio debe ser un número mayor o igual a 0'),
        
        body('currency')
            .optional()
            .isIn(['ARS', 'USD', 'EUR'])
            .withMessage('La moneda debe ser ARS, USD o EUR'),
        
        body('frequency')
            .isIn(['monthly', 'annual'])
            .withMessage('La frecuencia debe ser monthly o annual'),
        
        body('discountPercentage')
            .optional()
            .isFloat({ min: 0, max: 100 })
            .withMessage('El descuento debe ser entre 0 y 100'),
        
        body('features')
            .optional()
            .isArray()
            .withMessage('Las características deben ser un array'),
        
        body('maxUsers')
            .optional()
            .isInt({ min: 1 })
            .withMessage('El máximo de usuarios debe ser un número entero mayor a 0'),
        
        body('maxProjects')
            .optional()
            .isInt({ min: 1 })
            .withMessage('El máximo de proyectos debe ser un número entero mayor a 0'),
        
        body('trialDays')
            .optional()
            .isInt({ min: 0, max: 365 })
            .withMessage('Los días de prueba deben ser entre 0 y 365'),
        
        body('backUrl')
            .isURL()
            .withMessage('La URL de retorno debe ser válida'),
    ],

    // Validaciones para actualizar plan
    validateUpdatePlan: [
        param('planId')
            .isMongoId()
            .withMessage('ID de plan inválido'),
        
        body('name')
            .optional()
            .trim()
            .isLength({ min: 3, max: 100 })
            .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
        
        body('description')
            .optional()
            .trim()
            .isLength({ min: 10, max: 500 })
            .withMessage('La descripción debe tener entre 10 y 500 caracteres'),
        
        body('price')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('El precio debe ser un número mayor o igual a 0'),
        
        body('currency')
            .optional()
            .isIn(['ARS', 'USD', 'EUR'])
            .withMessage('La moneda debe ser ARS, USD o EUR'),
        
        body('frequency')
            .optional()
            .isIn(['monthly', 'annual'])
            .withMessage('La frecuencia debe ser monthly o annual'),
        
        body('discountPercentage')
            .optional()
            .isFloat({ min: 0, max: 100 })
            .withMessage('El descuento debe ser entre 0 y 100'),
        
        body('status')
            .optional()
            .isIn(['active', 'inactive', 'cancelled'])
            .withMessage('El estado debe ser active, inactive o cancelled'),
    ],

    // Validación para obtener plan por ID
    validateGetPlan: [
        param('planId')
            .isMongoId()
            .withMessage('ID de plan inválido'),
    ],

    // Validación para calcular precio
    validateCalculatePrice: [
        body('price')
            .isFloat({ min: 0 })
            .withMessage('El precio debe ser un número mayor o igual a 0'),
        
        body('discountPercentage')
            .optional()
            .isFloat({ min: 0, max: 100 })
            .withMessage('El descuento debe ser entre 0 y 100'),
        
        body('frequency')
            .isIn(['monthly', 'annual'])
            .withMessage('La frecuencia debe ser monthly o annual'),
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

module.exports = subscriptionPlanValidation; 