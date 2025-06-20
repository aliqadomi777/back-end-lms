import Joi from 'joi';

const courseCreationSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).max(5000).required(),
  short_description: Joi.string().min(10).max(500).required(),
  category_id: Joi.number().integer().positive().required(),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
  price: Joi.number().min(0).max(9999.99).default(0),
  thumbnail_url: Joi.string().uri().optional(),
  preview_video_url: Joi.string().uri().optional(),
  language: Joi.string().valid('en', 'ar').default('en'),
  requirements: Joi.array().items(Joi.string().max(200)).max(10).default([]),
  what_you_will_learn: Joi.array().items(Joi.string().max(200)).min(1).max(20).required()
});

const courseUpdateSchema = Joi.object({
  title: Joi.string().min(3).max(200).optional(),
  description: Joi.string().min(10).max(5000).optional(),
  short_description: Joi.string().min(10).max(500).optional(),
  category_id: Joi.number().integer().positive().optional(),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
  price: Joi.number().min(0).max(9999.99).optional(),
  thumbnail_url: Joi.string().uri().optional(),
  preview_video_url: Joi.string().uri().optional(),
  language: Joi.string().valid('en', 'ar').optional(),
  requirements: Joi.array().items(Joi.string().max(200)).max(10).optional(),
  what_you_will_learn: Joi.array().items(Joi.string().max(200)).min(1).max(20).optional()
});

const courseRejectionSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required()
});

export const validateCourseCreation = (req, res, next) => {
  const { error } = courseCreationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};

export const validateCourseUpdate = (req, res, next) => {
  const { error } = courseUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};

export const validateCourseRejection = (req, res, next) => {
  const { error } = courseRejectionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};