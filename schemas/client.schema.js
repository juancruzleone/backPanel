import yup from 'yup';

const clientSchemaCreate = yup.object({
    name: yup.string().required(),
    category: yup.string().required(),
});

const clientSchemaPatch = yup.object({
    name: yup.string(),
    category: yup.string(),
});

export {
    clientSchemaCreate,
    clientSchemaPatch
};
