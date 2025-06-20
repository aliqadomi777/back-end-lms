import Joi from 'joi';

const lessonCreationSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  content: Joi.string().min(10).max(10000).optional(),
  content_type: Joi.string().valid('text', 'video', 'audio', 'document', 'quiz').default('text'),
  video_url: Joi.string().uri().optional(),
  video_duration: Joi.number().integer().min(0).optional(),
  order_index: Joi.number().integer().positive().optional(),
  is_preview: Joi.boolean().default(false)
});

const lessonUpdateSchema = Joi.object({
  title: Joi.string().min(3).max(200).optional(),
  content: Joi.string().min(10).max(10000).optional(),
  content_type: Joi.string().valid('text', 'video', 'audio', 'document', 'quiz').optional(),
  video_url: Joi.string().uri().optional(),
  video_duration: Joi.number().integer().min(0).optional(),
  order_index: Joi.number().integer().positive().optional(),
  is_preview: Joi.boolean().optional()
});

const lessonReorderSchema = Joi.object({
  lesson_orders: Joi.array().items(
    Joi.object({
      lesson_id: Joi.number().integer().positive().required(),
      order_index: Joi.number().integer().positive().required()
    })
  ).min(1).required()
});

const lessonViewSchema = Joi.object({
  duration_watched: Joi.number().integer().min(0).default(0)
});

export const validateLessonCreation = (req, res, next) => {
  const { error } = lessonCreationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};

export const validateLessonUpdate = (req, res, next) => {
  const { error } = lessonUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};

export const validateLessonReorder = (req, res, next) => {
  const { error } = lessonReorderSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};

export const validateLessonView = (req, res, next) => {
  const { error } = lessonViewSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};