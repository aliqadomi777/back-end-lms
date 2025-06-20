import Joi from 'joi';

const enrollmentSchema = Joi.object({
  course_id: Joi.number().integer().positive().required()
});

const progressUpdateSchema = Joi.object({
  lesson_id: Joi.number().integer().positive().required(),
  completed: Joi.boolean().default(true)
});

const enrollmentStatsSchema = Joi.object({
  course_id: Joi.number().integer().positive().optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).optional()
});

const exportSchema = Joi.object({
  format: Joi.string().valid('csv', 'excel').default('csv'),
  course_id: Joi.number().integer().positive().optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).optional()
});

export const validateEnrollment = (req, res, next) => {
  const { error } = enrollmentSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};

export const validateProgressUpdate = (req, res, next) => {
  const { error } = progressUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};

export const validateEnrollmentStats = (req, res, next) => {
  const { error } = enrollmentStatsSchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};

export const validateExport = (req, res, next) => {
  const { error } = exportSchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
};