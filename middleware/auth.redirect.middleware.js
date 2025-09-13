/**
 * Middleware para redirigir a la página de login cuando el usuario no está autenticado
 * Útil para rutas que requieren autenticación en el frontend
 */

function redirectToLogin(req, res, next) {
  // Si no hay usuario autenticado y es una petición AJAX o que espera JSON
  if (!req.user && (req.xhr || req.headers.accept?.includes('application/json'))) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHENTICATED',
      message: 'Por favor, inicie sesión para continuar',
      redirectTo: '/login',
      redirectData: {
        // Opcional: Datos para mostrar un mensaje personalizado después del login
        message: 'Por favor, inicie sesión para continuar con la compra',
        // URL a la que redirigir después del login exitoso
        returnTo: req.originalUrl
      }
    });
  }
  
  // Si no hay usuario autenticado y es una petición normal del navegador
  if (!req.user) {
    return res.redirect(`/login?returnTo=${encodeURIComponent(req.originalUrl)}`);
  }
  
  // Si el usuario está autenticado, continuar
  next();
}

export { redirectToLogin };
