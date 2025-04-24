import { clientSchemaCreate, clientSchemaPatch } from '../schemas/client.schema.js';

function validateClient(req, res, next) {
    clientSchemaCreate.validate(req.body, { abortEarly: false })
        .then((cliente) => {
            req.body = cliente;
            next();
        })
        .catch((error) => res.status(500).json(error));
}

function validateClientPatch(req, res, next) {
    clientSchemaPatch.validate(req.body, { abortEarly: false, stripUnknown: true })
        .then((cliente) => {
            req.body = cliente;
            next();
        })
        .catch((error) => res.status(500).json(error))
}

export {
    validateClient,
    validateClientPatch
};
