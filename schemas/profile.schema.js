import * as yup from 'yup';

const profileSchema = yup.object({
    userName: yup.string()
        .trim()
        .required('El nombre de usuario es obligatorio')
        .min(6, 'El nombre de usuario debe tener al menos 6 caracteres')
});

export { profileSchema };
