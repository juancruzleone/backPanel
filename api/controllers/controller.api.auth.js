import * as services from "../../services/auth.services.js"

import * as tokenService from "../../services/token.service.js"

async function createAccount(req, res) {
  try {
    // Para super_admin, usar el tenantId del header si está disponible, sino null
    const tenantId = req.user.role === "super_admin" ? (req.tenantId || null) : req.user.tenantId
    const result = await services.createAccount(req.body, req.user, tenantId)
    res.status(201).json(result)
  } catch (err) {
    console.error("Error al crear la cuenta:", err)
    res.status(400).json({ error: { message: err.message } })
  }
}

async function login(req, res) {
  try {
    const cuenta = await services.login(req.body, req.tenantId)
    const token = await tokenService.createToken(cuenta)
    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token,
      cuenta,
    })
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
}

// NUEVO CONTROLADOR: Login público para landing (sin validación de planes)
async function publicLogin(req, res) {
  try {
    const cuenta = await services.publicLogin(req.body, req.tenantId)
    const token = await tokenService.createToken(cuenta)
    res.status(200).json({
      message: "Login público exitoso",
      token,
      cuenta,
    })
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
}

async function logout(req, res) {
  const token = req.headers["auth-token"]
  try {
    await tokenService.removeToken(token)
    res.status(200).json({ message: "Sesión cerrada correctamente." })
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
}

async function getAllAccounts(req, res) {
  try {
    // Para super_admin, obtener todas las cuentas sin filtrar por tenant
    const tenantId = req.user.role === "super_admin" ? null : req.user.tenantId
    const cuentas = await services.getAllAccounts(tenantId)
    res.status(200).json(cuentas)
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
}

async function getAccountById(req, res) {
  const { id } = req.params
  try {
    const cuenta = await services.getAccountById(id)
    if (!cuenta) {
      return res.status(404).json({ error: { message: "Usuario no encontrado" } })
    }
    res.status(200).json(cuenta)
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
}

// ✅ FUNCIÓN CORREGIDA: obtener cuentas con rol técnico
async function getTechnicians(req, res) {
  try {
    // Para super_admin, obtener técnicos de todos los tenants
    const tenantId = req.user.role === "super_admin" ? null : req.user.tenantId
    const tecnicos = await services.getAccountsByRole("técnico", tenantId)
    res.status(200).json({
      message: "Técnicos obtenidos exitosamente",
      count: tecnicos.length,
      tecnicos,
    })
  } catch (err) {
    console.error("Error al obtener técnicos:", err)
    res.status(400).json({ error: { message: err.message } })
  }
}

// ✅ FUNCIÓN PARA ELIMINAR USUARIO (super_admin puede eliminar cualquier usuario, admin solo puede eliminar técnicos)
async function deleteAccount(req, res) {
  const { id } = req.params
  const adminUser = req.user
  try {
    // Obtener la cuenta a eliminar
    const cuentaAEliminar = await services.getAccountById(id)
    if (!cuentaAEliminar) {
      return res.status(404).json({ error: { message: "Usuario no encontrado" } })
    }
    
    // Super admin puede eliminar cualquier usuario
    if (adminUser.role === "super_admin") {
      // Solo no puede eliminarse a sí mismo
      if (adminUser._id.toString() === id) {
        return res.status(400).json({ error: { message: "No puedes eliminar tu propia cuenta." } })
      }
    } else {
      // Admin normal no puede eliminar admins ni super_admins
      if (cuentaAEliminar.role === "admin" || cuentaAEliminar.role === "super_admin") {
        return res.status(403).json({ error: { message: "No se puede eliminar un usuario con rol admin." } })
      }
      // No permitir que el admin se elimine a sí mismo
      if (adminUser._id.toString() === id) {
        return res.status(400).json({ error: { message: "No puedes eliminar tu propia cuenta." } })
      }
    }
    
    const result = await services.deleteAccount(id, adminUser)
    res.status(200).json(result)
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
}

// Verificar estado de autenticación
async function verifyAuth(req, res) {
  try {
    // El middleware validateToken ya verificó el token y puso req.user
    if (req.user) {
      res.status(200).json({
        success: true,
        message: 'Token válido',
        user: req.user
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
  } catch (error) {
    console.error('Error en verifyAuth:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export { createAccount, login, publicLogin, logout, getAllAccounts, getAccountById, getTechnicians, deleteAccount, verifyAuth }
