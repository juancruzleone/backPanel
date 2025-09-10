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
    const userData = req.body;
    
    const result = await publicServices.createPublicCheckout(planId, userData);
    
    res.status(201).json({
      success: true,
      message: 'Checkout público creado exitosamente',
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