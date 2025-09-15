/**
 * Script de inicialización de productos en Polar.sh
 * Ejecutar una sola vez para configurar los productos y precios
 */

import polarService from '../services/polar.services.js';
import POLAR_CONFIG from '../config/polar.config.js';

async function setupPolarProducts() {
  try {
    console.log('🚀 Iniciando configuración de productos en Polar.sh...');
    console.log('🔑 API Key:', POLAR_CONFIG.apiKey ? 'Configurada' : 'NO CONFIGURADA');
    console.log('🏢 Organización:', POLAR_CONFIG.organizationName);
    
    // Verificar productos existentes
    console.log('\n📋 Verificando productos existentes...');
    const existingProducts = await polarService.getProducts();
    console.log(`✅ Productos encontrados: ${existingProducts.length}`);
    
    if (existingProducts.length > 0) {
      console.log('\n📦 Productos existentes:');
      existingProducts.forEach(product => {
        console.log(`  - ${product.name} (ID: ${product.id})`);
      });
      
      const shouldRecreate = process.argv.includes('--force');
      if (!shouldRecreate) {
        console.log('\n⚠️ Los productos ya existen. Usa --force para recrearlos.');
        console.log('Ejemplo: node scripts/setup-polar-products.js --force');
        return;
      }
    }
    
    // Crear productos y precios
    console.log('\n🏗️ Creando productos y precios...');
    const products = await polarService.createProducts();
    
    console.log('\n✅ Configuración completada exitosamente!');
    console.log(`📦 Productos creados: ${products.length}`);
    
    products.forEach(({ planKey, product, prices }) => {
      console.log(`\n📋 Plan: ${planKey}`);
      console.log(`  Producto: ${product.name} (${product.id})`);
      console.log(`  Precio mensual: ${prices.monthly.id} - $${prices.monthly.price_amount / 100} USD/mes`);
      console.log(`  Precio anual: ${prices.yearly.id} - $${prices.yearly.price_amount / 100} USD/año`);
    });
    
    console.log('\n🔗 Próximos pasos:');
    console.log('1. Configurar webhooks en Polar.sh dashboard');
    console.log('2. Apuntar webhook a: https://tu-dominio.com/api/payments/webhook/polar');
    console.log('3. Probar checkout con usuarios de diferentes países');
    
  } catch (error) {
    console.error('❌ Error configurando productos:', error);
    
    if (error.response?.status === 401) {
      console.error('🔑 Error de autenticación. Verifica tu API key de Polar.sh');
    } else if (error.response?.status === 403) {
      console.error('🚫 Sin permisos. Verifica que tu API key tenga permisos de escritura');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 Error de conexión. Verifica tu conexión a internet');
    }
    
    process.exit(1);
  }
}

// Función para validar configuración
async function validateConfiguration() {
  console.log('🔍 Validando configuración...');
  
  const checks = {
    apiKey: !!POLAR_CONFIG.apiKey,
    organizationName: !!POLAR_CONFIG.organizationName,
    products: Object.keys(POLAR_CONFIG.defaultProducts).length > 0
  };
  
  console.log('📋 Resultados de validación:');
  Object.entries(checks).forEach(([key, value]) => {
    console.log(`  ${value ? '✅' : '❌'} ${key}: ${value ? 'OK' : 'FALTA'}`);
  });
  
  const allValid = Object.values(checks).every(Boolean);
  if (!allValid) {
    console.error('❌ Configuración incompleta. Revisa config/polar.config.js');
    process.exit(1);
  }
  
  console.log('✅ Configuración válida\n');
}

// Función para mostrar ayuda
function showHelp() {
  console.log(`
🔧 Script de configuración de productos Polar.sh

Uso:
  node scripts/setup-polar-products.js [opciones]

Opciones:
  --force     Recrear productos existentes
  --validate  Solo validar configuración
  --help      Mostrar esta ayuda

Ejemplos:
  node scripts/setup-polar-products.js
  node scripts/setup-polar-products.js --force
  node scripts/setup-polar-products.js --validate
`);
}

// Ejecutar script
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showHelp();
    return;
  }
  
  await validateConfiguration();
  
  if (args.includes('--validate')) {
    console.log('✅ Solo validación solicitada. Configuración OK.');
    return;
  }
  
  await setupPolarProducts();
}

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Error no manejado:', error);
  process.exit(1);
});

// Ejecutar
main().catch(console.error);
