/**
 * Middleware para validar que el tenant del usuario tenga un plan activo
 * Solo permite acceso al panel GMAO a usuarios con planes válidos
 */

import { getTenantByTenantId } from '../services/tenants.services.js';

/**
 * Validar que el tenant tenga un plan activo
 */
async function validateTenantPlan(req, res, next) {
    try {
        console.log('🏢 [PLAN] Validando plan del tenant...');
        
        // El usuario debe estar autenticado (viene del middleware validateToken)
        if (!req.user) {
            console.log('❌ [PLAN] Usuario no autenticado');
            return res.status(401).json({
                success: false,
                code: 'USER_NOT_AUTHENTICATED',
                message: 'Usuario no autenticado'
            });
        }

        const userTenantId = req.user.tenantId;
        console.log('🏢 [PLAN] TenantId del usuario:', userTenantId);

        // Verificar que el usuario tenga un tenantId
        if (!userTenantId) {
            console.log('❌ [PLAN] Usuario sin tenant asignado');
            return res.status(403).json({
                success: false,
                code: 'NO_TENANT_ASSIGNED',
                message: 'Usuario no tiene tenant asignado. Contacte al administrador.'
            });
        }

        // Obtener información del tenant
        let tenant;
        try {
            tenant = await getTenantByTenantId(userTenantId);
        } catch (error) {
            console.log('❌ [PLAN] Tenant no encontrado:', error.message);
            return res.status(403).json({
                success: false,
                code: 'TENANT_NOT_FOUND',
                message: 'Tenant no encontrado. Contacte al administrador.'
            });
        }

        console.log('🏢 [PLAN] Tenant encontrado:', {
            _id: tenant._id,
            tenantId: tenant.tenantId,
            name: tenant.name,
            plan: tenant.plan,
            status: tenant.status
        });

        // Verificar que el tenant esté activo
        if (tenant.status !== 'active') {
            console.log('❌ [PLAN] Tenant inactivo:', tenant.status);
            return res.status(403).json({
                success: false,
                code: 'TENANT_INACTIVE',
                message: `Cuenta suspendida (${tenant.status}). Contacte al administrador.`
            });
        }

        // Verificar que el tenant tenga un plan válido
        if (!tenant.plan || tenant.plan === 'free' || tenant.plan === 'trial') {
            console.log('❌ [PLAN] Plan inválido o gratuito:', tenant.plan);
            return res.status(403).json({
                success: false,
                code: 'INVALID_PLAN',
                message: 'Se requiere un plan de suscripción activo para acceder al panel GMAO.',
                redirectTo: '/plans'
            });
        }

        // Verificar fecha de expiración si existe
        if (tenant.subscriptionExpiresAt) {
            const now = new Date();
            const expirationDate = new Date(tenant.subscriptionExpiresAt);
            
            if (now > expirationDate) {
                console.log('❌ [PLAN] Suscripción expirada:', expirationDate);
                return res.status(403).json({
                    success: false,
                    code: 'SUBSCRIPTION_EXPIRED',
                    message: 'Su suscripción ha expirado. Renueve su plan para continuar.',
                    redirectTo: '/plans'
                });
            }
        }

        console.log('✅ [PLAN] Tenant con plan válido:', {
            tenantId: tenant.tenantId,
            plan: tenant.plan,
            status: tenant.status
        });

        // Agregar información del tenant al request para uso posterior
        req.tenant = tenant;
        next();

    } catch (error) {
        console.error('❌ [PLAN] Error validando plan del tenant:', error);
        return res.status(500).json({
            success: false,
            code: 'PLAN_VALIDATION_ERROR',
            message: 'Error interno validando plan. Contacte al administrador.'
        });
    }
}

/**
 * Middleware combinado: validar token + validar plan
 * Para usar en rutas que requieren tanto autenticación como plan activo
 */
async function validateTokenAndPlan(req, res, next) {
    // Importar el middleware de validación de token
    const { validateToken } = await import('./auth.validate.middleware.js');
    
    // Primero validar el token
    validateToken(req, res, (err) => {
        if (err) {
            return next(err);
        }
        
        // Luego validar el plan
        validateTenantPlan(req, res, next);
    });
}

export { validateTenantPlan, validateTokenAndPlan };
