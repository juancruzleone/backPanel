// Configuración para MercadoPago API - Solo variables de entorno
const MP_CONFIG = {
    // IMPORTANTE: Las credenciales deben estar en .env - NUNCA hardcodear aquí
    ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN,
    PUBLIC_KEY: process.env.MERCADOPAGO_PUBLIC_KEY,
    BASE_URL: 'https://api.mercadopago.com',
    // Configuración automática - se detecta del país de las credenciales
    COUNTRY: 'AUTO', // Se detecta automáticamente
    CURRENCY: 'AUTO', // Se detecta automáticamente  
    SITE_ID: 'AUTO' // Se detecta automáticamente
};

// Validar que las variables de entorno estén configuradas
if (!MP_CONFIG.ACCESS_TOKEN || !MP_CONFIG.PUBLIC_KEY) {
    console.error('❌ ERROR: Variables de entorno MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_PUBLIC_KEY son requeridas');
    process.exit(1);
}

console.log('🔧 MercadoPago configurado:', {
    public_key: MP_CONFIG.PUBLIC_KEY ? 'Configurado ✅' : 'Faltante ❌',
    access_token: MP_CONFIG.ACCESS_TOKEN ? 'Configurado ✅' : 'Faltante ❌',
    base_url: MP_CONFIG.BASE_URL
});

export { MP_CONFIG }; 