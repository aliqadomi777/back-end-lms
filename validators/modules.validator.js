import Joi from 'joi';

const moduleCreationSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).max(1000).optional(),
  order_index: Joi.number().integer().positive().optional()
});

const moduleUpdateSchema = Joi.object({
  title: Joi.string().min(3).max(200).optional(),
  description: Joi.string().min(10).max(1000).optional(),
  order_index: Joi.number().integer().positive().optional()
});

const moduleReorderSchema = Joi.object({
  module_orders: Joi.array().items(
    Joi.object({
      module_id: Joi.number().integer().positive().required(),
      order_index: Joi.number().integer().positive().required()
    })
  ).min(1).required()
});

export const validateModuleCreation = (req, res, next) => {
  const { error } = moduleCreationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};

export const validateModuleUpdate = (req, res, next) => {
  const { error } = moduleUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};

export const validateModuleReorder = (req, res, next) => {
  const { error } = moduleReorderSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};