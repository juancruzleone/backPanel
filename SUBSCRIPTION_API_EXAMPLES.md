# API de Suscripciones y Planes - Ejemplos de Uso

## Configuración

Las credenciales de MercadoPago están configuradas en `config/mercadopago.config.js`:
- **Public Key**: TEST-9b5f08cb-61e6-49b7-b055-19b8e68ee344
- **Access Token**: TEST-3430589277107626-090813-9cab6523e97b0e15b81b7ce6383b845f-290017275

## 🏷️ Planes de Suscripción

### 1. Crear Plan de Suscripción

```javascript
POST /api/subscription-plans
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Plan Premium",
  "description": "Plan premium con todas las funcionalidades",
  "price": 9999,
  "currency": "ARS",
  "frequency": "monthly",
  "discountPercentage": 15,
  "features": [
    "Usuarios ilimitados",
    "Proyectos ilimitados",
    "Soporte prioritario",
    "Reportes avanzados"
  ],
  "maxUsers": null,
  "maxProjects": null,
  "trialDays": 7,
  "backUrl": "https://tudominio.com/subscription/success"
}
```

### 2. Obtener Planes

```javascript
GET /api/subscription-plans
Authorization: Bearer <token>

// Con filtros opcionales:
GET /api/subscription-plans?status=active
```

### 3. Calcular Precio con Descuento

```javascript
POST /api/subscription-plans/calculate-price
Content-Type: application/json
Authorization: Bearer <token>

{
  "price": 10000,
  "discountPercentage": 20,
  "frequency": "annual"
}

// Respuesta:
{
  "success": true,
  "data": {
    "originalPrice": 10000,
    "discountPercentage": 20,
    "frequency": "annual",
    "discountedPrice": 7200, // 20% + 10% descuento anual adicional
    "savings": 2800
  }
}
```

## 💳 Suscripciones

### 1. Crear Checkout para un Plan

```javascript
POST /api/subscriptions/checkout/{planId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "clientId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "payerEmail": "cliente@example.com",
  "backUrl": "https://tudominio.com/subscription/success"
}

// Respuesta:
{
  "success": true,
  "message": "Checkout creado exitosamente",
  "data": {
    "subscriptionId": "60f7b3b3b3b3b3b3b3b3b3b4",
    "checkoutUrl": "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=xxx",
    "initPoint": "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=xxx"
  }
}
```

### 2. Crear Suscripción Completa

```javascript
POST /api/subscriptions
Content-Type: application/json
Authorization: Bearer <token>

{
  "subscriptionPlan": "60f7b3b3b3b3b3b3b3b3b3b3",
  "client": "60f7b3b3b3b3b3b3b3b3b3b4",
  "payerEmail": "cliente@example.com",
  "reason": "Suscripción a Plan Premium",
  "cardTokenId": "e3ed6f098462036dd2cbabe314b9de2a", // Opcional
  "backUrl": "https://tudominio.com/subscription/success"
}
```

### 3. Obtener Suscripciones

```javascript
GET /api/subscriptions
Authorization: Bearer <token>

// Con filtros:
GET /api/subscriptions?status=authorized&client=60f7b3b3b3b3b3b3b3b3b3b4
```

### 4. Gestionar Suscripciones

```javascript
// Pausar suscripción
POST /api/subscriptions/{subscriptionId}/pause
Authorization: Bearer <token>

// Reactivar suscripción
POST /api/subscriptions/{subscriptionId}/reactivate
Authorization: Bearer <token>

// Cancelar suscripción
POST /api/subscriptions/{subscriptionId}/cancel
Authorization: Bearer <token>

// Sincronizar con MercadoPago
POST /api/subscriptions/{subscriptionId}/sync
Authorization: Bearer <token>
```

## 📊 Estadísticas

### Estadísticas de Planes

```javascript
GET /api/subscription-plans/stats
Authorization: Bearer <token>

// Respuesta:
{
  "success": true,
  "data": {
    "total": 5,
    "active": 4,
    "cancelled": 1,
    "monthlyPlans": 3,
    "annualPlans": 2,
    "avgPrice": 7500
  }
}
```

### Estadísticas de Suscripciones

```javascript
GET /api/subscriptions/stats
Authorization: Bearer <token>

// Respuesta:
{
  "success": true,
  "data": {
    "total": 25,
    "active": 18,
    "pending": 3,
    "cancelled": 2,
    "paused": 2,
    "totalRevenue": 180000,
    "monthlyRevenue": 90000,
    "annualRevenue": 90000
  }
}
```

## 🔄 Flujo Completo de Suscripción

### Paso 1: Crear Plan
```javascript
const planData = {
  name: "Plan Básico",
  description: "Plan básico para empresas pequeñas",
  price: 5000,
  frequency: "monthly",
  discountPercentage: 0,
  features: ["5 usuarios", "10 proyectos", "Soporte básico"],
  trialDays: 14,
  backUrl: "https://miapp.com/success"
};

const response = await fetch('/api/subscription-plans', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(planData)
});
```

### Paso 2: Crear Checkout
```javascript
const planId = "60f7b3b3b3b3b3b3b3b3b3b3";
const checkoutData = {
  clientId: "60f7b3b3b3b3b3b3b3b3b3b4",
  payerEmail: "cliente@example.com"
};

const checkoutResponse = await fetch(`/api/subscriptions/checkout/${planId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(checkoutData)
});

const { checkoutUrl } = checkoutResponse.data;
// Redirigir al usuario a checkoutUrl
window.location.href = checkoutUrl;
```

### Paso 3: Manejar Webhook (opcional)
```javascript
// En tu servidor, escuchar webhooks de MercadoPago
POST /webhooks/mercadopago

// Cuando recibas un webhook, sincronizar la suscripción:
const subscriptionId = "60f7b3b3b3b3b3b3b3b3b3b5";
await fetch(`/api/subscriptions/${subscriptionId}/sync`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 🛡️ Estados de Suscripción

- **pending**: Suscripción creada, esperando pago
- **authorized**: Suscripción activa con pago autorizado
- **paused**: Suscripción pausada temporalmente
- **cancelled**: Suscripción cancelada

## 💡 Características Especiales

### Descuentos Automáticos
- Los planes anuales reciben un 10% de descuento adicional automáticamente
- Se pueden configurar descuentos personalizados por plan

### Período de Prueba
- Configurable por plan (0-365 días)
- Se aplica automáticamente en MercadoPago

### Sincronización Automática
- Los estados se sincronizan automáticamente con MercadoPago
- Función manual de sincronización disponible

## 🚀 Frontend Integration

### Ejemplo de botón "Pagar Plan"

```html
<button onclick="subscribeToPlan('PLAN_ID')" class="btn-subscribe">
  Suscribirse al Plan Premium - $9,999/mes
</button>

<script>
async function subscribeToPlan(planId) {
  try {
    const response = await fetch(`/api/subscriptions/checkout/${planId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        clientId: getCurrentClientId(),
        payerEmail: getCurrentUserEmail()
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Redirigir al checkout de MercadoPago
      window.location.href = data.data.checkoutUrl;
    } else {
      alert('Error al crear la suscripción: ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al procesar la suscripción');
  }
}
</script>
```

Este sistema te permite manejar suscripciones mensuales y anuales con descuentos automáticos, períodos de prueba, y integración completa con MercadoPago! 🎉 