import { validateToken as tokenServiceValidateToken } from '../services/token.service.js';
import { cuentaRegistro, cuentaLogin } from '../schemas/auth.schema.js';

async function validateAccountRegistro(req, res, next) {
    try {
        const cuenta = await cuentaRegistro.validate(req.body, { abortEarly: false, stripUnknown: true });
        req.body = cuenta;
        next();
    } catch (err) {
        const errorMessages = err.inner.map(e => e.message);
        res.status(400).json({ error: { message: 'Error de validación', details: errorMessages } });
    }
}

async function validateAccountLogin(req, res, next) {
    try {
        const cuenta = await cuentaLogin.validate(req.body, { abortEarly: false, stripUnknown: true });
        req.body = cuenta;
        next();
    } catch (err) {
        const errorMessages = err.inner.map(e => e.message);
        res.status(400).json({ error: { message: 'Error de validación', details: errorMessages } });
    }
}

async function validateToken(req, res, next) {
    console.log('\n🔐 [AUTH] ==================== VALIDANDO TOKEN ====================');
    console.log('🔐 [AUTH] URL:', req.method, req.originalUrl);
    console.log('🔐 [AUTH] Path:', req.path);
    
    console.log('\n🔐 [AUTH] TODOS LOS HEADERS EN MIDDLEWARE:');
    console.log(JSON.stringify(req.headers, null, 2));
    
    console.log('\n🔐 [AUTH] Buscando header Authorization...');
    const authHeader = req.headers.authorization || req.headers.Authorization;
    console.log('🔐 [AUTH] Authorization (lowercase):', req.headers.authorization || '❌ NO PRESENTE');
    console.log('🔐 [AUTH] Authorization (uppercase):', req.headers.Authorization || '❌ NO PRESENTE');
    console.log('🔐 [AUTH] authHeader final:', authHeader || '❌ NO PRESENTE');
    
    // Verificar si el encabezado de autorización existe
    if (!authHeader) {
        console.log('\n❌ [AUTH] Token faltante - NO SE ENCONTRÓ HEADER AUTHORIZATION');
        console.log('❌ [AUTH] Headers disponibles:', Object.keys(req.headers));
        console.log('❌ [AUTH] ============================================================\n');
        return res.status(401).json({ 
            success: false,
            code: 'MISSING_AUTH_HEADER',
            message: 'Se requiere token de autenticación' 
        });
    }

    // Extraer el token del encabezado
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== 'bearer') {
        console.log('❌ [AUTH] Formato de token inválido');
        return res.status(401).json({ 
            success: false,
            code: 'INVALID_AUTH_FORMAT',
            message: 'Formato de autorización inválido. Use: Bearer <token>' 
        });
    }

    const token = tokenParts[1];
    if (!token) {
        console.log('❌ [AUTH] Token vacío');
        return res.status(401).json({ 
            success: false,
            code: 'EMPTY_TOKEN',
            message: 'El token no puede estar vacío' 
        });
    }

    console.log('🔐 [AUTH] Token extraído:', token.substring(0, 20) + '...');

    try {
        // Validar el token
        console.log('🔐 [AUTH] Validando token con servicio...');
        const user = await tokenServiceValidateToken(token);
        
        if (!user) {
            console.log('❌ [AUTH] Token inválido - usuario no encontrado');
            return res.status(401).json({ 
                success: false,
                code: 'INVALID_TOKEN',
                message: 'Token inválido o expirado' 
            });
        }

        console.log('✅ [AUTH] Token válido - Usuario:', {
            id: user._id,
            userName: user.userName,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role
        });

        // Adjuntar el usuario autenticado al objeto de solicitud
        req.user = user;
        next();
    } catch (err) {
        console.error('❌ [AUTH] Error validando token:', err.message);
        
        // Manejar diferentes tipos de errores de autenticación
        let errorCode = 'AUTH_ERROR';
        let errorMessage = 'Error de autenticación';
        let statusCode = 401;

        if (err.name === 'TokenExpiredError') {
            errorCode = 'TOKEN_EXPIRED';
            errorMessage = 'La sesión ha expirado. Por favor, inicie sesión nuevamente.';
            console.log('⏰ [AUTH] Token expirado');
        } else if (err.name === 'JsonWebTokenError') {
            errorCode = 'INVALID_TOKEN';
            errorMessage = 'Token inválido';
            console.log('🔒 [AUTH] Token malformado');
        }

        res.status(statusCode).json({ 
            success: false,
            code: errorCode,
            message: errorMessage,
            ...(process.env.NODE_ENV === 'development' && { details: err.message })
        });
    }
}

export { validateAccountRegistro, validateAccountLogin, validateToken };