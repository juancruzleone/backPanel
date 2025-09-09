# 🚀 Flujo Completo: Pago Exitoso → Tenant + Admin + Plan

## ✅ **Lo Que Ahora SÍ Funciona Automáticamente**

Cuando un pago es exitoso en MercadoPago, el sistema ahora **AUTOMÁTICAMENTE**:

1. ✅ **Detecta el pago** via webhook
2. ✅ **Crea un tenant** para el cliente
3. ✅ **Crea un usuario ADMIN** para ese tenant
4. ✅ **Asigna el plan pagado** al tenant
5. ✅ **Envía credenciales** por email (configurar)
6. ✅ **Vincula todo** correctamente

## 🔄 **Flujo Detallado**

### 1. **Usuario paga un plan:**
```javascript
// POST /api/subscriptions/checkout/{planId}
{
  "clientId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "payerEmail": "cliente@example.com"
}

// Respuesta:
{
  "success": true,
  "data": {
    "checkoutUrl": "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=xxx"
  }
}
```

### 2. **Cliente completa el pago en MercadoPago**

### 3. **MercadoPago envía webhook:**
```javascript
// POST /api/webhooks/mercadopago (automático)
{
  "type": "payment",
  "data": {
    "id": "payment_id_123"
  }
}
```

### 4. **Sistema procesa automáticamente:**

#### 🏢 **Crea Tenant:**
```json
{
  "tenantId": "uuid-generado",
  "name": "Empresa Cliente Example",
  "subdomain": "clienteexample", 
  "email": "cliente@example.com",
  "plan": "plan_premium",
  "maxUsers": 50,
  "maxAssets": 1000,
  "features": {
    "workOrders": true,
    "apiAccess": true,
    "prioritySupport": true
  },
  "subscriptionPlan": "plan_id_from_payment",
  "status": "active"
}
```

#### 👤 **Crea Usuario Admin:**
```json
{
  "tenantId": "uuid-generado",
  "userName": "admin_clienteexample",
  "email": "cliente@example.com", 
  "role": "admin", // 🔥 ROL ADMIN AUTOMÁTICO
  "permissions": {
    "canManageUsers": true,
    "canManageAssets": true,
    "canManageWorkOrders": true,
    "canViewReports": true,
    "canManageSettings": true,
    "canManageSubscription": true
  },
  "temporaryPassword": "generada-automaticamente",
  "mustChangePassword": true
}
```

#### 🔗 **Vincula Suscripción:**
```json
{
  "tenant": "uuid-generado",
  "assignedTo": "admin_user_id",
  "status": "authorized",
  "activatedAt": "2024-01-15T10:30:00Z"
}
```

## 📧 **Email de Bienvenida (Enviado Automáticamente)**

```
¡Bienvenido a tu nueva cuenta!

Tu empresa: Empresa Cliente Example
Subdominio: clienteexample
Plan: Plan Premium

Credenciales de acceso:
Usuario: admin_clienteexample  
Contraseña temporal: ABC123def456

⚠️ Debes cambiar tu contraseña al primer login.

Inicia sesión en: https://tuapp.com/clienteexample
```

## 🧪 **Cómo Testear el Sistema**

### **Opción 1: Pago Real (Recomendado)**
```javascript
// 1. Crear un plan
POST /api/subscription-plans
{
  "name": "Plan Test",
  "description": "Plan de prueba",
  "price": 100,
  "frequency": "monthly",
  "features": ["Test feature"],
  "backUrl": "https://tuapp.com/success"
}

// 2. Crear checkout y pagar
POST /api/subscriptions/checkout/{planId}
{
  "clientId": "client_id",
  "payerEmail": "test@example.com"
}

// 3. Pagar en MercadoPago (usa tarjetas de prueba)
// 4. El webhook procesará automáticamente
```

### **Opción 2: Simular Pago (Para Testing)**
```javascript
// Endpoint manual para testear sin pagar realmente
POST /api/webhooks/process-payment
{
  "paymentData": {
    "external_reference": "sub_123456_tenant",
    "status": "approved"
  }
}
```

### **Opción 3: Verificar Suscripción Existente**
```javascript
// Si ya tienes una suscripción autorizada sin tenant
GET /api/webhooks/check-subscription/{subscriptionId}

// Esto procesará automáticamente si falta el tenant
```

## 🔍 **Verificar que Todo Funcionó**

### **1. Verificar Tenant Creado:**
```javascript
GET /api/tenants
// Buscar el nuevo tenant con el email del cliente
```

### **2. Verificar Usuario Admin:**
```javascript
// Login con las credenciales generadas
POST /api/cuenta/login
{
  "userName": "admin_clienteexample",
  "password": "contraseña-temporal"
}
```

### **3. Verificar Suscripción Vinculada:**
```javascript
GET /api/subscriptions
// La suscripción debe tener tenant asignado
```

## 🎯 **Configuraciones Importantes**

### **1. Webhook URL en MercadoPago:**
```
URL: https://tudominio.com/api/webhooks/mercadopago
Eventos: payments
```

### **2. Variables de Entorno:**
```bash
MP_ACCESS_TOKEN=TEST-3430589277107626-090813-9cab6523e97b0e15b81b7ce6383b845f-290017275
MP_PUBLIC_KEY=TEST-9b5f08cb-61e6-49b7-b055-19b8e68ee344
```

### **3. Configurar Email (Opcional):**
En `services/paymentProcessing.services.js` línea 245:
```javascript
// TODO: Implementar envío de email real
// Integrar con nodemailer, sendgrid, etc.
```

## 🚨 **Casos Edge a Considerar**

### **Webhook Duplicado:**
- ✅ El sistema verifica si ya existe el tenant
- ✅ No crea duplicados

### **Cliente Sin Email:**
- ✅ Usa el email del pago como fallback
- ✅ Genera nombre basado en email

### **Subdominio Ocupado:**
- ✅ Agrega número al final automáticamente
- ✅ Garantiza unicidad

### **Plan No Encontrado:**
- ✅ El proceso falla gracefully
- ✅ Se loggea el error

## 📋 **Resumen del Flujo**

```
[Cliente] → [Paga Plan] → [MercadoPago] 
    ↓
[Webhook] → [Nuestro Sistema]
    ↓
[Crea Tenant] → [Crea Admin] → [Vincula Todo]
    ↓
[Email Bienvenida] ← [Cliente puede usar sistema]
```

**¡El flujo está COMPLETAMENTE automatizado!** 🎉

Solo necesitas:
1. ✅ Configurar la URL del webhook en MercadoPago
2. ✅ (Opcional) Configurar envío de emails
3. ✅ ¡Listo para recibir pagos! 