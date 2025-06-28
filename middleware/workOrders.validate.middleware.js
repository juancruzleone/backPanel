import {
    workOrderSchema,
    workOrderAssignmentSchema,
    workOrderStatusUpdateSchema,
    workOrderCompletionSchema,
  } from "../schemas/workOrders.schema.js"
  
  async function validateWorkOrder(req, res, next) {
    try {
      const workOrder = await workOrderSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
      req.body = workOrder
      next()
    } catch (err) {
      const errorMessages = err.inner.map((e) => e.message)
      res.status(400).json({
        success: false,
        error: "Error de validación",
        details: errorMessages,
      })
    }
  }
  
  async function validateWorkOrderAssignment(req, res, next) {
    try {
      const assignment = await workOrderAssignmentSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
      req.body = assignment
      next()
    } catch (err) {
      const errorMessages = err.inner.map((e) => e.message)
      res.status(400).json({
        success: false,
        error: "Error de validación",
        details: errorMessages,
      })
    }
  }
  
  async function validateWorkOrderStatusUpdate(req, res, next) {
    try {
      const statusUpdate = await workOrderStatusUpdateSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
      req.body = statusUpdate
      next()
    } catch (err) {
      const errorMessages = err.inner.map((e) => e.message)
      res.status(400).json({
        success: false,
        error: "Error de validación",
        details: errorMessages,
      })
    }
  }
  
  async function validateWorkOrderCompletion(req, res, next) {
    try {
      const completion = await workOrderCompletionSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
      req.body = completion
      next()
    } catch (err) {
      const errorMessages = err.inner.map((e) => e.message)
      res.status(400).json({
        success: false,
        error: "Error de validación",
        details: errorMessages,
      })
    }
  }
  
  export { validateWorkOrder, validateWorkOrderAssignment, validateWorkOrderStatusUpdate, validateWorkOrderCompletion }
  