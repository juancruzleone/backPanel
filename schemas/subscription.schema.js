import * as yup from 'yup';
import { ObjectId } from 'mongodb';

// Validación personalizada para ObjectId
const objectIdValidator = yup
    .string()
    .test('is-objectid', 'Debe ser un ObjectId válido', (value) => {
        if (!value) return true; // Permitir valores vacíos para campos opcionales
        return ObjectId.isValid(value);
    });

// Esquema de validación para crear suscripción
const subscriptionCreateSchema = yup.object({
    subscriptionPlan: objectIdValidator
        .required('El plan de suscripción es requerido'),
    
    client: objectIdValidator
        .required('El cliente es requerido'),
    
    payerEmail: yup
        .string()
        .email('Debe ser un email válido')
        .required('El email del pagador es requerido')
        .lowercase()
        .trim(),
    
    reason: yup
        .string()
        .trim()
        .min(5, 'La razón debe tener al menos 5 caracteres')
        .max(200, 'La razón no puede tener más de 200 caracteres'),
    
    amount: yup
        .number()
        .min(0, 'El monto debe ser mayor o igual a 0'),
    
    currency: yup
        .string()
        .oneOf(['ARS', 'USD', 'EUR'], 'La moneda debe ser ARS, USD o EUR')
        .default('ARS'),
    
    frequency: yup
        .string()
        .oneOf(['monthly', 'annual'], 'La frecuencia debe ser monthly o annual'),
    
    cardTokenId: yup
        .string()
        .nullable(),
    
    backUrl: yup
        .string()
        .url('Debe ser una URL válida')
});

// Esquema para actualizar suscripción
const subscriptionUpdateSchema = yup.object({
    reason: yup
        .string()
        .trim()
        .min(5, 'La razón debe tener al menos 5 caracteres')
        .max(200, 'La razón no puede tener más de 200 caracteres'),
    
    status: yup
        .string()
        .oneOf(['pending', 'authorized', 'paused', 'cancelled'], 'El estado debe ser válido'),
    
    cardTokenId: yup
        .string()
        .nullable(),
    
    backUrl: yup
        .string()
        .url('Debe ser una URL válida'),
    
    endDate: yup
        .date()
        .nullable()
});

// Esquema para crear checkout
const checkoutCreateSchema = yup.object({
    clientId: objectIdValidator
        .required('El ID del cliente es requerido'),
    
    payerEmail: yup
        .string()
        .email('Debe ser un email válido')
        .required('El email del pagador es requerido')
        .lowercase()
        .trim(),
    
    backUrl: yup
        .string()
        .url('Debe ser una URL válida')
});

// Esquema para filtros de búsqueda
const subscriptionSearchSchema = yup.object({
    status: yup
        .string()
        .oneOf(['pending', 'authorized', 'paused', 'cancelled'], 'Estado inválido'),
    
    client: objectIdValidator,
    
    subscriptionPlan: objectIdValidator,
    
    payerEmail: yup
        .string()
        .email('Debe ser un email válido'),
    
    limit: yup
        .number()
        .integer('Debe ser un número entero')
        .min(1, 'El límite debe ser al menos 1')
        .max(100, 'El límite no puede ser mayor a 100'),
    
    offset: yup
        .number()
        .integer('Debe ser un número entero')
        .min(0, 'El offset debe ser mayor o igual a 0')
});

export { 
    subscriptionCreateSchema, 
    subscriptionUpdateSchema, 
    checkoutCreateSchema,
    subscriptionSearchSchema 
}; 