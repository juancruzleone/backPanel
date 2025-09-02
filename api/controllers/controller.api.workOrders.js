import * as service from "../../services/workOrders.services.js"

// Obtener todas las órdenes de trabajo (Admin)
async function getAllWorkOrders(req, res) {
  try {
    const { estado, tecnicoId, instalacionId } = req.query
    const filters = { estado, tecnicoId, instalacionId }
    const tenantId = req.user.tenantId
    const workOrders = await service.getAllWorkOrders(filters, tenantId)

    res.status(200).json({
      success: true,
      data: workOrders,
    })
  } catch (error) {
    console.error("Error al obtener órdenes de trabajo:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    })
  }
}

// Crear nueva orden de trabajo
async function createWorkOrder(req, res) {
  try {
    const workOrderData = req.body
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        success: false,
        error: "No tienes permisos para crear órdenes de trabajo"
      })
    }
    
    // Agregar tenantId a los datos de la orden de trabajo
    workOrderData.tenantId = tenantId
    workOrderData.createdBy = adminUser._id
    
    const newWorkOrder = await service.createWorkOrder(workOrderData, adminUser)

    res.status(201).json({
      success: true,
      message: "Orden de trabajo creada exitosamente",
      data: newWorkOrder,
    })
  } catch (error) {
    console.error("Error al crear orden de trabajo:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al crear la orden de trabajo",
    })
  }
}

// Actualizar orden de trabajo
async function updateWorkOrder(req, res) {
  try {
    const { id } = req.params
    const workOrderData = req.body
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        success: false,
        error: "No tienes permisos para actualizar órdenes de trabajo"
      })
    }
    
    workOrderData.updatedBy = adminUser._id
    workOrderData.updatedAt = new Date()
    
    const updatedWorkOrder = await service.updateWorkOrder(id, workOrderData, adminUser, tenantId)

    res.status(200).json({
      success: true,
      message: "Orden de trabajo actualizada exitosamente",
      data: updatedWorkOrder,
    })
  } catch (error) {
    console.error("Error al actualizar orden de trabajo:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al actualizar la orden de trabajo",
    })
  }
}

// Eliminar orden de trabajo
async function deleteWorkOrder(req, res) {
  try {
    const { id } = req.params
    const adminUser = req.user
    const tenantId = req.user.tenantId
    
    // Verificar que el usuario sea admin del tenant
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "super_admin")) {
      return res.status(403).json({
        success: false,
        error: "No tienes permisos para eliminar órdenes de trabajo"
      })
    }
    
    await service.deleteWorkOrder(id, adminUser, tenantId)

    res.status(200).json({
      success: true,
      message: "Orden de trabajo eliminada exitosamente",
    })
  } catch (error) {
    console.error("Error al eliminar orden de trabajo:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al eliminar la orden de trabajo",
    })
  }
}

// Asignar orden de trabajo a técnico
async function assignWorkOrder(req, res) {
  try {
    const { id } = req.params
    const { tecnicoId } = req.body
    const adminUser = req.user
    const result = await service.assignWorkOrder(id, tecnicoId, adminUser)

    res.status(200).json({
      success: true,
      message: "Orden de trabajo asignada exitosamente",
      data: result,
    })
  } catch (error) {
    console.error("Error al asignar orden de trabajo:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al asignar la orden de trabajo",
    })
  }
}

// Actualizar estado de orden de trabajo
async function updateWorkOrderStatus(req, res) {
  try {
    const { id } = req.params
    const { estado, observaciones } = req.body
    const adminUser = req.user
    const result = await service.updateWorkOrderStatus(id, estado, observaciones, adminUser)

    res.status(200).json({
      success: true,
      message: "Estado de orden de trabajo actualizado exitosamente",
      data: result,
    })
  } catch (error) {
    console.error("Error al actualizar estado:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al actualizar el estado",
    })
  }
}

// Obtener órdenes de trabajo del técnico
async function getTechnicianWorkOrders(req, res) {
  try {
    const tecnicoId = req.user._id
    const { estado } = req.query
    const workOrders = await service.getTechnicianWorkOrders(tecnicoId, estado)

    res.status(200).json({
      success: true,
      data: workOrders,
    })
  } catch (error) {
    console.error("Error al obtener órdenes del técnico:", error)
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    })
  }
}

// Obtener orden de trabajo por ID
async function getWorkOrderById(req, res) {
  try {
    const { id } = req.params
    const user = req.user
    const tenantId = req.user.tenantId
    const workOrder = await service.getWorkOrderById(id, user, tenantId)

    res.status(200).json({
      success: true,
      data: workOrder,
    })
  } catch (error) {
    console.error("Error al obtener orden de trabajo:", error)
    res.status(404).json({
      success: false,
      error: error.message || "Orden de trabajo no encontrada",
    })
  }
}

// NUEVA FUNCIÓN: Obtener formulario para orden de trabajo
async function getWorkOrderForm(req, res) {
  try {
    const { id } = req.params
    const user = req.user
    const tenantId = req.user.tenantId
    const formData = await service.getWorkOrderForm(id, user, tenantId)

    res.status(200).json({
      success: true,
      data: formData,
    })
  } catch (error) {
    console.error("Error al obtener formulario de orden de trabajo:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al obtener el formulario",
    })
  }
}

// Completar orden de trabajo
async function completeWorkOrder(req, res) {
  try {
    const { id } = req.params
    const completionData = req.body
    const user = req.user
    const result = await service.completeWorkOrder(id, completionData, user)

    res.status(200).json({
      success: true,
      message: "Orden de trabajo completada exitosamente",
      data: result,
    })
  } catch (error) {
    console.error("Error al completar orden de trabajo:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al completar la orden de trabajo",
    })
  }
}

// Iniciar orden de trabajo
async function startWorkOrder(req, res) {
  try {
    const { id } = req.params
    const user = req.user
    const result = await service.startWorkOrder(id, user)

    res.status(200).json({
      success: true,
      message: "Orden de trabajo iniciada exitosamente",
      data: result,
    })
  } catch (error) {
    console.error("Error al iniciar orden de trabajo:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al iniciar la orden de trabajo",
    })
  }
}

// Obtener historial de orden de trabajo
async function getWorkOrderHistory(req, res) {
  try {
    const { id } = req.params
    const user = req.user
    const history = await service.getWorkOrderHistory(id, user)

    res.status(200).json({
      success: true,
      data: history,
    })
  } catch (error) {
    console.error("Error al obtener historial:", error)
    res.status(400).json({
      success: false,
      error: error.message || "Error al obtener el historial",
    })
  }
}

export {
  getAllWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  assignWorkOrder,
  updateWorkOrderStatus,
  getTechnicianWorkOrders,
  getWorkOrderById,
  getWorkOrderForm, // NUEVA FUNCIÓN EXPORTADA
  completeWorkOrder,
  startWorkOrder,
  getWorkOrderHistory,
}
