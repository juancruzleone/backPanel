import { db } from "../db.js"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"

const cuentaCollection = db.collection("cuentas")

// Middleware para verificar si el usuario es super admin
export async function isSuperAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: { message: "No se proporcionó token" } })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Verificar que el _id sea válido antes de convertirlo a ObjectId
    if (!decoded._id || !ObjectId.isValid(decoded._id)) {
      return res.status(403).json({ error: { message: "Token inválido: ID de usuario no válido" } })
    }
    
    const user = await cuentaCollection.findOne({ _id: new ObjectId(decoded._id) })

    if (!user || user.role !== "super_admin") {
      return res.status(403).json({ error: { message: "Acceso denegado. Se requiere rol de super administrador." } })
    }

    req.user = user
    next()
  } catch (err) {
    console.error("Error en middleware isSuperAdmin:", err)
    return res.status(403).json({ error: { message: "Token inválido o usuario no autorizado" } })
  }
}

export async function isAdmin(req, res, next) {
  console.log('🔐 [ADMIN] Verificando rol admin...');
  
  // Si validateToken ya estableció req.user, usarlo directamente
  if (req.user) {
    console.log('✅ [ADMIN] Usuario ya validado:', {
      id: req.user._id,
      userName: req.user.userName,
      role: req.user.role,
      tenantId: req.user.tenantId
    });
    
    if (req.user.role === "admin" || req.user.role === "super_admin") {
      console.log('✅ [ADMIN] Rol válido:', req.user.role);
      return next();
    } else {
      console.log('❌ [ADMIN] Rol no autorizado:', req.user.role);
      return res.status(403).json({ 
        error: { message: `Acceso denegado. Rol actual: ${req.user.role}. Se requiere rol de administrador.` } 
      });
    }
  }

  // Fallback: validar token si req.user no está disponible
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    console.log('❌ [ADMIN] Token faltante');
    return res.status(401).json({ error: { message: "No se proporcionó token" } })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log('🔐 [ADMIN] Token decodificado:', { userId: decoded._id });
    
    // Verificar que el _id sea válido antes de convertirlo a ObjectId
    if (!decoded._id || !ObjectId.isValid(decoded._id)) {
      console.log('❌ [ADMIN] ID de usuario inválido');
      return res.status(403).json({ error: { message: "Token inválido: ID de usuario no válido" } })
    }
    
    const user = await cuentaCollection.findOne({ _id: new ObjectId(decoded._id) })
    console.log('🔐 [ADMIN] Usuario encontrado:', user ? { id: user._id, role: user.role } : 'NO ENCONTRADO');

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      console.log('❌ [ADMIN] Usuario no autorizado');
      return res.status(403).json({ error: { message: "Acceso denegado. Se requiere rol de administrador o super administrador." } })
    }

    req.user = user
    console.log('✅ [ADMIN] Acceso permitido');
    next()
  } catch (err) {
    console.error("❌ [ADMIN] Error:", err.message)
    return res.status(403).json({ error: { message: "Token inválido o usuario no autorizado" } })
  }
}

// Middleware para verificar si el usuario es técnico
export async function isTechnician(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: { message: "No se proporcionó token" } })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await cuentaCollection.findOne({ _id: new ObjectId(decoded._id) })

    if (!user || (user.role !== "técnico" && user.role !== "tecnico")) {
      return res.status(403).json({ error: { message: "Acceso denegado. Se requiere rol de técnico." } })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(403).json({ error: { message: "Token inválido o usuario no autorizado" } })
  }
}

// Middleware para verificar si el usuario es admin o técnico
export async function isAdminOrTechnician(req, res, next) {
  console.log('🔐 [ROLE] Verificando rol admin o técnico...');
  
  // Si validateToken ya estableció req.user, usarlo directamente
  if (req.user) {
    console.log('✅ [ROLE] Usuario ya validado:', {
      id: req.user._id,
      userName: req.user.userName,
      role: req.user.role,
      tenantId: req.user.tenantId
    });
    
    if (req.user.role === "admin" || req.user.role === "técnico" || req.user.role === "tecnico" || req.user.role === "super_admin") {
      console.log('✅ [ROLE] Rol válido:', req.user.role);
      return next();
    } else {
      console.log('❌ [ROLE] Rol no autorizado:', req.user.role);
      return res.status(403).json({ 
        error: { message: `Acceso denegado. Rol actual: ${req.user.role}. Se requiere rol de administrador o técnico.` } 
      });
    }
  }

  // Fallback: validar token si req.user no está disponible
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    console.log('❌ [ROLE] Token faltante');
    return res.status(401).json({ error: { message: "No se proporcionó token" } })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log('🔐 [ROLE] Token decodificado:', { userId: decoded._id });
    
    const user = await cuentaCollection.findOne({ _id: new ObjectId(decoded._id) })
    console.log('🔐 [ROLE] Usuario encontrado:', user ? { id: user._id, role: user.role } : 'NO ENCONTRADO');

    if (!user || (user.role !== "admin" && user.role !== "técnico" && user.role !== "tecnico" && user.role !== "super_admin")) {
      console.log('❌ [ROLE] Usuario no autorizado');
      return res
        .status(403)
        .json({ error: { message: "Acceso denegado. Se requiere rol de administrador o técnico." } })
    }

    req.user = user
    console.log('✅ [ROLE] Acceso permitido');
    next()
  } catch (err) {
    console.error('❌ [ROLE] Error:', err.message);
    return res.status(403).json({ error: { message: "Token inválido o usuario no autorizado" } })
  }
}

