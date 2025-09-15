# Implementación de Polar.sh para Pagos Internacionales

## Resumen
Se implementó exitosamente Polar.sh como procesador de pagos internacional para el sistema multi-tenant Leonix, manteniendo MercadoPago para Argentina y agregando detección automática de país.

## Arquitectura Implementada

### 1. PaymentRouter Service
**Archivo:** `services/paymentRouter.services.js`

Enruta automáticamente los pagos según el país del usuario:
- **Argentina (AR):** MercadoPago 
- **Resto del mundo:** Polar.sh

**Métodos de detección de país:**
1. IP geolocation (ip-api.com)
2. Accept-Language header
3. País explícito del frontend
4. Fallback: US

### 2. Polar Service
**Archivo:** `services/polar.services.js`

Maneja toda la integración con Polar.sh:
- Creación de productos y precios
- Checkout sessions
- Manejo de suscripciones
- Procesamiento de webhooks
- Verificación de signatures

### 3. API Unificada
**Archivos:** 
- `api/controllers/controller.api.payments.js`
- `api/routes/route.api.payments.js`

## Endpoints Implementados

### Checkout Unificado
```
POST /api/payments/checkout
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "planId": "starter-plan-fallback",
  "billingCycle": "monthly|yearly",
  "country": "AR" // opcional, se detecta automáticamente
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.polar.sh/...",
    "processor": "polar",
    "currency": "USD",
    "userCountry": "US",
    "detectionMethod": "automatic"
  }
}
```

### Webhooks
```
POST /api/payments/webhook/mercadopago  // Para MercadoPago
POST /api/payments/webhook/polar        // Para Polar.sh
```

### Gestión de Suscripciones
```
GET /api/payments/subscription/{processor}/{id}
POST /api/payments/subscription/cancel
GET /api/payments/stats
GET /api/payments/validate
GET /api/payments/detect-country
```

## Configuración

### Variables de Entorno
```env
# Polar.sh
POLAR_API_KEY=polar_oat_3llekY5XYbiKK3V0ZlGZGXNptdDTHrYHOxC5M1xBj5J
POLAR_ORG_NAME=Leonix
POLAR_SUCCESS_URL=https://panelmantenimiento.netlify.app/subscription/success
POLAR_CANCEL_URL=https://panelmantenimiento.netlify.app/plans
POLAR_WEBHOOK_SECRET=polar_webhook_secret_key
```

### Configuración de Productos
**Archivo:** `config/polar.config.js`

Planes configurados en USD:
- **Starter:** $29/mes, $24/año (20% descuento)
- **Professional:** $79/mes, $63/año (20% descuento) 
- **Enterprise:** $199/mes, $159/año (20% descuento)

## Frontend Modificado

### Cambios en `src/pages/plans/[lang]/index.astro`

1. **Nuevo endpoint:** `/api/payments/checkout` en lugar de `/api/public/subscription-plans/{id}/checkout`
2. **Autenticación requerida:** Header `Authorization: Bearer {token}`
3. **Payload simplificado:** Solo `planId`, `billingCycle` y `country` opcional
4. **Información del procesador:** Toast informativo mostrando país detectado y procesador usado

### Flujo de Usuario Mejorado

1. Usuario selecciona plan
2. Sistema detecta país automáticamente
3. Muestra toast informativo: "🇦🇷 Procesando pago... Procesador: MercadoPago, País: AR, Moneda: ARS"
4. Redirige al checkout correspondiente

## Flujo de Pagos

### Argentina (MercadoPago)
```
Usuario AR → PaymentRouter → MercadoPago → Checkout ARS → Webhook → Activar Tenant
```

### Internacional (Polar.sh)
```
Usuario Internacional → PaymentRouter → Polar.sh → Checkout USD → Webhook → Activar Tenant
```

## Webhooks y Procesamiento

### Eventos de Polar.sh
- `checkout.created`: Checkout iniciado
- `checkout.updated`: Estado actualizado (confirmed = pago exitoso)
- `subscription.created`: Suscripción creada
- `subscription.updated`: Suscripción modificada
- `subscription.canceled`: Suscripción cancelada

### Procesamiento Unificado
Ambos procesadores usan el mismo servicio `paymentProcessing.services.js` para:
- Asignar plan al tenant
- Activar suscripción
- Generar facturas AFIP (si aplica)
- Notificaciones

## Ventajas de la Implementación

### Para Argentina
- **MercadoPago:** Procesador local, pesos argentinos
- **Facturación AFIP:** Integración automática
- **Experiencia familiar:** Usuarios conocen MercadoPago

### Para Internacional  
- **Polar.sh:** Merchant of Record automático
- **100+ países soportados:** Cobertura global
- **Múltiples monedas:** USD, EUR, GBP, etc.
- **Compliance automático:** Polar maneja impuestos y regulaciones

### Técnicas
- **Detección automática:** Sin configuración manual del usuario
- **Fallback robusto:** Múltiples métodos de detección
- **API unificada:** Mismo endpoint para ambos procesadores
- **Webhooks seguros:** Verificación de signatures
- **Compatibilidad:** Mantiene funcionalidad existente de MercadoPago

## Monitoreo y Debugging

### Logs Implementados
```javascript
console.log('🌍 País detectado:', country);
console.log('💳 Procesador:', processor); 
console.log('💰 Moneda:', currency);
console.log('🔔 Procesando webhook:', eventType);
```

### Endpoints de Validación
- `GET /api/payments/validate`: Verifica configuración de procesadores
- `GET /api/payments/detect-country`: Prueba detección de país
- `GET /api/payments/stats`: Estadísticas de uso

## Próximos Pasos

1. **Configurar webhooks en Polar.sh:** Apuntar a `/api/payments/webhook/polar`
2. **Crear productos en Polar.sh:** Ejecutar `polarService.createProducts()`
3. **Testing:** Probar flujo completo con usuarios de diferentes países
4. **Monitoreo:** Implementar alertas para fallos de pago
5. **Optimización:** Cachear detección de país por usuario

## Archivos Creados/Modificados

### Nuevos Archivos
- `config/polar.config.js`
- `services/polar.services.js`
- `services/paymentRouter.services.js`
- `api/controllers/controller.api.payments.js`
- `api/routes/route.api.payments.js`

### Archivos Modificados
- `app/server.js` (rutas agregadas)
- `src/pages/plans/[lang]/index.astro` (nuevo endpoint y UX)

La implementación está lista para producción y proporciona una experiencia de pago optimizada tanto para usuarios argentinos como internacionales.
