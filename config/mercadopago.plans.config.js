/**
 * Configuración de planes predefinidos en MercadoPago
 * Estos IDs se obtienen ejecutando el script create-mercadopago-plans.js
 */

// IDs de planes en MercadoPago (se actualizan después de ejecutar el script)
export const MERCADOPAGO_PLAN_IDS = {
    // Planes mensuales
    'starter': null,        // Se completará después del script
    'professional': null,   // Se completará después del script  
    'enterprise': null,     // Se completará después del script
    
    // Planes anuales
    'starter-yearly': null,     // Se completará después del script
    'professional-yearly': null, // Se completará después del script
    'enterprise-yearly': null   // Se completará después del script
};

/**
 * Obtener ID del plan de MercadoPago
 */
export function getMercadoPagoPlanId(planKey) {
    const planId = MERCADOPAGO_PLAN_IDS[planKey];
    
    if (!planId) {
        console.warn(`⚠️ Plan ID no encontrado para: ${planKey}`);
        console.warn('💡 Ejecuta: node scripts/create-mercadopago-plans.js');
        return null;
    }
    
    return planId;
}

/**
 * Verificar si todos los planes están configurados
 */
export function validateMercadoPagoPlans() {
    const missingPlans = [];
    
    for (const [planKey, planId] of Object.entries(MERCADOPAGO_PLAN_IDS)) {
        if (!planId) {
            missingPlans.push(planKey);
        }
    }
    
    if (missingPlans.length > 0) {
        console.warn('⚠️ Planes faltantes en MercadoPago:', missingPlans);
        console.warn('💡 Ejecuta: node scripts/create-mercadopago-plans.js');
        return false;
    }
    
    console.log('✅ Todos los planes de MercadoPago están configurados');
    return true;
}
