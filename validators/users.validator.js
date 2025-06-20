import Joi from "joi";

const userRegistrationSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      new RegExp(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
      )
    )
    .required(),
  role: Joi.string().valid("student", "instructor").default("student"),
  oauth_provider: Joi.string().valid("google").optional(),
  oauth_id: Joi.string().optional(),
});

const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  theme_preference: Joi.string().valid("light", "dark").optional(),
  language_preference: Joi.string().valid("en", "ar").optional(),
});

const passwordResetSchema = Joi.object({
  email: Joi.string().email().when("token", {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  token: Joi.string().optional(),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      new RegExp(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"
      )
    )
    .when("token", {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
});

export const validateUserRegistration = (req, res, next) => {
  const { error } = userRegistrationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message,
    });
  }
  next();
};

export const validateUserLogin = (req, res, next) => {
  const { error } = userLoginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message,
    });
  }
  next();
};

export const validateUserUpdate = (req, res, next) => {
  const { error } = userUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message,
    });
  }
  next();
};

export const validatePasswordReset = (req, res, next) => {
  const { error } = passwordResetSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      data: null,
      message: error.details[0].message,
    });
  }
  next();
};
