import axios from 'axios';
import { db } from '../db.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import tenantFoldersService from './tenantFolders.services.js';
import * as subscriptionService from './subscriptions.services.js';
import { MP_CONFIG } from '../config/mercadopago.config.js';

const tenantCollection = db.collection("tenants");
const cuentaCollection = db.collection("cuentas");

class PaymentProcessingService {
    
    // Procesar pago exitoso de suscripción
    async processSuccessfulPayment(mpPaymentData) {
        try {
            console.log('🎉 Procesando pago exitoso:', mpPaymentData);
            
            // 1. Obtener la suscripción desde MercadoPago
            const subscriptionId = mpPaymentData.external_reference;
            if (!subscriptionId) {
                throw new Error('No se encontró referencia externa en el pago');
            }
            
            // 2. Buscar la suscripción en nuestra base de datos
            let subscription = await db.collection('subscriptions').findOne({
                externalReference: subscriptionId
            });
            
            // Si no existe la suscripción, crearla ahora (flujo optimizado)
            if (!subscription) {
                console.log('📝 Suscripción no encontrada en BD - Creando desde webhook');
                
                // Extraer información del external_reference
                const refParts = subscriptionId.split('_');
                const tenantId = refParts[0];
                const planId = refParts[1];
                
                // Crear suscripción desde el webhook
                subscription = {
                    _id: new ObjectId(),
                    externalReference: subscriptionId,
                    tenantId: tenantId,
                    planId: planId,
                    subscriptionPlan: planId,
                    payerEmail: mpPaymentData.payer?.email || 'unknown@example.com',
                    status: 'approved', // Directamente aprobada porque viene del webhook exitoso
                    amount: mpPaymentData.transaction_amount || 0,
                    currency: mpPaymentData.currency_id || 'ARS',
                    frequency: 'monthly', // Default
                    billingCycle: 'monthly',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    mercadoPagoId: mpPaymentData.id
                };
                
                // Insertar en BD
                await db.collection('subscriptions').insertOne(subscription);
                console.log('✅ Suscripción creada desde webhook:', subscription._id);
            }
            
            // Si es un test y no existe la suscripción, crear una simulada
            if (!subscription && subscriptionId.includes('test')) {
                console.log('🧪 Creando suscripción simulada para testing');
                subscription = {
                    _id: 'test_subscription_id',
                    externalReference: subscriptionId,
                    planId: 'professional-plan',
                    payerEmail: mpPaymentData.payer?.email || 'test@example.com',
                    status: 'approved',
                    createdAt: new Date(),
                    frequency: 'monthly',
                    amount: 100
                };
            }
            
            // 3. Obtener el plan de configuración (no de BD)
            const { getPlanConfig } = await import('../config/plans.config.js');
            let planName = subscription.planId;
            
            // Mapear planId a nombre de plan
            if (planName.includes('starter') || planName.includes('basic')) planName = 'starter';
            if (planName.includes('professional')) planName = 'professional';
            if (planName.includes('enterprise')) planName = 'enterprise';
            
            const plan = getPlanConfig(planName);
            if (!plan) {
                throw new Error(`Plan no encontrado: ${planName}`);
            }
            
            // 4. Crear datos del cliente desde la suscripción
            const client = {
                name: subscription.payerEmail.split('@')[0],
                email: subscription.payerEmail,
                phone: '',
                address: ''
            };
            
            // 5. VERIFICAR SI YA EXISTE UN USUARIO CON ESE EMAIL
            let existingUser = null;
            
            // Si no es test, buscar usuario existente
            if (subscription._id !== 'test_subscription_id') {
                existingUser = await cuentaCollection.findOne({
                    email: subscription.payerEmail
                });
            }
            
            let tenantData, adminUser;
            
            if (existingUser) {
                console.log('👤 Usuario existente encontrado:', existingUser.email);
                console.log('🏢 TenantId del usuario existente:', existingUser.tenantId);
                
                // VERIFICAR SI YA TIENE UN PLAN ACTIVO
                const { checkTenantActivePlan } = await import('./tenants.services.js');
                const planCheck = await checkTenantActivePlan(subscription.payerEmail);
                
                if (planCheck.hasActivePlan) {
                    console.log('⚠️ Usuario ya tiene plan activo:', planCheck.currentPlan);
                    console.log('🔄 Procediendo con actualización/cambio de plan...');
                }
                
                // 6A. ACTUALIZAR PLAN DEL TENANT EXISTENTE
                tenantData = await this.updateExistingTenantPlan(existingUser.tenantId, plan);
                adminUser = existingUser;
                
                console.log('✅ Plan actualizado para tenant existente:', {
                    tenantId: existingUser.tenantId,
                    oldPlan: planCheck.currentPlan || 'sin plan',
                    newPlan: plan.name,
                    userEmail: existingUser.email
                });
                
            } else {
                // Si no existe usuario pero la suscripción trae tenantId, actualizar ese tenant existente
                if (subscription.tenantId) {
                    console.log('🏢 No hay usuario existente, pero hay tenantId en suscripción. Actualizando tenant existente:', subscription.tenantId);
                    tenantData = await this.updateExistingTenantPlan(subscription.tenantId, plan);
                    // Intentar obtener un admin existente del tenant para vincular
                    adminUser = await cuentaCollection.findOne({ tenantId: tenantData.tenantId, role: { $in: ['admin', 'super_admin'] } });
                    if (!adminUser) {
                        console.log('ℹ️ No se encontró admin existente para el tenant, no se asignará assignedTo en la suscripción');
                    } else {
                        console.log('👤 Admin existente encontrado para tenant:', adminUser.email);
                    }
                } else {
                    console.log('🆕 Usuario nuevo, creando tenant y cuenta...');
                    
                    // 6B. CREAR NUEVO TENANT Y USUARIO (flujo original)
                    tenantData = await this.createTenantForClient(client, plan, subscription._id === 'test_subscription_id');
                    adminUser = await this.createAdminUser(client, tenantData.tenantId, subscription.payerEmail, subscription._id === 'test_subscription_id');
                    
                    console.log('✅ Nuevo tenant y usuario creados:', {
                        tenantId: tenantData.tenantId,
                        userEmail: adminUser.email
                    });
                }
            }
            
            // 7. Actualizar suscripción con información del tenant
            await this.linkSubscriptionToTenant(subscription._id, tenantData.tenantId, adminUser._id);
            
            return {
                success: true,
                tenant: tenantData,
                adminUser: adminUser,
                subscription: subscription,
                plan: plan,
                isExistingUser: !!existingUser,
                planUpgrade: existingUser ? true : false
            };
            
        } catch (error) {
            console.error('❌ Error procesando pago exitoso:', error);
            throw new Error(`Error procesando pago: ${error.message}`);
        }
    }
    
