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
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: { message: 'Token de autorización requerido' } });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: { message: 'Token de autorización inválido' } });
    }

    try {
        const user = await tokenServiceValidateToken(token);
        if (!user) {
            return res.status(401).json({ error: { message: 'Token inválido o expirado' } });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Error validando token:', err);
        res.status(401).json({ error: { message: 'Token inválido o expirado' } });
    }
}

export { validateAccountRegistro, validateAccountLogin, validateToken };