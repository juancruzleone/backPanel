import axios from 'axios';
import { db } from '../db.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
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
            const subscription = await db.collection('subscriptions').findOne({
                externalReference: subscriptionId
            });
            
            if (!subscription) {
                throw new Error('Suscripción no encontrada en base de datos');
            }
            
            // 3. Obtener el plan de suscripción
            const plan = await db.collection('subscriptionplans').findOne({
                _id: new ObjectId(subscription.subscriptionPlan)
            });
            
            if (!plan) {
                throw new Error('Plan de suscripción no encontrado');
            }
            
            // 4. Obtener datos del cliente
            const client = await db.collection('clients').findOne({
                _id: new ObjectId(subscription.client)
            });
            
            if (!client) {
                throw new Error('Cliente no encontrado');
            }
            
            // 5. Crear tenant para el cliente
            const tenantData = await this.createTenantForClient(client, plan);
            
            // 6. Crear usuario admin para el tenant
            const adminUser = await this.createAdminUser(client, tenantData.tenantId, subscription.payerEmail);
            
            // 7. Actualizar suscripción con información del tenant
            await this.linkSubscriptionToTenant(subscription._id, tenantData.tenantId, adminUser._id);
            
            // 8. Actualizar estado de la suscripción usando las funciones importadas
            // Cambiar esta línea si subscriptionService no tiene este método
            // await subscriptionService.syncWithMercadoPago(subscription._id.toString(), tenantData.tenantId);
            
            return {
                success: true,
                tenant: tenantData,
                adminUser: adminUser,
                subscription: subscription,
                plan: plan
            };
            
        } catch (error) {
            console.error('❌ Error procesando pago exitoso:', error);
            throw new Error(`Error procesando pago: ${error.message}`);
        }
    }
    
    // Crear tenant para el cliente que pagó
    async createTenantForClient(client, plan) {
        try {
            const tenantId = uuidv4();
            
            // Generar subdominio único basado en el nombre del cliente
            let subdomain = this.generateSubdomain(client.name || client.email);
            
            // Verificar que el subdominio sea único
            let counter = 1;
            while (await this.isSubdomainTaken(subdomain)) {
                subdomain = `${this.generateSubdomain(client.name || client.email)}-${counter}`;
                counter++;
            }
            
            // Mapear características del plan a configuración del tenant
            const tenantFeatures = this.mapPlanToTenantFeatures(plan);
            
            const newTenant = {
                _id: new ObjectId(),
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
            
            const result = await tenantCollection.insertOne(newTenant);
            
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
    async createAdminUser(client, tenantId, payerEmail) {
        try {
            // Generar contraseña temporal
            const tempPassword = this.generateTempPassword();
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            
            // Generar username único
            let username = this.generateUsername(client.name || payerEmail);
            let counter = 1;
            while (await this.isUsernameTaken(username, tenantId)) {
                username = `${this.generateUsername(client.name || payerEmail)}_${counter}`;
                counter++;
            }
            
            const adminUser = {
                _id: new ObjectId(),
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
            
            const result = await cuentaCollection.insertOne(adminUser);
            
            // Actualizar estadísticas del tenant
            await tenantCollection.updateOne(
                { tenantId },
                { $inc: { "stats.totalUsers": 1 } }
            );
            
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
        const existing = await tenantCollection.findOne({ subdomain });
        return !!existing;
    }
    
    async isUsernameTaken(username, tenantId) {
        const existing = await cuentaCollection.findOne({ userName: username, tenantId });
        return !!existing;
    }
    
    // Enviar email de bienvenida (placeholder)
    async sendWelcomeEmail(adminUser, tempPassword) {
        try {
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
            console.log('🔔 Webhook recibido de MercadoPago:', webhookData);
            
            // Verificar que sea un webhook de pago
            if (webhookData.type !== 'payment') {
                console.log('ℹ️ Webhook ignorado - no es de tipo payment');
                return { processed: false, reason: 'Not a payment webhook' };
            }
            
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
            console.error('❌ Error procesando webhook:', error);
            throw error;
        }
    }
    
    // Obtener información de pago desde MercadoPago
    async getPaymentInfo(paymentId) {
        try {
            const response = await axios.get(
                `${MP_CONFIG.BASE_URL}/v1/payments/${paymentId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`
                    }
                }
            );
            
            return response.data;
        } catch (error) {
            console.error('❌ Error obteniendo información de pago:', error);
            throw error;
        }
    }
}

export default new PaymentProcessingService();