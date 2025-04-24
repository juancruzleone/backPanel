import * as services from '../../services/profile.services.js';
import { validateToken } from '../../services/token.service.js';

async function editProfile(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: { message: 'Authorization header missing' } });
  }

  const token = authHeader.split(' ')[1];

  try {
    const user = await validateToken(token);
    if (!user) {
      return res.status(401).json({ error: { message: 'Invalid or expired token' } });
    }

    // Verificar que el usuario está logeado (la validación ya se hace al verificar el token)
    const { userName } = req.body;

    try {
      await services.editProfile(user._id, userName);
      res.status(200).json({ message: 'Perfil actualizado correctamente' });
    } catch (err) {
      res.status(400).json({ error: { message: err.message } });
    }
  } catch (err) {
    res.status(500).json({ error: { message: 'Server error' } });
  }
}

export { editProfile };
