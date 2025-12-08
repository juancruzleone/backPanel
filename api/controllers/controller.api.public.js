import * as publicServices from "../../services/public.services.js"
import * as installationsServices from "../../services/installations.services.js"

async function registerPublic(req, res) {
  try {
    const result = await publicServices.registerPublicUser(req.body)
    res.status(201).json(result)
  } catch (err) {
    console.error("Error en registro público:", err)
    res.status(400).json({ error: { message: err.message } })
  }
}

async function getPublicPlans(req, res) {
  try {
    const { status } = req.query
    const plans = await publicServices.getPublicPlans(status)
    res.status(200).json({
      success: true,
      message: 'Planes públicos obtenidos exitosamente',
      data: plans,
      count: plans.length
    })
  } catch (error) {
    console.error('Error en getPublicPlans:', error)
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    })
  }
}

async function createPublicCheckout(req, res) {
  try {
    const { planId } = req.params;
    
    // Obtener datos del body (POST) o query params (GET)
    const isGetRequest = req.method === 'GET';
    const data = isGetRequest ? req.query : req.body;
    let { payerEmail, payerName, backUrl, billingCycle } = data;

    // Si no hay payerEmail, intentar extraerlo del token JWT o usar email por defecto
    if (!payerEmail) {
      // Intentar extraer del JWT si está disponible
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.replace('Bearer ', '');
          const jwt = await import('jsonwebtoken');
          const decoded = jwt.default.decode(token);
          
          if (decoded && decoded.email) {
            payerEmail = decoded.email;
            payerName = payerName || decoded.name || decoded.userName;
            console.log('📧 Email extraído del JWT:', payerEmail);
          }
        } catch (jwtError) {
          console.log('⚠️ No se pudo extraer email del JWT:', jwtError.message);
        }
      }
      
      // Si aún no hay email, usar un email temporal para testing
      if (!payerEmail) {
        payerEmail = 'test@example.com';
        payerName = payerName || 'Usuario Temporal';
        console.log('⚠️ Usando email temporal para testing:', payerEmail);
      }
    }

    console.log('🛒 Creando checkout público para plan:', planId);
    console.log('📧 Email del pagador:', payerEmail);
    console.log('🔄 Ciclo de facturación:', billingCycle);
    console.log('🔄 Método HTTP:', req.method);

    const checkoutData = {
      payerEmail,
      payerName: payerName || 'Cliente',
      backUrl: backUrl || `${process.env.FRONTEND_URL || 'https://leonix.vercel.app'}/subscription/success`,
      billingCycle: billingCycle || 'monthly',
      country: 'AR' // Forzar Argentina para evitar error de países diferentes
    };

    const result = await publicServices.createPublicCheckout(planId, checkoutData);

    res.status(200).json({
      success: true,
      message: 'Checkout creado exitosamente',
      data: result.data
    });

  } catch (error) {
    console.error('Error en createPublicCheckout:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
}

// Obtener historial completo de mantenimientos de un dispositivo (público - para QR)
async function getPublicMaintenanceHistory(req, res) {
  try {
    const { installationId, deviceId } = req.params
    console.log('📋 Solicitud pública de historial de mantenimientos:', { installationId, deviceId })
    
    const maintenanceList = await installationsServices.getAllMaintenanceForDevice(installationId, deviceId)
    
    res.status(200).json({
      success: true,
      data: maintenanceList,
      count: maintenanceList.length
    })
  } catch (error) {
    console.error('Error al obtener historial público de mantenimientos:', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Error al obtener el historial de mantenimientos'
    })
  }
}

// Obtener último mantenimiento de un dispositivo (público - para QR)
async function getPublicLastMaintenance(req, res) {
  try {
    const { installationId, deviceId } = req.params
    console.log('📋 Solicitud pública de último mantenimiento:', { installationId, deviceId })
    
    const maintenance = await installationsServices.getLastMaintenanceForDevice(installationId, deviceId)
    
    if (!maintenance) {
      console.log('⚠️ No se encontraron mantenimientos para este dispositivo')
      return res.status(404).json({
        success: false,
        message: 'No se encontraron registros de mantenimiento'
      })
    }
    
    console.log('✅ Mantenimiento encontrado:')
    console.log('   - _id:', maintenance._id)
    console.log('   - date:', maintenance.date)
    console.log('   - pdfUrl:', maintenance.pdfUrl)
    console.log('   - Objeto completo:', JSON.stringify(maintenance, null, 2))
    
    // Verificar que pdfUrl existe
    if (!maintenance.pdfUrl) {
      console.error('❌ ADVERTENCIA: El mantenimiento no tiene pdfUrl')
    }
    
    res.status(200).json({
      success: true,
      data: maintenance
    })
  } catch (error) {
    console.error('❌ Error al obtener último mantenimiento público:', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Error al obtener el último mantenimiento'
    })
  }
}

// Obtener formulario de dispositivo (público - para QR)
async function getPublicDeviceForm(req, res) {
  try {
    const { installationId, deviceId } = req.params
    console.log('📋 Solicitud pública de formulario de dispositivo:', { installationId, deviceId })
    
    const formData = await installationsServices.getDeviceForm(installationId, deviceId)
    
    res.status(200).json({
      success: true,
      data: formData
    })
  } catch (error) {
    console.error('Error al obtener formulario público:', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Error al obtener el formulario'
    })
  }
}

export { 
  registerPublic, 
  getPublicPlans, 
  createPublicCheckout,
  getPublicMaintenanceHistory,
  getPublicLastMaintenance,
  getPublicDeviceForm
}