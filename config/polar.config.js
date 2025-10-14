/**
 * Configuración de Polar.sh para pagos internacionales
 * Polar.sh actúa como Merchant of Record para simplificar compliance internacional
 */

const POLAR_CONFIG = {
  // API Key de Polar.sh (usar sandbox para testing)
  apiKey: process.env.POLAR_API_KEY || (process.env.NODE_ENV === 'development' ? 'TU_API_KEY_DEL_SANDBOX' : 'polar_oat_3llekY5XYbiKK3V0ZlGZGXNptdDTHrYHOxC5M1xBj5J'),
  
  // URLs de la API (usar sandbox para testing)
  apiUrl: process.env.POLAR_API_URL || (process.env.NODE_ENV === 'development' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh'),
  
  // Configuración de la organización
  organizationName: process.env.POLAR_ORG_NAME || 'Leonix',
  
  // URLs de retorno
  successUrl: process.env.POLAR_SUCCESS_URL || 'https://cmms.leonix.net.ar/subscription/success',
  cancelUrl: process.env.POLAR_CANCEL_URL || 'https://cmms.leonix.net.ar/plans',
  
  // Webhook configuration
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET || 'polar_webhook_secret_key',
  
  // Configuración de productos por defecto
  defaultProducts: {
    starter: {
      name: 'Starter Plan',
      description: 'Perfecto para comenzar - Hasta 5 usuarios, 3 paneles personalizados',
      monthlyPrice: 25, // USD
      yearlyPrice: 240,  // USD
    },
    professional: {
      name: 'Professional Plan', 
      description: 'Para equipos en crecimiento - Hasta 25 usuarios, paneles ilimitados',
      monthlyPrice: 50, // USD
      yearlyPrice: 540,  // USD
    },
    enterprise: {
      name: 'Enterprise Plan',
      description: 'Solución completa para empresas - Usuarios ilimitados, soporte 24/7',
      monthlyPrice: 80, // USD
      yearlyPrice: 900,  // USD
    }
  },
  
  // Configuración de monedas soportadas
  supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK'],
  
  // Países que usan Polar.sh (todos excepto Argentina)
  supportedCountries: [
    'US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI',
    'AU', 'NZ', 'JP', 'SG', 'HK', 'KR', 'TW', 'MY', 'TH', 'PH', 'ID', 'VN', 'IN', 'BR', 'MX',
    'CL', 'CO', 'PE', 'UY', 'EC', 'BO', 'PY', 'VE', 'GT', 'HN', 'SV', 'NI', 'CR', 'PA', 'DO',
    'CU', 'JM', 'TT', 'BB', 'GY', 'SR', 'GF', 'FK', 'BZ', 'ZA', 'NG', 'KE', 'GH', 'UG', 'TZ',
    'ZW', 'BW', 'ZM', 'MW', 'MZ', 'MG', 'MU', 'SC', 'EG', 'MA', 'TN', 'DZ', 'LY', 'SD', 'ET',
    'SO', 'DJ', 'ER', 'CF', 'TD', 'CM', 'GQ', 'GA', 'CG', 'CD', 'AO', 'NA', 'SZ', 'LS', 'ST',
    'CV', 'GW', 'GN', 'SL', 'LR', 'CI', 'BF', 'ML', 'NE', 'SN', 'GM', 'GH', 'TG', 'BJ', 'RU',
    'UA', 'BY', 'MD', 'RO', 'BG', 'RS', 'HR', 'SI', 'BA', 'ME', 'MK', 'AL', 'XK', 'GR', 'CY',
    'TR', 'GE', 'AM', 'AZ', 'KZ', 'KG', 'TJ', 'TM', 'UZ', 'AF', 'PK', 'BD', 'LK', 'MV', 'NP',
    'BT', 'MM', 'KH', 'LA', 'BN', 'TL', 'FJ', 'PG', 'SB', 'VU', 'NC', 'PF', 'WS', 'TO', 'TV',
    'NR', 'KI', 'PW', 'FM', 'MH', 'GU', 'MP', 'AS', 'VI', 'PR', 'AW', 'CW', 'SX', 'BQ', 'TC',
    'VG', 'AI', 'MS', 'KN', 'AG', 'DM', 'LC', 'VC', 'GD', 'BS', 'KY', 'BM', 'GL', 'FO', 'IS',
    'IE', 'MT', 'LU', 'LI', 'MC', 'SM', 'VA', 'AD', 'GI', 'IM', 'JE', 'GG', 'AX', 'SJ', 'EE',
    'LV', 'LT', 'PL', 'CZ', 'SK', 'HU', 'SI', 'HR', 'BA', 'RS', 'ME', 'MK', 'AL', 'XK', 'IL',
    'PS', 'JO', 'LB', 'SY', 'IQ', 'IR', 'SA', 'YE', 'OM', 'AE', 'QA', 'BH', 'KW', 'MN', 'CN'
  ],
  
  // Configuración de timeout
  timeout: 30000, // 30 segundos
  
  // Headers por defecto
  defaultHeaders: {
    'Content-Type': 'application/json',
    'User-Agent': 'Leonix-Backend/1.0'
  }
};

export default POLAR_CONFIG;
