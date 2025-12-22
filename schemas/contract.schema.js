import * as Yup from "yup"

/**
 * Schema de validación para contratos/presupuestos de instalaciones
 */
const contractSchema = Yup.object().shape({
    nombre: Yup.string()
        .required("El nombre del contrato es requerido")
        .max(200, "El nombre no puede tener más de 200 caracteres"),
    descripcion: Yup.string()
        .max(1000, "La descripción no puede tener más de 1000 caracteres"),
    tipoContrato: Yup.string()
        .oneOf(
            ["Presupuesto", "Contrato", "Anexo", "Addendum", "Renovación"],
            "El tipo de contrato debe ser válido"
        )
        .required("El tipo de contrato es requerido"),
    monto: Yup.number()
        .nullable()
        .positive("El monto debe ser positivo"),
    moneda: Yup.string()
        .oneOf(["ARS", "USD", "EUR"], "La moneda debe ser válida")
        .default("ARS"),
    fechaEmision: Yup.date()
        .nullable()
        .typeError("La fecha de emisión debe ser válida"),
    fechaVigenciaDesde: Yup.date()
        .nullable()
        .typeError("La fecha de vigencia desde debe ser válida"),
    fechaVigenciaHasta: Yup.date()
        .nullable()
        .typeError("La fecha de vigencia hasta debe ser válida")
        .test(
            'is-after-desde',
            'La fecha de vigencia hasta debe ser posterior a la fecha de vigencia desde',
            function (value) {
                const { fechaVigenciaDesde } = this.parent
                if (!fechaVigenciaDesde || !value) return true
                return new Date(value) >= new Date(fechaVigenciaDesde)
            }
        ),
    estado: Yup.string()
        .oneOf(
            ["Vigente", "Vencido", "Pendiente", "Anulado", "Borrador"],
            "El estado debe ser válido"
        )
        .default("Vigente"),
    numeroContrato: Yup.string()
        .max(50, "El número de contrato no puede tener más de 50 caracteres"),
    observaciones: Yup.string()
        .max(2000, "Las observaciones no pueden tener más de 2000 caracteres"),
    installationId: Yup.string()
        .required("El ID de la instalación es requerido"),
})

/**
 * Schema para actualización parcial de contrato
 */
const contractPatchSchema = Yup.object().shape({
    nombre: Yup.string()
        .max(200, "El nombre no puede tener más de 200 caracteres"),
    descripcion: Yup.string()
        .max(1000, "La descripción no puede tener más de 1000 caracteres"),
    tipoContrato: Yup.string()
        .oneOf(
            ["Presupuesto", "Contrato", "Anexo", "Addendum", "Renovación"],
            "El tipo de contrato debe ser válido"
        ),
    monto: Yup.number()
        .nullable()
        .positive("El monto debe ser positivo"),
    moneda: Yup.string()
        .oneOf(["ARS", "USD", "EUR"], "La moneda debe ser válida"),
    fechaEmision: Yup.date()
        .nullable()
        .typeError("La fecha de emisión debe ser válida"),
    fechaVigenciaDesde: Yup.date()
        .nullable()
        .typeError("La fecha de vigencia desde debe ser válida"),
    fechaVigenciaHasta: Yup.date()
        .nullable()
        .typeError("La fecha de vigencia hasta debe ser válida"),
    estado: Yup.string()
        .oneOf(
            ["Vigente", "Vencido", "Pendiente", "Anulado", "Borrador"],
            "El estado debe ser válido"
        ),
    numeroContrato: Yup.string()
        .max(50, "El número de contrato no puede tener más de 50 caracteres"),
    observaciones: Yup.string()
        .max(2000, "Las observaciones no pueden tener más de 2000 caracteres"),
})

/**
 * Middleware de validación para crear/actualizar contrato completo
 */
function validateContract(req, res, next) {
    contractSchema
        .validate(req.body, { abortEarly: false, stripUnknown: true })
        .then((contract) => {
            req.body = contract
            next()
        })
        .catch((error) => res.status(400).json({ error: error.errors }))
}

/**
 * Middleware de validación para actualizar contrato parcialmente
 */
function validateContractPatch(req, res, next) {
    contractPatchSchema
        .validate(req.body, { abortEarly: false, stripUnknown: true })
        .then((contract) => {
            req.body = contract
            next()
        })
        .catch((error) => res.status(400).json({ error: error.errors }))
}

/**
 * Middleware para validar que se subió un archivo PDF
 */
function validateContractFileUpload(req, res, next) {
    if (!req.cloudinaryFile && !req.file) {
        return res.status(400).json({
            error: ["Se requiere subir un archivo PDF para el contrato"]
        })
    }
    next()
}

export {
    contractSchema,
    contractPatchSchema,
    validateContract,
    validateContractPatch,
    validateContractFileUpload,
}
