import * as services from "../../services/tenants.services.js"

// Crear nuevo tenant
async function createTenant(req, res) {
  try {
    const result = await services.createTenant(req.body, req.user)
    res.status(201).json({
      message: "Tenant creado exitosamente",
      tenant: result.tenant,
      adminCredentials: result.adminCredentials
    })
  } catch (err) {
    console.error("Error al crear tenant:", err)
    res.status(400).json({ error: { message: err.message } })
  }
}

// Obtener todos los tenants
async function getAllTenants(req, res) {
  try {
    const filters = {
      status: req.query.status,
      plan: req.query.plan
    }
    
    const tenants = await services.getAllTenants(req.user, filters)
    res.status(200).json({
      message: "Tenants obtenidos exitosamente",
      count: tenants.length,
      tenants
    })
  } catch (err) {
    console.error("Error al obtener tenants:", err)
    res.status(400).json({ error: { message: err.message } })
  }
}

// Obtener tenant por ID
async function getTenantById(req, res) {
  try {
    const { id } = req.params
    const tenant = await services.getTenantById(id, req.user)
    res.status(200).json({
      message: "Tenant obtenido exitosamente",
      tenant
    })
  } catch (err) {
    console.error("Error al obtener tenant:", err)
    res.status(400).json({ error: { message: err.message } })
  }
}

// Obtener tenant por subdominio (público)
async function getTenantBySubdomain(req, res) {
  try {
    const { subdomain } = req.params
    const tenant = await services.getTenantBySubdomain(subdomain)
    res.status(200).json({
      message: "Tenant obtenido exitosamente",
      tenant: {
        name: tenant.name,
        subdomain: tenant.subdomain,
        plan: tenant.plan,
        status: tenant.status
      }
    })
  } catch (err) {
    console.error("Error al obtener tenant por subdominio:", err)
    res.status(404).json({ error: { message: "Tenant no encontrado" } })
  }
}

// Actualizar tenant
async function updateTenant(req, res) {
  try {
    const { id } = req.params
    const result = await services.updateTenant(id, req.body, req.user)
    res.status(200).json(result)
  } catch (err) {
    console.error("Error al actualizar tenant:", err)
    res.status(400).json({ error: { message: err.message } })
  }
}

// Eliminar tenant
async function deleteTenant(req, res) {
  try {
    const { id } = req.params
    const result = await services.deleteTenant(id, req.user)
    res.status(200).json(result)
  } catch (err) {
    console.error("Error al eliminar tenant:", err)
    res.status(400).json({ error: { message: err.message } })
  }
}

// Obtener estadísticas de un tenant
async function getTenantStats(req, res) {
  try {
    const { id } = req.params
    const stats = await services.getTenantStats(id, req.user)
    res.status(200).json({
      message: "Estadísticas obtenidas exitosamente",
      ...stats
    })
  } catch (err) {
    console.error("Error al obtener estadísticas:", err)
    res.status(400).json({ error: { message: err.message } })
  }
}

// Obtener estadísticas globales (solo super admin)
async function getGlobalStats(req, res) {
  try {
    const tenants = await services.getAllTenants(req.user)
    
    const stats = {
      totalTenants: tenants.length,
      activeTenants: tenants.filter(t => t.status === "active").length,
      suspendedTenants: tenants.filter(t => t.status === "suspended").length,
      cancelledTenants: tenants.filter(t => t.status === "cancelled").length,
      plans: {
        basic: tenants.filter(t => t.plan === "basic").length,
        professional: tenants.filter(t => t.plan === "professional").length,
        enterprise: tenants.filter(t => t.plan === "enterprise").length
      },
      totalUsers: tenants.reduce((sum, t) => sum + (t.stats?.totalUsers || 0), 0),
      totalAssets: tenants.reduce((sum, t) => sum + (t.stats?.totalAssets || 0), 0),
      totalWorkOrders: tenants.reduce((sum, t) => sum + (t.stats?.totalWorkOrders || 0), 0)
    }
    
    res.status(200).json({
      message: "Estadísticas globales obtenidas exitosamente",
      stats
    })
  } catch (err) {
    console.error("Error al obtener estadísticas globales:", err)
    res.status(400).json({ error: { message: err.message } })
  }
}

// Forzar actualización de estadísticas de un tenant
async function forceUpdateTenantStats(req, res) {
  try {
    const { id } = req.params
    const result = await services.forceUpdateTenantStats(id)
    res.status(200).json(result)
  } catch (err) {
    console.error("Error al forzar actualización de estadísticas:", err)
    res.status(400).json({ error: { message: err.message } })
  }
}

// Verificar si el tenant ya tiene un plan activo
async function checkActivePlan(req, res) {
  try {
    const { email } = req.query
    
    if (!email) {
      return res.status(400).json({ 
        error: { message: "Email es requerido" } 
      })
    }
    
    const result = await services.checkTenantActivePlan(email)
    
    res.status(200).json({
      success: true,
      ...result
    })
  } catch (err) {
    console.error("Error verificando plan activo:", err)
    res.status(400).json({ error: { message: err.message } })
  }
}

export {
  createTenant,
  getAllTenants,
  getTenantById,
  getTenantBySubdomain,
  updateTenant,
  deleteTenant,
  getTenantStats,
  getGlobalStats,
  forceUpdateTenantStats,
  checkActivePlan
} 