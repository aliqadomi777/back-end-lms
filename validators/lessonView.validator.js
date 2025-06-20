import Joi from 'joi';

const lessonViewSchema = Joi.object({
  user_id: Joi.number().integer().positive().required(),
  lesson_id: Joi.number().integer().positive().required(),
  duration_seconds: Joi.number().integer().min(0).required()
});

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