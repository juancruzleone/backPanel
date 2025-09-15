// Configuración para MercadoPago API - Credenciales de TEST
const MP_CONFIG = {
    // Credenciales de TEST - para desarrollo con usuarios de test
    ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || 'TEST-3430589277107626-090813-9cab6523e97b0e15b81b7ce6383b845f-290017275',
    PUBLIC_KEY: process.env.MP_PUBLIC_KEY || 'TEST-9b5f08cb-61e6-49b7-b055-19b8e68ee344',
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