// Configuración para MercadoPago API
const MP_CONFIG = {
    ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || 'APP_USR-7356534442102935-091318-95181566990427513d6eb94a61a388e6-1861901310',
    PUBLIC_KEY: process.env.MP_PUBLIC_KEY || 'APP_USR-1e9cd90e-5408-451a-bd86-2e2b597c3b88',
    BASE_URL: 'https://api.mercadopago.com'
};

console.log('🔧 MercadoPago configurado:', {
    public_key: MP_CONFIG.PUBLIC_KEY,
    access_token: MP_CONFIG.ACCESS_TOKEN.substring(0, 20) + '...',
    base_url: MP_CONFIG.BASE_URL
});

export { MP_CONFIG }; 