// Middleware para verificar si el usuario es técnico y solo puede leer
export async function isTechnicianReadOnly(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: { message: "No se proporcionó token" } })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await cuentaCollection.findOne({ _id: new ObjectId(decoded._id) })

    if (!user || (user.role !== "técnico" && user.role !== "tecnico")) {
      return res.status(403).json({ error: { message: "Acceso denegado. Se requiere rol de técnico." } })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(403).json({ error: { message: "Token inválido o usuario no autorizado" } })
  }
}

// Middleware para verificar si el usuario es cliente
export async function isClient(req, res, next) {
  console.log('🔐 [CLIENT] Verificando rol cliente...');
  
  // Si validateToken ya estableció req.user, usarlo directamente
  if (req.user) {
    console.log('✅ [CLIENT] Usuario ya validado:', {
      id: req.user._id,
      userName: req.user.userName,
      role: req.user.role,
      tenantId: req.user.tenantId
    });
    
    if (req.user.role === "cliente") {
      console.log('✅ [CLIENT] Rol válido:', req.user.role);
      return next();
    } else {
      console.log('❌ [CLIENT] Rol no autorizado:', req.user.role);
      return res.status(403).json({ 
        error: { message: `Acceso denegado. Rol actual: ${req.user.role}. Se requiere rol de cliente.` } 
      });
    }
  }

  // Fallback: validar token si req.user no está disponible
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    console.log('❌ [CLIENT] Token faltante');
    return res.status(401).json({ error: { message: "No se proporcionó token" } })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log('🔐 [CLIENT] Token decodificado:', { userId: decoded._id });
    
    const user = await cuentaCollection.findOne({ _id: new ObjectId(decoded._id) })
    console.log('🔐 [CLIENT] Usuario encontrado:', user ? { id: user._id, role: user.role } : 'NO ENCONTRADO');

    if (!user || user.role !== "cliente") {
      console.log('❌ [CLIENT] Usuario no autorizado');
      return res.status(403).json({ error: { message: "Acceso denegado. Se requiere rol de cliente." } })
    }

    req.user = user
    console.log('✅ [CLIENT] Acceso permitido');
    next()
  } catch (err) {
    console.error('❌ [CLIENT] Error:', err.message);
    return res.status(403).json({ error: { message: "Token inválido o usuario no autorizado" } })
  }
}

// Middleware para verificar si el usuario es admin, técnico o cliente
export async function isAdminOrTechnicianOrClient(req, res, next) {
  console.log('🔐 [ROLE] Verificando rol admin, técnico o cliente...');
  
  // Si validateToken ya estableció req.user, usarlo directamente
  if (req.user) {
    console.log('✅ [ROLE] Usuario ya validado:', {
      id: req.user._id,
      userName: req.user.userName,
      role: req.user.role,
      tenantId: req.user.tenantId
    });
    
    if (req.user.role === "admin" || req.user.role === "técnico" || req.user.role === "tecnico" || req.user.role === "super_admin" || req.user.role === "cliente") {
      console.log('✅ [ROLE] Rol válido:', req.user.role);
      return next();
    } else {
      console.log('❌ [ROLE] Rol no autorizado:', req.user.role);
      return res.status(403).json({ 
        error: { message: `Acceso denegado. Rol actual: ${req.user.role}. Se requiere rol de administrador, técnico o cliente.` } 
      });
    }
  }

  // Fallback: validar token si req.user no está disponible
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    console.log('❌ [ROLE] Token faltante');
    return res.status(401).json({ error: { message: "No se proporcionó token" } })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log('🔐 [ROLE] Token decodificado:', { userId: decoded._id });
    
    const user = await cuentaCollection.findOne({ _id: new ObjectId(decoded._id) })
    console.log('🔐 [ROLE] Usuario encontrado:', user ? { id: user._id, role: user.role } : 'NO ENCONTRADO');

    if (!user || (user.role !== "admin" && user.role !== "técnico" && user.role !== "tecnico" && user.role !== "super_admin" && user.role !== "cliente")) {
      console.log('❌ [ROLE] Usuario no autorizado');
      return res
        .status(403)
        .json({ error: { message: "Acceso denegado. Se requiere rol de administrador, técnico o cliente." } })
    }

    req.user = user
    console.log('✅ [ROLE] Acceso permitido');
    next()
  } catch (err) {
    console.error('❌ [ROLE] Error:', err.message);
    return res.status(403).json({ error: { message: "Token inválido o usuario no autorizado" } })
  }
}