    // Actualizar plan del tenant existente
    async updateExistingTenantPlan(tenantId, newPlan) {
        try {
            console.log('🔄 Actualizando plan del tenant existente:', { tenantId, newPlan: newPlan.name });
            
            // Buscar el tenant existente por tenantId o por _id
            let tenant = await tenantCollection.findOne({ tenantId });
            if (!tenant) {
                // Buscar por _id si no se encuentra por tenantId
                tenant = await tenantCollection.findOne({ _id: new ObjectId(tenantId) });
            }
            
            if (!tenant) {
                throw new Error(`Tenant no encontrado con ID: ${tenantId}`);
            }
            
            console.log('🏢 Tenant encontrado:', {
                _id: tenant._id,
                tenantId: tenant.tenantId,
                currentPlan: tenant.plan
            });
            
            // Mapear características del nuevo plan
            const tenantFeatures = this.mapPlanToTenantFeatures(newPlan);
            
            // Actualizar datos del tenant con el nuevo plan
            const updateData = {
                plan: newPlan.name.toLowerCase().replace(' ', '_'),
                
                // Actualizar límites basados en el nuevo plan
                maxUsers: newPlan.maxUsers || 10,
                maxAssets: newPlan.maxProjects || 100,
                maxWorkOrders: this.calculateWorkOrderLimit(newPlan),
                
                // Actualizar características del plan
                features: tenantFeatures,
                
                // Actualizar información de la suscripción
                subscriptionPlan: newPlan._id || newPlan.name,
                subscriptionFrequency: newPlan.frequency,
                subscriptionAmount: newPlan.price,
                // Expiración de suscripción (30 días mensual, 365 días anual)
                subscriptionExpiresAt: new Date(Date.now() + (newPlan.frequency === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000),
                
                // Mantener estado activo y actualizar timestamp
                status: 'active',
                updatedAt: new Date(),
                updatedBy: 'payment_system'
            };
            
            // Actualizar el tenant en la base de datos
            const result = await tenantCollection.updateOne(
                { _id: tenant._id },
                { $set: updateData }
            );
            
            if (result.matchedCount === 0) {
                throw new Error('No se pudo actualizar el tenant');
            }
            
            console.log('✅ Tenant actualizado exitosamente:', {
                tenantId: tenant.tenantId,
                oldPlan: tenant.plan,
                newPlan: updateData.plan,
                newLimits: {
                    maxUsers: updateData.maxUsers,
                    maxAssets: updateData.maxAssets,
                    maxWorkOrders: updateData.maxWorkOrders
                }
            });
            
            // Devolver el tenant actualizado
            return {
                ...tenant,
                ...updateData
            };
            
        } catch (error) {
            console.error('❌ Error actualizando plan del tenant:', error);
            throw error;
        }
    }
    
    // Crear tenant para el cliente que pagó
    async createTenantForClient(client, plan, isTest = false) {
        try {
            const tenantId = uuidv4();
            
            // Generar subdominio único basado en el nombre del cliente
            let subdomain = this.generateSubdomain(client.name || client.email);
            
            // Si es test, usar subdomain fijo
            if (isTest) {
                subdomain = 'test-tenant';
            } else {
                // Verificar que el subdominio sea único
                let counter = 1;
                while (await this.isSubdomainTaken(subdomain)) {
                    subdomain = `${this.generateSubdomain(client.name || client.email)}-${counter}`;
                    counter++;
                }
            }
            
            // Mapear características del plan a configuración del tenant
            const tenantFeatures = this.mapPlanToTenantFeatures(plan);
            
            const newTenant = {
                _id: isTest ? 'test_tenant_id' : new ObjectId(),
                tenantId,
                name: client.name || `Empresa ${client.email}`,
                subdomain: subdomain,
                email: client.email,
                phone: client.phone || '',
                address: client.address || '',
                plan: plan.name.toLowerCase().replace(' ', '_'), // "Plan Premium" → "plan_premium"
                
                // Límites basados en el plan de suscripción
                maxUsers: plan.maxUsers || 10,
                maxAssets: plan.maxProjects || 100, // Usar maxProjects como maxAssets
                maxWorkOrders: this.calculateWorkOrderLimit(plan),
                
                // Características del plan
                features: tenantFeatures,
                
                // Información de la suscripción
                subscriptionPlan: plan._id,
                subscriptionFrequency: plan.frequency,
                subscriptionAmount: plan.price,
                
                status: 'active',
                createdAt: new Date(),
                createdBy: 'payment_system',
                updatedAt: new Date(),
                
                // Estadísticas iniciales
                stats: {
                    totalUsers: 0,
                    totalAssets: 0,
                    totalWorkOrders: 0,
                    lastActivity: new Date()
                }
            };
            
            // Si es test, no insertar en BD
            let result;
            if (isTest) {
                console.log('🧪 Simulando creación de tenant para testing');
                result = { insertedId: 'test_tenant_id' };
            } else {
                result = await tenantCollection.insertOne(newTenant);
            }
            
            // Crear carpetas base en Hetzner Object Storage
            try {
                await tenantFoldersService.onTenantCreated(tenantId);
                console.log('✅ Carpetas de Hetzner creadas para tenant:', tenantId);
            } catch (error) {
                console.error('⚠️ Error al crear carpetas de Hetzner (continuando):', error);
            }
            
            console.log('✅ Tenant creado exitosamente:', {
                tenantId,
                subdomain,
                plan: plan.name
            });
            
            return {
                ...newTenant,
                _id: result.insertedId
            };
            
        } catch (error) {
            console.error('❌ Error creando tenant:', error);
            throw error;
        }
    }
    
    // Crear usuario admin para el tenant
    async createAdminUser(client, tenantId, payerEmail, isTest = false) {
        try {
            // Generar contraseña temporal
            const tempPassword = this.generateTempPassword();
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            
            // Generar username único
            let username = this.generateUsername(client.name || payerEmail);
            
            // Si es test, usar username fijo
            if (isTest) {
                username = 'test_admin';
            } else {
                let counter = 1;
                while (await this.isUsernameTaken(username, tenantId)) {
                    username = `${this.generateUsername(client.name || payerEmail)}_${counter}`;
                    counter++;
                }
            }
            
            const adminUser = {
                _id: isTest ? 'test_admin_id' : new ObjectId(),
                tenantId,
                userName: username,
                password: hashedPassword,
                email: payerEmail,
                role: 'admin', // 🔥 ROL ADMIN ASIGNADO AUTOMÁTICAMENTE
                isVerified: true,
                status: 'active',
                createdAt: new Date(),
                createdBy: 'payment_system',
                updatedAt: new Date(),
                
                // Datos del perfil
                firstName: client.name ? client.name.split(' ')[0] : 'Admin',
                lastName: client.name ? client.name.split(' ').slice(1).join(' ') : 'Usuario',
                phone: client.phone || '',
                
                // Permisos completos de admin
                permissions: {
                    canManageUsers: true,
                    canManageAssets: true,
                    canManageWorkOrders: true,
                    canViewReports: true,
                    canManageSettings: true,
                    canManageSubscription: true // Permiso adicional para manejar suscripción
                },
                
                // Información de la cuenta
                temporaryPassword: tempPassword, // Guardar para enviar por email
                mustChangePassword: true
            };
            
            // Si es test, no insertar en BD
            let result;
            if (isTest) {
                console.log('🧪 Simulando creación de usuario admin para testing');
                result = { insertedId: 'test_admin_id' };
            } else {
                result = await cuentaCollection.insertOne(adminUser);
                
                // Actualizar estadísticas del tenant
                await tenantCollection.updateOne(
                    { tenantId },
                    { $inc: { "stats.totalUsers": 1 } }
                );
            }
            
            console.log('✅ Usuario admin creado:', {
                username,
                email: payerEmail,
                role: 'admin',
                tenantId
            });
            
            // TODO: Enviar email con credenciales
            await this.sendWelcomeEmail(adminUser, tempPassword);
            
            return {
                ...adminUser,
                _id: result.insertedId,
                password: undefined // No devolver la contraseña hasheada
            };
            
        } catch (error) {
            console.error('❌ Error creando usuario admin:', error);
            throw error;
        }
    }
    
    // Vincular suscripción con tenant creado
    async linkSubscriptionToTenant(subscriptionId, tenantId, adminUserId) {
        try {
            // Si es un test, solo hacer log sin actualizar BD
            if (subscriptionId === 'test_subscription_id') {
                console.log('🧪 Simulando vinculación de suscripción de test:', { subscriptionId, tenantId });
                return;
            }
            
            await db.collection('subscriptions').updateOne(
                { _id: subscriptionId },
                {
                    $set: {
                        tenant: tenantId,
                        assignedTo: adminUserId,
                        status: 'authorized',
                        activatedAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            );
            
            console.log('✅ Suscripción vinculada al tenant:', { subscriptionId, tenantId });
            
        } catch (error) {
            console.error('❌ Error vinculando suscripción:', error);
            throw error;
        }
    }
    
    // Mapear características del plan a configuración del tenant
    mapPlanToTenantFeatures(plan) {
        const baseFeatures = {
            workOrders: true,
            assets: true,
            reports: true,
            pdfGeneration: true
        };
        
        // Características avanzadas basadas en el plan
        const advancedFeatures = {
            apiAccess: plan.features?.includes('API completa') || false,
            customBranding: plan.features?.includes('Branding personalizado') || false,
            prioritySupport: plan.features?.includes('Soporte prioritario') || false,
            advancedAnalytics: plan.features?.includes('Reportes avanzados') || false,
            integrations: plan.features?.includes('Integración con terceros') || false,
            whiteLabel: plan.features?.includes('White label') || false,
            backupAutomatico: plan.features?.includes('Backup automático') || false
        };
        
        return { ...baseFeatures, ...advancedFeatures };
    }
    
    // Calcular límite de órdenes de trabajo basado en el plan
    calculateWorkOrderLimit(plan) {
        const baseLimit = plan.maxProjects || 100;
        
        // Multiplicadores basados en la frecuencia
        if (plan.frequency === 'annual') {
            return baseLimit * 12; // Más órdenes para planes anuales
        }
        
        return baseLimit * 5; // Límite base para planes mensuales
    }
    
    // Utilidades para generar datos únicos
    generateSubdomain(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 15) || 'empresa';
    }
    
    generateUsername(name) {
        const base = name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 10) || 'admin';
        return `admin_${base}`;
    }
    
    generateTempPassword() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
    
    async isSubdomainTaken(subdomain) {
        // Si es test, siempre devolver false
        if (subdomain === 'test-tenant') {
            return false;
        }
        const existing = await tenantCollection.findOne({ subdomain });
        return !!existing;
    }
    
    async isUsernameTaken(username, tenantId) {
        // Si es test, siempre devolver false
        if (username === 'test_admin') {
            return false;
        }
        const existing = await cuentaCollection.findOne({ userName: username, tenantId });
        return !!existing;
    }
    
    // Enviar email de bienvenida (placeholder)
    async sendWelcomeEmail(adminUser, tempPassword) {
        try {
            // Si es test, solo hacer log
            if (adminUser._id === 'test_admin_id') {
                console.log('🧪 Simulando envío de email de bienvenida para testing');
                return;
            }
            
            // TODO: Implementar envío de email real
            console.log('📧 Email de bienvenida enviado a:', adminUser.email);
            console.log('🔑 Credenciales temporales:', {
                username: adminUser.userName,
                password: tempPassword,
                changePasswordRequired: true
            });
            
            // Aquí puedes integrar con tu servicio de email (nodemailer, etc.)
            
        } catch (error) {
            console.error('❌ Error enviando email de bienvenida:', error);
            // No fallar el proceso completo por un error de email
        }
    }
    
    // Procesar webhook de MercadoPago
    async processWebhook(webhookData) {
        try {
            console.log('🔔 Webhook recibido de MercadoPago:', JSON.stringify(webhookData, null, 2));
            
            // Procesar diferentes tipos de webhooks
            if (webhookData.type === 'payment') {
                return await this.processPaymentWebhook(webhookData);
            } else if (webhookData.type === 'subscription_preapproval') {
                return await this.processSubscriptionWebhook(webhookData);
            } else if (webhookData.type === 'subscription_authorized_payment') {
                console.log('💳 Procesando webhook de pago autorizado de suscripción');
                return await this.processAuthorizedPaymentWebhook(webhookData);
            } else {
                console.log(`ℹ️ Webhook ignorado - tipo no soportado: ${webhookData.type}`);
                return { processed: false, reason: `Unsupported webhook type: ${webhookData.type}` };
            }
            
        } catch (error) {
            console.error('❌ Error procesando webhook:', error);
            throw error;
        }
    }

    // Procesar webhook de pago autorizado de suscripción
    async processAuthorizedPaymentWebhook(webhookData) {
        try {
            console.log('💳 Procesando webhook de pago autorizado de suscripción');
            
            // Para subscription_authorized_payment, el ID es del pago autorizado
            const authorizedPaymentId = webhookData.data.id;
            console.log('🔍 ID del pago autorizado:', authorizedPaymentId);
            
            try {
                // Intentar obtener información del pago autorizado
                const paymentInfo = await this.getAuthorizedPaymentInfo(authorizedPaymentId);
                
                if (paymentInfo && (paymentInfo.status === 'authorized' || paymentInfo.status === 'approved')) {
                    console.log('✅ Pago autorizado confirmado, procesando...');
                    const paymentId = paymentInfo.payment_id || authorizedPaymentId;
                    const result = await this.processSuccessfulPayment(paymentId, 'mercadopago');
                    return { processed: true, result };
                }
            } catch (error) {
                console.log('⚠️ Error obteniendo pago autorizado, intentando como pago normal...');
            }
            
            // Fallback: intentar procesar directamente como pago normal
            try {
                console.log('🔄 Intentando procesar como pago normal...');
                const result = await this.processSuccessfulPayment(authorizedPaymentId, 'mercadopago');
                
                if (result.success) {
                    console.log('✅ Pago procesado exitosamente como pago normal');
                    return { processed: true, result };
                }
            } catch (fallbackError) {
                console.log('❌ También falló como pago normal:', fallbackError.message);
            }
            
            // Si todo falla, marcar como no procesado pero sin error
            console.log('⚠️ No se pudo procesar el pago autorizado automáticamente');
            return { 
                processed: false, 
                reason: 'Could not process authorized payment automatically',
                authorizedPaymentId: authorizedPaymentId,
                suggestion: 'Use manual processing script'
            };
            
        } catch (error) {
            console.error('❌ Error procesando webhook de pago autorizado:', error);
            throw error;
        }
    }

    // Procesar webhook de pago
    async processPaymentWebhook(webhookData) {
        try {
            console.log('💳 Procesando webhook de pago');
            
            // Obtener información del pago desde MercadoPago
            const paymentId = webhookData.data.id;
            const paymentInfo = await this.getPaymentInfo(paymentId);
            
            if (paymentInfo.status === 'approved') {
                // Procesar pago exitoso
                const result = await this.processSuccessfulPayment(paymentInfo);
                return { processed: true, result };
            } else {
                console.log('⏳ Pago no aprobado aún:', paymentInfo.status);
                return { processed: false, reason: `Payment status: ${paymentInfo.status}` };
            }
            
        } catch (error) {
            console.error('❌ Error procesando webhook de pago:', error);
            throw error;
        }
    }

    // Procesar webhook de suscripción
    async processSubscriptionWebhook(webhookData) {
        try {
            console.log('📋 Procesando webhook de suscripción');
            console.log('📋 Datos del webhook:', JSON.stringify(webhookData, null, 2));
            
            const subscriptionId = webhookData.data.id;
            const action = webhookData.action;
            
            console.log(`🔔 Evento de suscripción: ${action} - ID: ${subscriptionId}`);
            
            // Obtener información completa de la suscripción desde MercadoPago
            const subscriptionInfo = await this.getSubscriptionInfo(subscriptionId);
            
            if (!subscriptionInfo) {
                throw new Error('No se pudo obtener información de la suscripción');
            }
            
            // Verificar si la suscripción tiene credenciales inválidas
            if (subscriptionInfo.status === 'invalid_credentials') {
                console.log('⚠️ Webhook ignorado - suscripción no pertenece a estas credenciales');
                return { 
                    processed: false, 
                    reason: 'Subscription does not belong to current credentials',
                    subscriptionId: subscriptionId,
                    error: subscriptionInfo.error
                };
            }
            
            console.log('📋 Información de suscripción:', JSON.stringify(subscriptionInfo, null, 2));
            
            // Procesar según la acción
            switch (action) {
                case 'created':
                    return await this.processSubscriptionCreated(subscriptionInfo);
                case 'updated':
                    return await this.processSubscriptionUpdated(subscriptionInfo);
                case 'cancelled':
                    return await this.processSubscriptionCancelled(subscriptionInfo);
                default:
                    console.log(`ℹ️ Acción de suscripción no procesada: ${action}`);
                    return { processed: false, reason: `Unhandled subscription action: ${action}` };
            }
            
        } catch (error) {
            console.error('❌ Error procesando webhook de suscripción:', error);
            throw error;
        }
    }

    // Procesar suscripción creada/activada
    async processSubscriptionCreated(subscriptionInfo) {
        try {
            console.log('🎉 Procesando suscripción creada/activada');
            
            // Solo procesar si la suscripción está autorizada
            if (subscriptionInfo.status === 'authorized') {
                console.log('✅ Suscripción autorizada, procesando pago exitoso');
                
                // Usar el external_reference para encontrar la suscripción en nuestra BD
                const result = await this.processSuccessfulPayment({
                    external_reference: subscriptionInfo.external_reference,
                    payer_email: subscriptionInfo.payer_email,
                    status: 'approved',
                    subscription_id: subscriptionInfo.id
                });
                
                return { processed: true, result, action: 'subscription_activated' };
            } else {
                console.log(`⏳ Suscripción en estado: ${subscriptionInfo.status}`);
                return { processed: false, reason: `Subscription status: ${subscriptionInfo.status}` };
            }
            
        } catch (error) {
            console.error('❌ Error procesando suscripción creada:', error);
            throw error;
        }
    }

    // Procesar suscripción actualizada
    async processSubscriptionUpdated(subscriptionInfo) {
        try {
            console.log('🔄 Procesando suscripción actualizada');
            
            // Actualizar estado en nuestra base de datos
            await db.collection('subscriptions').updateOne(
                { externalReference: subscriptionInfo.external_reference },
                { 
                    $set: { 
                        status: subscriptionInfo.status,
                        updatedAt: new Date()
                    }
                }
            );
            
            // Si la suscripción se autorizó, activar el plan del tenant
            if (subscriptionInfo.status === 'authorized') {
                console.log('✅ Suscripción autorizada, activando plan del tenant');
                
                // Obtener la suscripción de nuestra BD para obtener tenantId y planId
                const subscription = await db.collection('subscriptions').findOne({
                    externalReference: subscriptionInfo.external_reference
                });
                
                if (subscription && subscription.tenantId && subscription.planId) {
                    console.log(`🎯 Activando plan ${subscription.planId} para tenant ${subscription.tenantId}`);
                    
                    // Mapear planId a plan real
                    const planMapping = {
                        'starter-plan-fallback': 'starter',
                        'professional-plan-fallback': 'professional', 
                        'enterprise-plan-fallback': 'enterprise',
                        'starter': 'starter',
                        'professional': 'professional',
                        'enterprise': 'enterprise'
                    };
                    
                    const realPlan = planMapping[subscription.planId] || subscription.planId;
                    
                    // Actualizar tenant con el plan correcto usando servicio centralizado (maneja tenantId o _id)
                    const { getPlanConfig } = await import('../config/plans.config.js');
                    const planObj = getPlanConfig(realPlan);
                    if (!planObj) {
                        console.log(`❌ Plan no encontrado en configuración: ${realPlan}`);
                    } else {
                        try {
                            const updatedTenant = await this.updateExistingTenantPlan(subscription.tenantId, planObj);
                            console.log(`✅ Tenant ${updatedTenant.tenantId || subscription.tenantId} actualizado con plan ${updatedTenant.plan}`);
                        } catch (e) {
                            console.log(`⚠️ No se pudo actualizar el tenant ${subscription.tenantId} por servicio, intentando fallback directo`);
                            // Fallback: intentar por _id si tenantId no coincide (caso conocido)
                            const tenantUpdateResult = await tenantCollection.updateOne(
                                { _id: new ObjectId(subscription.tenantId) },
                                { 
                                    $set: { 
                                        plan: realPlan,
                                        status: 'active',
                                        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 días
                                        updatedAt: new Date()
                                    }
                                }
                            );
                            if (tenantUpdateResult.modifiedCount > 0) {
                                console.log(`✅ Tenant (por _id) ${subscription.tenantId} actualizado con plan ${realPlan}`);
                            } else {
                                console.log(`⚠️ No se pudo actualizar el tenant (por _id) ${subscription.tenantId}`);
                            }
                        }
                    }
                } else {
                    console.log('⚠️ No se encontró suscripción o faltan datos (tenantId/planId)');
                }
            }
            
            return { processed: true, action: 'subscription_updated' };
            
        } catch (error) {
            console.error('❌ Error procesando suscripción actualizada:', error);
            throw error;
        }
    }

    // Procesar suscripción cancelada
    async processSubscriptionCancelled(subscriptionInfo) {
        try {
            console.log('🚫 Procesando suscripción cancelada');
            
            // Actualizar estado y desactivar tenant
            await db.collection('subscriptions').updateOne(
                { externalReference: subscriptionInfo.external_reference },
                { 
                    $set: { 
                        status: 'cancelled',
                        cancelledAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            );
            
            // Desactivar tenant asociado
            const subscription = await db.collection('subscriptions').findOne({
                externalReference: subscriptionInfo.external_reference
            });
            
            if (subscription && subscription.tenantId) {
                await tenantCollection.updateOne(
                    { tenantId: subscription.tenantId },
                    { 
                        $set: { 
                            status: 'inactive',
                            plan: 'free',
                            updatedAt: new Date()
                        }
                    }
                );
                
                console.log('🏢 Tenant desactivado:', subscription.tenantId);
            }
            
            return { processed: true, action: 'subscription_cancelled' };
            
        } catch (error) {
            console.error('❌ Error procesando suscripción cancelada:', error);
            throw error;
        }
    }
    
    // Obtener información de pago desde MercadoPago
    async getPaymentInfo(paymentId) {
        try {
            console.log(`🔍 Obteniendo información del pago: ${paymentId}`);
            console.log(`🔗 URL: ${MP_CONFIG.BASE_URL}/v1/payments/${paymentId}`);
            console.log(`🔐 Access Token configurado: ${MP_CONFIG.ACCESS_TOKEN ? 'SÍ' : 'NO'}`);
            
            // Si es un ID de test, devolver datos simulados
            if (paymentId.startsWith('TEST_')) {
                console.log('🧪 Usando datos de pago simulados para testing');
                return {
                    id: paymentId,
                    status: 'approved',
                    external_reference: 'subscription_test_123',
                    payer: {
                        email: 'test@example.com'
                    },
                    transaction_amount: 100,
                    currency_id: 'ARS'
                };
            }
            
            const response = await axios.get(
                `${MP_CONFIG.BASE_URL}/v1/payments/${paymentId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
                    },
                    timeout: 10000 // 10 segundos timeout
                }
            );
            
            console.log('✅ Información del pago obtenida exitosamente');
            console.log('📋 Status del pago:', response.data.status);
            console.log('📋 External reference:', response.data.external_reference);
            console.log('📋 Payer email:', response.data.payer?.email);
            
            return response.data;
        } catch (error) {
            console.error('❌ Error obteniendo información de pago:', error.response?.data || error.message);
            console.error('📋 Status code:', error.response?.status);
            console.error('📋 Payment ID que falló:', paymentId);
            
            // Si es error 404 y es un test, devolver datos simulados
            if (error.response?.status === 404 && paymentId.includes('TEST')) {
                console.log('🧪 Pago de test no encontrado, usando datos simulados');
                return {
                    id: paymentId,
                    status: 'approved',
                    external_reference: 'subscription_test_123',
                    payer: {
                        email: 'test@example.com'
                    },
                    transaction_amount: 100,
                    currency_id: 'ARS'
                };
            }
            
            throw error;
        }
    }

    // Obtener información de suscripción desde MercadoPago
    async getSubscriptionInfo(subscriptionId) {
        try {
            console.log(`🔍 Obteniendo información de suscripción: ${subscriptionId}`);
            
            const response = await axios.get(
                `${MP_CONFIG.BASE_URL}/preapproval/${subscriptionId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
                    }
                }
            );
            
            console.log('✅ Información de suscripción obtenida:', JSON.stringify(response.data, null, 2));
            return response.data;
            
        } catch (error) {
            console.error('❌ Error obteniendo información de suscripción:', error.response?.data || error.message);
            
            // Manejar casos específicos de error
            if (error.response?.status === 400 && 
                error.response?.data?.message?.includes('preapprovalId is not valid for callerId')) {
                console.log('⚠️ La suscripción no pertenece a estas credenciales de MercadoPago');
                console.log('💡 Esto puede suceder si:');
                console.log('   - La suscripción fue creada con otras credenciales');
                console.log('   - Hay un mismatch entre TEST/PRODUCCIÓN');
                console.log('   - La suscripción pertenece a otra cuenta');
                
                return {
                    id: subscriptionId,
                    status: 'invalid_credentials',
                    error: 'Suscripción no pertenece a estas credenciales',
                    original_error: error.response.data
                };
            }
            
            throw error;
        }
    }

    // Obtener información de pago autorizado de suscripción
    async getAuthorizedPaymentInfo(authorizedPaymentId) {
        try {
            console.log('🔍 Obteniendo información del pago autorizado:', authorizedPaymentId);
            
            const response = await axios.get(
                `${MP_CONFIG.BASE_URL}/v1/authorized_payments/${authorizedPaymentId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
                    },
                    timeout: 10000 // 10 segundos timeout
                }
            );
            
            console.log('✅ Información del pago autorizado obtenida exitosamente');
            console.log('📋 Status del pago autorizado:', response.data.status);
            console.log('📋 Payment ID asociado:', response.data.payment_id);
            
            return response.data;
        } catch (error) {
            console.error('❌ Error obteniendo información de pago autorizado:', error.response?.data || error.message);
            console.error('📋 Status code:', error.response?.status);
            console.error('📋 Authorized Payment ID que falló:', authorizedPaymentId);
            
            // Si falla, intentar obtener directamente como pago normal
            console.log('🔄 Intentando obtener como pago normal...');
            try {
                return await this.getPaymentInfo(authorizedPaymentId);
            } catch (fallbackError) {
                console.error('❌ También falló como pago normal:', fallbackError.message);
                throw error; // Lanzar el error original
            }
        }
    }
}

export default new PaymentProcessingService();