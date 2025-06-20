import Joi from 'joi';

const sessionSchema = Joi.object({
  user_id: Joi.number().integer().positive().required(),
  token: Joi.string().required()
});

export const validateSessionAction = (req, res, next) => {
  const { error } = sessionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
}; 