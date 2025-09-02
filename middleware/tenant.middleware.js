import { db } from "../db.js"
import { getTenantBySubdomain, getTenantByTenantId } from "../services/tenants.services.js"
import jwt from "jsonwebtoken"

const tenantCollection = db.collection("tenants")

// Caché en memoria para tenants (con TTL)
const tenantCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

// Función para limpiar caché expirado
function cleanExpiredCache() {
  const now = Date.now()
  for (const [key, value] of tenantCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      tenantCache.delete(key)
    }
  }
}

// Limpiar caché cada minuto
setInterval(cleanExpiredCache, 60 * 1000)

// Función para obtener tenant del caché o base de datos
async function getTenantFromCache(tenantId) {
  const cached = tenantCache.get(tenantId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  
  const tenant = await getTenantByTenantId(tenantId)
  if (tenant) {
    tenantCache.set(tenantId, {
      data: tenant,
      timestamp: Date.now()
    })
  }
  
  return tenant
}

// Middleware para identificar tenant por subdominio
export async function identifyTenantBySubdomain(req, res, next) {
  try {
    const host = req.headers.host || req.headers['x-forwarded-host']
    
    if (!host) {
      return res.status(400).json({ error: { message: "Host header requerido" } })
    }

    // Extraer subdominio del host
    const subdomain = host.split('.')[0]
    
    // Ignorar subdominios comunes
    if (['www', 'api', 'admin', 'app'].includes(subdomain)) {
      return res.status(400).json({ error: { message: "Subdominio no válido" } })
    }

    // Buscar tenant por subdominio
    const tenant = await getTenantBySubdomain(subdomain)
    
    if (!tenant || tenant.status !== "active") {
      return res.status(404).json({ error: { message: "Tenant no encontrado o inactivo" } })
    }

    req.tenant = tenant
    req.tenantId = tenant.tenantId
    next()
  } catch (error) {
    console.error("Error identificando tenant por subdominio:", error)
    res.status(404).json({ error: { message: "Tenant no encontrado" } })
  }
}

// Middleware para identificar tenant por header X-Tenant-ID
export async function identifyTenantByHeader(req, res, next) {
  try {
    const tenantId = req.headers['x-tenant-id']
    
    if (!tenantId) {
      return res.status(400).json({ error: { message: "X-Tenant-ID header requerido" } })
    }

    // Usar caché para obtener tenant
    const tenant = await getTenantFromCache(tenantId)
    
    if (!tenant || tenant.status !== "active") {
      return res.status(404).json({ error: { message: "Tenant no encontrado o inactivo" } })
    }

    req.tenant = tenant
    req.tenantId = tenant.tenantId
    next()
  } catch (error) {
    console.error("Error identificando tenant por header:", error)
    res.status(404).json({ error: { message: "Tenant no encontrado" } })
  }
}

// Middleware para identificar tenant por token JWT
export async function identifyTenantByToken(req, res, next) {
  try {
    // Para super_admin, no necesitamos identificar tenant específico
    if (req.user && req.user.role === "super_admin") {
      return next()
    }

    // Si ya tenemos el usuario del token, usar su tenantId
    if (req.user && req.user.tenantId) {
      const tenant = await getTenantFromCache(req.user.tenantId)
      
      if (!tenant || tenant.status !== "active") {
        return res.status(404).json({ error: { message: "Tenant no encontrado o inactivo" } })
      }

      req.tenant = tenant
      req.tenantId = tenant.tenantId
      return next()
    }

    // Si no tenemos usuario, intentar obtener del token directamente
    const token = req.headers.authorization?.split(" ")[1]
    
    if (!token) {
      return res.status(401).json({ error: { message: "Token de autorización requerido" } })
    }

    // Verificar token y obtener usuario
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    if (!decoded.tenantId) {
      return res.status(400).json({ error: { message: "Token no contiene información de tenant" } })
    }

    // Buscar tenant por tenantId del token usando caché
    const tenant = await getTenantFromCache(decoded.tenantId)
    
    if (!tenant || tenant.status !== "active") {
      return res.status(404).json({ error: { message: "Tenant no encontrado o inactivo" } })
    }

    req.tenant = tenant
    req.tenantId = tenant.tenantId
    next()
  } catch (error) {
    console.error("Error identificando tenant por token:", error)
    res.status(401).json({ error: { message: "Token inválido o tenant no encontrado" } })
  }
}

// Middleware para verificar límites del plan del tenant
export async function checkTenantLimits(req, res, next) {
  try {
    if (!req.tenant) {
      return res.status(400).json({ error: { message: "Tenant no identificado" } })
    }

    // Verificar si el tenant está activo
    if (req.tenant.status !== "active") {
      return res.status(403).json({ error: { message: "Tenant inactivo" } })
    }

    // Verificar límites según el plan
    const { plan, maxUsers, maxAssets } = req.tenant
    
    // Aquí puedes agregar lógica adicional para verificar límites específicos
    // Por ejemplo, verificar número de usuarios activos, etc.
    
    req.tenantLimits = {
      maxUsers,
      maxAssets,
      plan
    }
    
    next()
  } catch (error) {
    console.error("Error verificando límites del tenant:", error)
    res.status(500).json({ error: { message: "Error interno del servidor" } })
  }
}

// Middleware para inyectar tenantId en queries de MongoDB
export function injectTenantId(req, res, next) {
  // Para super_admin, no necesitamos inyectar tenantId específico
  if (req.user && req.user.role === "super_admin") {
    return next()
  }

  // Para otros usuarios, inyectar el tenantId en la query
  if (req.tenantId) {
    req.query.tenantId = req.tenantId
  }
  
  next()
}

// Función para limpiar caché de un tenant específico
export function clearTenantCache(tenantId) {
  tenantCache.delete(tenantId)
}

// Función para limpiar todo el caché
export function clearAllTenantCache() {
  tenantCache.clear()
}

// Middleware para verificar si el usuario pertenece al tenant correcto
export async function verifyUserTenant(req, res, next) {
  try {
    if (!req.user || !req.tenantId) {
      return res.status(400).json({ error: { message: "Usuario o tenant no identificado" } })
    }

    // Para super_admin, permitir acceso a cualquier tenant
    if (req.user.role === "super_admin") {
      return next()
    }

    // Verificar que el usuario pertenezca al tenant
    if (req.user.tenantId !== req.tenantId) {
      return res.status(403).json({ error: { message: "Acceso denegado. Usuario no pertenece a este tenant." } })
    }

    next()
  } catch (error) {
    console.error("Error verificando usuario del tenant:", error)
    res.status(500).json({ error: { message: "Error interno del servidor" } })
  }
} 