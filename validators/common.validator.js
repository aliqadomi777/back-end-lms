import Joi from 'joi';

export const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().optional(),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

export const validateIdParam = (req, res, next) => {
  const { error } = idParamSchema.validate(req.params);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};

export const validatePagination = (req, res, next) => {
  const { error } = paginationSchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
}; 