import Joi from 'joi';

const wishlistSchema = Joi.object({
  user_id: Joi.number().integer().positive().required(),
  course_id: Joi.number().integer().positive().required()
});

export const validateWishlistAction = (req, res, next) => {
  const { error } = wishlistSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message
    });
  }
  next();
}; 