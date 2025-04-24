import { profileSchema } from '../schemas/profile.schema.js';

function validateProfile(req, res, next) {
  profileSchema.validate(req.body, { abortEarly: false })
    .then((validData) => {
      req.body = validData;
      next();
    })
    .catch((error) => res.status(400).json({ error: error.errors }));
}

export { validateProfile };
