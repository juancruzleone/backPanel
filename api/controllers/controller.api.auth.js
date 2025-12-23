import * as services from "../../services/auth.services.js"
import * as tokenService from "../../services/token.service.js"
import * as profileSchemas from "../../schemas/profile.schema.js"

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
  const adminUser = req.user
  const tenantId = req.tenantId

  try {
    const cuenta = await services.getAccountById(id)
    if (!cuenta) {
      return res.status(404).json({ error: { message: "Usuario no encontrado" } })
    }

    // Verificar que el admin solo pueda ver cuentas de su mismo tenant
    // (excepto super_admin que puede ver cualquier cuenta)
    if (adminUser.role !== "super_admin" && cuenta.tenantId !== tenantId) {
      return res.status(403).json({
        error: { message: "No tienes permisos para ver esta cuenta" }
      })
    }

    res.status(200).json(cuenta)
  } catch (err) {
    res.status(400).json({ error: { message: err.message } })
  }
}

// ✅ FUNCIÓN CORREGIDA: obtener cuentas con rol técnico
async function getTechnicians(req, res) {
  try {
    console.log("🔍 [TECNICOS] Obteniendo técnicos...")
    console.log("🔍 [TECNICOS] Usuario:", { id: req.user._id, role: req.user.role, tenantId: req.user.tenantId })
    console.log("🔍 [TECNICOS] TenantId del middleware:", req.tenantId)

    // Usar el tenantId del middleware identifyTenantByHeader
    const tenantId = req.user.role === "super_admin" ? null : req.tenantId
    console.log("🔍 [TECNICOS] Buscando en tenantId:", tenantId)

    const tecnicos = await services.getAccountsByRole("técnico", tenantId)
    console.log("✅ [TECNICOS] Técnicos encontrados:", tecnicos.length)

    res.status(200).json({
      message: "Técnicos obtenidos exitosamente",
      count: tecnicos.length,
      tecnicos,
    })
  } catch (err) {
    console.error("❌ [TECNICOS] Error al obtener técnicos:", err)
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

// Obtener perfil completo del usuario con información del tenant y suscripción
async function getProfile(req, res) {
  try {
    const userId = req.user._id;
    const profile = await services.getUserProfile(userId);

    res.status(200).json({
      success: true,
      message: 'Perfil obtenido exitosamente',
      profile
    });
  } catch (error) {
    console.error('Error en getProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el perfil',
      error: error.message
    });
  }
}

// NUEVO CONTROLADOR: Crear cuenta demo completa (SOLO SUPER ADMIN)
async function createDemoAccount(req, res) {
  try {
    console.log('🎭 [DEMO] Iniciando creación de cuenta demo', {
      superAdmin: req.user.userName,
      data: {
        email: req.body.email,
        companyName: req.body.companyName,
        plan: req.body.plan || 'professional',
        demoDurationDays: req.body.demoDurationDays || 30
      }
    });

    const result = await services.createDemoAccount(req.body, req.user);

    console.log('✅ [DEMO] Cuenta demo creada exitosamente', {
      tenantId: result.tenant.tenantId,
      userName: result.user.userName
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('❌ [DEMO] Error al crear cuenta demo:', error.message);
    res.status(400).json({
      success: false,
      error: { message: error.message }
    });
  }
}

// Actualizar perfil del usuario autenticado
async function updateProfile(req, res) {
  try {
    // Validar datos con schema
    await profileSchemas.updateProfile.validate(req.body, { abortEarly: false });

    const userId = req.user._id;
    const result = await services.updateUserProfile(userId, req.body);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error en updateProfile:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

async function updatePassword(req, res) {
  try {
    // Validar datos con schema
    await profileSchemas.updatePassword.validate(req.body, { abortEarly: false });

    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    const result = await services.updateUserPassword(userId, currentPassword, newPassword);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error en updatePassword:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

// Solicitar código para cambio de contraseña
async function requestPasswordChange(req, res) {
  try {
    const userId = req.user._id;
    const result = await services.requestPasswordChange(userId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error en requestPasswordChange:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

// Confirmar cambio de contraseña con código
async function confirmPasswordChange(req, res) {
  try {
    const userId = req.user._id;
    const { code, newPassword } = req.body;

    if (!code || !newPassword) {
      throw new Error("Código y nueva contraseña son requeridos");
    }

    const result = await services.confirmPasswordChange(userId, code, newPassword);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error en confirmPasswordChange:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

async function updateTechnician(req, res) {
  try {
    // Validar datos con schema
    await profileSchemas.updateTechnician.validate(req.body, { abortEarly: false });

    const { id } = req.params;
    const adminUser = req.user;

    const result = await services.updateTechnicianByAdmin(id, req.body, adminUser);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error en updateTechnician:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

// Actualizar datos de un cliente (solo admin)
async function updateClient(req, res) {
  try {
    const { id } = req.params;
    const adminUser = req.user;

    const result = await services.updateClientByAdmin(id, req.body, adminUser);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error en updateClient:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

// Actualizar datos de facturación del tenant (solo admin)
async function updateBillingInfo(req, res) {
  try {
    // Validar datos con schema
    await profileSchemas.updateBillingInfo.validate(req.body, { abortEarly: false });

    const adminUser = req.user;
    const tenantId = adminUser.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró el tenant del usuario'
      });
    }

    const result = await services.updateTenantBillingInfo(tenantId, req.body, adminUser);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error en updateBillingInfo:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

export {
  createAccount,
  login,
  publicLogin,
  logout,
  getAllAccounts,
  getAccountById,
  getTechnicians,
  deleteAccount,
  verifyAuth,
  getProfile,
  createDemoAccount,
  updateProfile,
  updatePassword,
  requestPasswordChange,
  confirmPasswordChange,
  updateTechnician,
  updateClient,
  updateBillingInfo
}
