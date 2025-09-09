import * as yup from 'yup';

// Esquema de validación para crear plan de suscripción
const subscriptionPlanCreateSchema = yup.object({
    name: yup
        .string()
        .required('El nombre del plan es requerido')
        .trim()
        .min(3, 'El nombre debe tener al menos 3 caracteres')
        .max(100, 'El nombre no puede tener más de 100 caracteres'),
    
    description: yup
        .string()
        .required('La descripción del plan es requerida')
        .trim()
        .min(10, 'La descripción debe tener al menos 10 caracteres')
        .max(500, 'La descripción no puede tener más de 500 caracteres'),
    
    price: yup
        .number()
        .required('El precio es requerido')
        .min(0, 'El precio debe ser mayor o igual a 0'),
    
    currency: yup
        .string()
        .oneOf(['ARS', 'USD', 'EUR'], 'La moneda debe ser ARS, USD o EUR')
        .default('ARS'),
    
    frequency: yup
        .string()
        .required('La frecuencia es requerida')
        .oneOf(['monthly', 'annual'], 'La frecuencia debe ser monthly o annual')
        .default('monthly'),
    
    frequencyType: yup
        .number()
        .integer('Debe ser un número entero')
        .min(1, 'Debe ser al menos 1')
        .default(1),
    
    discountPercentage: yup
        .number()
        .min(0, 'El descuento debe ser mayor o igual a 0')
        .max(100, 'El descuento debe ser menor o igual a 100')
        .default(0),
    
    features: yup
        .array()
        .of(yup.string().trim())
        .default([]),
    
    maxUsers: yup
        .number()
        .integer('Debe ser un número entero')
        .nullable()
        .default(null),
    
    maxProjects: yup
        .number()
        .integer('Debe ser un número entero')
        .nullable()
        .default(null),
    
    trialDays: yup
        .number()
        .integer('Debe ser un número entero')
        .min(0, 'Los días de prueba deben ser mayor o igual a 0')
        .max(365, 'Los días de prueba no pueden ser más de 365')
        .default(0),
    
    status: yup
        .string()
        .oneOf(['active', 'inactive', 'cancelled'], 'El estado debe ser active, inactive o cancelled')
        .default('active'),
    
    backUrl: yup
        .string()
        .url('Debe ser una URL válida')
        .required('La URL de retorno es requerida')
});

// Esquema para actualizar plan de suscripción
const subscriptionPlanUpdateSchema = yup.object({
    name: yup
        .string()
        .trim()
        .min(3, 'El nombre debe tener al menos 3 caracteres')
        .max(100, 'El nombre no puede tener más de 100 caracteres'),
    
    description: yup
        .string()
        .trim()
        .min(10, 'La descripción debe tener al menos 10 caracteres')
        .max(500, 'La descripción no puede tener más de 500 caracteres'),
    
    price: yup
        .number()
        .min(0, 'El precio debe ser mayor o igual a 0'),
    
    currency: yup
        .string()
        .oneOf(['ARS', 'USD', 'EUR'], 'La moneda debe ser ARS, USD o EUR'),
    
    frequency: yup
        .string()
        .oneOf(['monthly', 'annual'], 'La frecuencia debe ser monthly o annual'),
    
    discountPercentage: yup
        .number()
        .min(0, 'El descuento debe ser mayor o igual a 0')
        .max(100, 'El descuento debe ser menor o igual a 100'),
    
    features: yup
        .array()
        .of(yup.string().trim()),
    
    maxUsers: yup
        .number()
        .integer('Debe ser un número entero')
        .nullable(),
    
    maxProjects: yup
        .number()
        .integer('Debe ser un número entero')
        .nullable(),
    
    trialDays: yup
        .number()
        .integer('Debe ser un número entero')
        .min(0, 'Los días de prueba deben ser mayor o igual a 0')
        .max(365, 'Los días de prueba no pueden ser más de 365'),
    
    status: yup
        .string()
        .oneOf(['active', 'inactive', 'cancelled'], 'El estado debe ser active, inactive o cancelled'),
    
    backUrl: yup
        .string()
        .url('Debe ser una URL válida')
});

export { subscriptionPlanCreateSchema, subscriptionPlanUpdateSchema }; 