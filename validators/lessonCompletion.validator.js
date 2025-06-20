import Joi from 'joi';

const lessonCompletionSchema = Joi.object({
  user_id: Joi.number().integer().positive().required(),
  lesson_id: Joi.number().integer().positive().required()
});

export const validateLessonCompletion = (req, res, next) => {
  const { error } = lessonCompletionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
}; 