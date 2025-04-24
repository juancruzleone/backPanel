import { validateToken as tokenServiceValidateToken } from '../services/token.service.js';
import * as accountSchema from '../schemas/auth.schema.js';

async function validateAccountRegistro(req, res, next) {
    try {
        const cuenta = await accountSchema.cuentaRegistro.validate(req.body, { abortEarly: false, stripUnknown: true });
        req.body = cuenta;
        next();
    } catch (err) {
        const errorMessages = err.inner.map(e => e.message);
        res.status(400).json({ error: { message: 'Validation error', details: errorMessages } });
    }
}

async function validateAccountLogin(req, res, next) {
    try {
        const cuenta = await accountSchema.cuentaLogin.validate(req.body, { abortEarly: false, stripUnknown: true });
        req.body = cuenta;
        next();
    } catch (err) {
        const errorMessages = err.inner.map(e => e.message);
        res.status(400).json({ error: { message: 'Validation error', details: errorMessages } });
    }
}

async function validateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: { message: 'Authorization header missing' } });
    }

    const token = authHeader.split(' ')[1];
    try {
        const user = await tokenServiceValidateToken(token);
        if (!user) {
            return res.status(401).json({ error: { message: 'Invalid or expired token' } });
        }

        req.user = user;
        next();
    } catch (err) {
        res.status(500).json({ error: { message: 'Server error' } });
    }
}

export { validateAccountRegistro, validateAccountLogin, validateToken };
