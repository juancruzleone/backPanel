// Configuración para MercadoPago API - Credenciales de TEST
const MP_CONFIG = {
    // Credenciales de PRODUCCIÓN de cuenta TEST - para desarrollo con usuarios de test
    ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || 'APP_USR-3430589277107626-090813-1498a27ceca45c2f8fc43cde60f4400d-290017275',
    PUBLIC_KEY: process.env.MP_PUBLIC_KEY || 'APP_USR-1a74b25d-9ff1-418c-8a12-f4bd5599d0cf',
    BASE_URL: 'https://api.mercadopago.com',
    // Configuración automática - se detecta del país de las credenciales
    COUNTRY: 'AUTO', // Se detecta automáticamente
    CURRENCY: 'AUTO', // Se detecta automáticamente  
    SITE_ID: 'AUTO' // Se detecta automáticamente
};

console.log('🔧 MercadoPago configurado:', {
    public_key: MP_CONFIG.PUBLIC_KEY,
    access_token: MP_CONFIG.ACCESS_TOKEN.substring(0, 20) + '...',
    base_url: MP_CONFIG.BASE_URL
});

export { MP_CONFIG }; 