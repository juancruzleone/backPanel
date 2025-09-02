// Configuración de planes y límites para el sistema multi-tenant
export const PLANS_CONFIG = {
  basic: {
    name: "Básico",
    price: 29.99,
    maxUsers: 10,
    maxAssets: 100,
    maxWorkOrders: 500,
    features: {
      workOrders: true,
      assets: true,
      reports: true,
      pdfGeneration: true,
      apiAccess: false,
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
    name: "Profesional",
    price: 79.99,
    maxUsers: 50,
    maxAssets: 1000,
    maxWorkOrders: 5000,
    features: {
      workOrders: true,
      assets: true,
      reports: true,
      pdfGeneration: true,
      apiAccess: true,
      customBranding: true,
      prioritySupport: false,
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
    name: "Empresarial",
    price: 199.99,
    maxUsers: 1000,
    maxAssets: 10000,
    maxWorkOrders: 50000,
    features: {
      workOrders: true,
      assets: true,
      reports: true,
      pdfGeneration: true,
      apiAccess: true,
      customBranding: true,
      prioritySupport: true,
      advancedAnalytics: true,
      integrations: true,
      whiteLabel: true,
      dedicatedSupport: true
    },
    limits: {
      storageGB: 100,
      apiCallsPerMonth: 100000,
      pdfGenerationsPerMonth: 10000
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