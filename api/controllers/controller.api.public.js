import * as publicServices from "../../services/public.services.js"

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

export { registerPublic, getPublicPlans, createPublicCheckout }