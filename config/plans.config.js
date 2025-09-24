// Configuración de planes y límites para el sistema multi-tenant
// Actualizado para coincidir EXACTAMENTE con la tabla de comparación del frontend
export const PLANS_CONFIG = {
  starter: {
    name: "Starter",
    price: 15,
    yearlyPrice: 12.75, // 15% descuento
    maxUsers: 3, // 3 usuarios (frontend)
    maxFacilities: 2, // 2 instalaciones (frontend)
    maxAssets: 6, // 6 activos (frontend)
    maxFormTemplates: 6, // 6 plantillas de formulario (frontend)
    maxWorkOrders: 100, // 100/mes órdenes de trabajo (frontend)
    supportType: "email", // Email (frontend)
    languageSupport: true, // ✓ (frontend)
    features: {
      workOrders: true,
      assets: true,
      reports: true,
      pdfGeneration: true,
      analytics: true, // ✓ (frontend)
      apiAccess: true, // ✓ (frontend)
      customBranding: false,
      prioritySupport: false,
      advancedAnalytics: false,
      integrations: false
    },
    limits: {
      storageGB: 5,
      apiCallsPerMonth: 1000,
      pdfGenerationsPerMonth: 100
    }
  },
  
  professional: {
    name: "Professional",
    price: 75000,
    yearlyPrice: 63750, // 15% descuento
    maxUsers: 15, // 15 usuarios (frontend)
    maxFacilities: 20, // 20 instalaciones (frontend)
    maxAssets: 30, // 30 activos (frontend)
    maxFormTemplates: 30, // 30 plantillas de formulario (frontend)
    maxWorkOrders: 500, // 500/mes órdenes de trabajo (frontend)
    supportType: "priority", // Prioritario (frontend)
    languageSupport: true, // ✓ (frontend)
    features: {
      workOrders: true,
      assets: true,
      reports: true,
      pdfGeneration: true,
      analytics: true, // ✓ (frontend)
      apiAccess: true, // ✓ (frontend)
      customBranding: true,
      prioritySupport: true,
      advancedAnalytics: true,
      integrations: true
    },
    limits: {
      storageGB: 25,
      apiCallsPerMonth: 10000,
      pdfGenerationsPerMonth: 1000
    }
  },
  
  enterprise: {
    name: "Enterprise",
    price: 120000,
    yearlyPrice: 102000, // 15% descuento
    maxUsers: 30, // 30 usuarios (frontend)
    maxFacilities: 40, // 40 instalaciones (frontend)
    maxAssets: 60, // 60 activos (frontend)
    maxFormTemplates: 60, // 60 plantillas de formulario (frontend)
    maxWorkOrders: 1000, // 1.000/mes órdenes de trabajo (frontend)
    supportType: "24/7", // 24/7 (frontend)
    languageSupport: true, // ✓ (frontend)
    features: {
      workOrders: true,
      assets: true,
      reports: true,
      pdfGeneration: true,
      analytics: true, // ✓ (frontend)
      apiAccess: true, // ✓ (frontend)
      customBranding: true,
      prioritySupport: true,
      advancedAnalytics: true,
      integrations: true,
      whiteLabel: true,
      dedicatedSupport: true
    },
    limits: {
      storageGB: 100, // 100GB para enterprise
      apiCallsPerMonth: 100000, // 100k llamadas API
      pdfGenerationsPerMonth: 10000 // 10k PDFs
    }
  },
  
  // Planes anuales específicos - mantienen las mismas características que los mensuales
  'starter-yearly': {
    name: "Starter Anual",
    price: 12.75, // 15% descuento anual
    frequency: 'yearly',
    maxUsers: 3, // 3 usuarios (frontend)
    maxFacilities: 2, // 2 instalaciones (frontend)
    maxAssets: 6, // 6 activos (frontend)
    maxFormTemplates: 6, // 6 plantillas de formulario (frontend)
    maxWorkOrders: 100, // 100/mes órdenes de trabajo (frontend)
    supportType: "email", // Email (frontend)
    languageSupport: true, // ✓ (frontend)
    features: {
      workOrders: true,
      assets: true,
      reports: true,
      pdfGeneration: true,
      analytics: true, // ✓ (frontend)
      apiAccess: true, // ✓ (frontend)
      customBranding: false,
      prioritySupport: false,
      advancedAnalytics: false,
      integrations: false
    },
    limits: {
      storageGB: 5,
      apiCallsPerMonth: 1000,
      pdfGenerationsPerMonth: 100
    }
  },
  
  'professional-yearly': {
    name: "Professional Anual",
    price: 63750, // 15% descuento anual
    frequency: 'yearly',
    maxUsers: 15, // 15 usuarios (frontend)
    maxFacilities: 20, // 20 instalaciones (frontend)
    maxAssets: 30, // 30 activos (frontend)
    maxFormTemplates: 30, // 30 plantillas de formulario (frontend)
    maxWorkOrders: 500, // 500/mes órdenes de trabajo (frontend)
    supportType: "priority", // Prioritario (frontend)
    languageSupport: true, // ✓ (frontend)
    features: {
      workOrders: true,
      assets: true,
      reports: true,
      pdfGeneration: true,
      analytics: true, // ✓ (frontend)
      apiAccess: true, // ✓ (frontend)
      customBranding: true,
      prioritySupport: true,
      advancedAnalytics: true,
      integrations: true
    },
    limits: {
      storageGB: 25,
      apiCallsPerMonth: 10000,
      pdfGenerationsPerMonth: 1000
    }
  },
  
  'enterprise-yearly': {
    name: "Enterprise Anual",
    price: 102000, // 15% descuento anual
    frequency: 'yearly',
    maxUsers: 30, // 30 usuarios (frontend)
    maxFacilities: 40, // 40 instalaciones (frontend)
    maxAssets: 60, // 60 activos (frontend)
    maxFormTemplates: 60, // 60 plantillas de formulario (frontend)
    maxWorkOrders: 1000, // 1.000/mes órdenes de trabajo (frontend)
    supportType: "24/7", // 24/7 (frontend)
    languageSupport: true, // ✓ (frontend)
    features: {
      workOrders: true,
      assets: true,
      reports: true,
      pdfGeneration: true,
      analytics: true, // ✓ (frontend)
      apiAccess: true, // ✓ (frontend)
      customBranding: true,
      prioritySupport: true,
      advancedAnalytics: true,
      integrations: true,
      whiteLabel: true,
      dedicatedSupport: true
    },
    limits: {
      storageGB: 100, // 100GB para enterprise
      apiCallsPerMonth: 100000, // 100k llamadas API
      pdfGenerationsPerMonth: 10000 // 10k PDFs
    }
  },

  // Alias para compatibilidad con nombres anteriores
  basic: {
    name: "Starter",
    price: 15,
    yearlyPrice: 12.75,
    maxUsers: 3, // 3 usuarios (frontend)
    maxFacilities: 2, // 2 instalaciones (frontend)
    maxAssets: 6, // 6 activos (frontend)
    maxFormTemplates: 6, // 6 plantillas de formulario (frontend)
    maxWorkOrders: 100, // 100/mes órdenes de trabajo (frontend)
    supportType: "email",
    languageSupport: true,
    features: {
      workOrders: true,
      assets: true,
      reports: true,
      pdfGeneration: true,
      analytics: true,
      apiAccess: true,
      customBranding: false,
      prioritySupport: false,
      advancedAnalytics: false,
      integrations: false
    },
    limits: {
      storageGB: 5,
      apiCallsPerMonth: 1000,
      pdfGenerationsPerMonth: 100
    }
  },
  'basic-yearly': {
    name: "Starter Anual",
    price: 12.75,
    frequency: 'yearly',
    maxUsers: 3, // 3 usuarios (frontend)
    maxFacilities: 2, // 2 instalaciones (frontend)
    maxAssets: 6, // 6 activos (frontend)
    maxFormTemplates: 6, // 6 plantillas de formulario (frontend)
    maxWorkOrders: 100, // 100/mes órdenes de trabajo (frontend)
    supportType: "email",
    languageSupport: true,
    features: {
      workOrders: true,
      assets: true,
      reports: true,
      pdfGeneration: true,
      analytics: true,
      apiAccess: true,
      customBranding: false,
      prioritySupport: false,
      advancedAnalytics: false,
      integrations: false
    },
    limits: {
      storageGB: 5,
      apiCallsPerMonth: 1000,
      pdfGenerationsPerMonth: 100
    }
  }
}

// Función para obtener configuración de un plan
export function getPlanConfig(planName) {
  return PLANS_CONFIG[planName] || PLANS_CONFIG.basic
}

// Función para verificar si un plan tiene una característica específica
export function hasFeature(planName, feature) {
  const plan = getPlanConfig(planName)
  return plan.features[feature] || false
}

// Función para obtener el límite de un recurso específico
export function getResourceLimit(planName, resource) {
  const plan = getPlanConfig(planName)
  return plan.limits[resource] || 0
}

// Función para verificar si se puede crear un recurso adicional
export function canCreateResource(planName, resourceType, currentCount) {
  const plan = getPlanConfig(planName)
  const limit = plan[`max${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`] || 0
  return currentCount < limit
}

// Función para obtener estadísticas de uso
export function getUsageStats(planName, currentUsage) {
  const plan = getPlanConfig(planName)
  const stats = {}
  
  Object.keys(plan.limits).forEach(limit => {
    const max = plan.limits[limit]
    const current = currentUsage[limit] || 0
    stats[limit] = {
      current,
      max,
      percentage: Math.round((current / max) * 100)
    }
  })
  
  return stats
} 