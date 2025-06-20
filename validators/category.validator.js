import Joi from "joi";

const categorySchema = Joi.object({
  name: Joi.string().max(255),
  description: Joi.string().max(1000),
});

export const validateCategory = (req, res, next) => {
  const { error } = categorySchema
    .keys({ name: Joi.string().max(255).required() })
    .validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message,
    });
  }
  next();
};

export const validateCategoryUpdate = (req, res, next) => {
  const { error } = categorySchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message,
    });
  }
  next();
};
