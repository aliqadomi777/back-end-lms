import Joi from 'joi';

const fileUploadSchema = Joi.object({
  original_filename: Joi.string().max(255).required(),
  stored_filename: Joi.string().max(255).required(),
  file_path: Joi.string().max(500).required(),
  file_size: Joi.number().positive().max(100 * 1024 * 1024).required(), // 100MB
  mime_type: Joi.string().pattern(/^[-\w.]+\/[\w.+-]+$/).required(),
  upload_type: Joi.string().valid('course_thumbnail', 'lesson_video', 'lesson_document', 'assignment_file', 'user_avatar').required(),
  uploaded_by: Joi.number().integer().positive().optional()
});

export const validateFileUpload = (req, res, next) => {
  const { error } = fileUploadSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
}; 