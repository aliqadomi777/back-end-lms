import Joi from "joi";

// Quiz creation validation schema
const createQuizSchema = Joi.object({
  course_id: Joi.string().required().messages({
    "string.empty": "Course ID is required",
    "any.required": "Course ID is required",
  }),
  title: Joi.string().min(3).max(200).required().messages({
    "string.empty": "Quiz title is required",
    "string.min": "Quiz title must be at least 3 characters long",
    "string.max": "Quiz title cannot exceed 200 characters",
    "any.required": "Quiz title is required",
  }),
  description: Joi.string().max(1000).allow("").messages({
    "string.max": "Description cannot exceed 1000 characters",
  }),
  time_limit: Joi.number().integer().min(1).max(480).allow(null).messages({
    "number.base": "Time limit must be a number",
    "number.integer": "Time limit must be an integer",
    "number.min": "Time limit must be at least 1 minute",
    "number.max": "Time limit cannot exceed 480 minutes (8 hours)",
  }),
  max_attempts: Joi.number().integer().min(1).max(10).allow(null).messages({
    "number.base": "Max attempts must be a number",
    "number.integer": "Max attempts must be an integer",
    "number.min": "Max attempts must be at least 1",
    "number.max": "Max attempts cannot exceed 10",
  }),
  passing_score: Joi.number().min(0).max(100).default(70).messages({
    "number.base": "Passing score must be a number",
    "number.min": "Passing score cannot be negative",
    "number.max": "Passing score cannot exceed 100",
  }),
  randomize_questions: Joi.boolean().default(false),
  show_results_immediately: Joi.boolean().default(true),
  allow_review: Joi.boolean().default(true),
});

// Quiz update validation schema
const updateQuizSchema = Joi.object({
  title: Joi.string().min(3).max(200).messages({
    "string.empty": "Quiz title cannot be empty",
    "string.min": "Quiz title must be at least 3 characters long",
    "string.max": "Quiz title cannot exceed 200 characters",
  }),
  description: Joi.string().max(1000).allow("").messages({
    "string.max": "Description cannot exceed 1000 characters",
  }),
  time_limit: Joi.number().integer().min(1).max(480).allow(null).messages({
    "number.base": "Time limit must be a number",
    "number.integer": "Time limit must be an integer",
    "number.min": "Time limit must be at least 1 minute",
    "number.max": "Time limit cannot exceed 480 minutes (8 hours)",
  }),
  max_attempts: Joi.number().integer().min(1).max(10).allow(null).messages({
    "number.base": "Max attempts must be a number",
    "number.integer": "Max attempts must be an integer",
    "number.min": "Max attempts must be at least 1",
    "number.max": "Max attempts cannot exceed 10",
  }),
  passing_score: Joi.number().min(0).max(100).messages({
    "number.base": "Passing score must be a number",
    "number.min": "Passing score cannot be negative",
    "number.max": "Passing score cannot exceed 100",
  }),
  randomize_questions: Joi.boolean(),
  show_results_immediately: Joi.boolean(),
  allow_review: Joi.boolean(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

// Question option schema
const questionOptionSchema = Joi.object({
  option_text: Joi.string().min(1).max(500).required().messages({
    "string.empty": "Option text is required",
    "string.min": "Option text cannot be empty",
    "string.max": "Option text cannot exceed 500 characters",
    "any.required": "Option text is required",
  }),
  is_correct: Joi.boolean().required().messages({
    "any.required": "Option correctness must be specified",
  }),
  explanation: Joi.string().max(1000).allow("").messages({
    "string.max": "Option explanation cannot exceed 1000 characters",
  }),
});

// Add question validation schema
const addQuestionSchema = Joi.object({
  question_text: Joi.string().min(5).max(1000).required().messages({
    "string.empty": "Question text is required",
    "string.min": "Question text must be at least 5 characters long",
    "string.max": "Question text cannot exceed 1000 characters",
    "any.required": "Question text is required",
  }),
  question_type: Joi.string()
    .valid("multiple_choice", "multiple_select", "true_false")
    .required()
    .messages({
      "any.only":
        "Question type must be one of: multiple_choice, multiple_select, true_false",
      "any.required": "Question type is required",
    }),
  points: Joi.number().min(0.5).max(100).default(1).messages({
    "number.base": "Points must be a number",
    "number.min": "Points must be at least 0.5",
    "number.max": "Points cannot exceed 100",
  }),
  options: Joi.when("question_type", {
    is: Joi.string().valid("multiple_choice", "multiple_select", "true_false"),
    then: Joi.array()
      .items(questionOptionSchema)
      .min(2)
      .max(6)
      .required()
      .custom((value, helpers) => {
        const correctOptions = value.filter((option) => option.is_correct);
        if (
          helpers.state.ancestors[0].question_type === "multiple_choice" &&
          correctOptions.length !== 1
        ) {
          return helpers.error("custom.multipleChoiceCorrect");
        }
        if (
          helpers.state.ancestors[0].question_type === "multiple_select" &&
          correctOptions.length < 1
        ) {
          return helpers.error("custom.multipleSelectCorrect");
        }
        if (
          helpers.state.ancestors[0].question_type === "true_false" &&
          (value.length !== 2 || correctOptions.length !== 1)
        ) {
          return helpers.error("custom.trueFalseOptions");
        }
        return value;
      })
      .messages({
        "array.min": "At least 2 options are required",
        "array.max": "Maximum 6 options allowed",
        "any.required": "Options are required for this question type",
        "custom.multipleChoiceCorrect":
          "Multiple choice questions must have exactly 1 correct option",
        "custom.multipleSelectCorrect":
          "Multiple select questions must have at least 1 correct option",
        "custom.trueFalseOptions":
          "True/false questions must have exactly 2 options with 1 correct",
      }),
    otherwise: Joi.array().items(questionOptionSchema).max(0).messages({
      "array.max": "Options are not allowed for this question type",
    }),
  }),
});

// Update question validation schema
const updateQuestionSchema = Joi.object({
  question_text: Joi.string().min(5).max(1000).messages({
    "string.empty": "Question text cannot be empty",
    "string.min": "Question text must be at least 5 characters long",
    "string.max": "Question text cannot exceed 1000 characters",
  }),
  question_type: Joi.string()
    .valid("multiple_choice", "multiple_select", "true_false")
    .messages({
      "any.only":
        "Question type must be one of: multiple_choice, multiple_select, true_false",
    }),
  points: Joi.number().min(0.5).max(100).messages({
    "number.base": "Points must be a number",
    "number.min": "Points must be at least 0.5",
    "number.max": "Points cannot exceed 100",
  }),
  options: Joi.when("question_type", {
    is: Joi.string().valid("multiple_choice", "multiple_select", "true_false"),
    then: Joi.array()
      .items(questionOptionSchema)
      .min(2)
      .max(6)
      .custom((value, helpers) => {
        const correctOptions = value.filter((option) => option.is_correct);
        if (
          helpers.state.ancestors[0].question_type === "multiple_choice" &&
          correctOptions.length !== 1
        ) {
          return helpers.error("custom.multipleChoiceCorrect");
        }
        if (
          helpers.state.ancestors[0].question_type === "multiple_select" &&
          correctOptions.length < 1
        ) {
          return helpers.error("custom.multipleSelectCorrect");
        }
        if (
          helpers.state.ancestors[0].question_type === "true_false" &&
          (value.length !== 2 || correctOptions.length !== 1)
        ) {
          return helpers.error("custom.trueFalseOptions");
        }
        return value;
      })
      .messages({
        "array.min": "At least 2 options are required",
        "array.max": "Maximum 6 options allowed",
        "custom.multipleChoiceCorrect":
          "Multiple choice questions must have exactly 1 correct option",
        "custom.multipleSelectCorrect":
          "Multiple select questions must have at least 1 correct option",
        "custom.trueFalseOptions":
          "True/false questions must have exactly 2 options with 1 correct",
      }),
    otherwise: Joi.array().items(questionOptionSchema).max(0).messages({
      "array.max": "Options are not allowed for this question type",
    }),
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

// Submit quiz validation schema
const submitQuizSchema = Joi.object({
  responses: Joi.array()
    .items(
      Joi.object({
        question_id: Joi.string().required().messages({
          "string.empty": "Question ID is required",
          "any.required": "Question ID is required",
        }),
        answer: Joi.alternatives()
          .try(
            Joi.string().max(5000), // For short answer and essay questions
            Joi.array().items(Joi.string()), // For multiple choice (multiple selections)
            Joi.boolean() // For true/false questions
          )
          .required()
          .messages({
            "any.required": "Answer is required for each question",
          }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one response is required",
      "any.required": "Responses are required",
    }),
});

// Export quiz results validation schema
const exportQuizResultsSchema = Joi.object({
  format: Joi.string().valid("csv", "excel").default("csv").messages({
    "any.only": "Export format must be either csv or excel",
  }),
});

// Validation middleware functions
export const validateCreateQuiz = (req, res, next) => {
  const { error } = createQuizSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }
  next();
};

export const validateUpdateQuiz = (req, res, next) => {
  const { error } = updateQuizSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }
  next();
};

export const validateAddQuestion = (req, res, next) => {
  const { error } = addQuestionSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }
  next();
};

export const validateUpdateQuestion = (req, res, next) => {
  const { error } = updateQuestionSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }
  next();
};

export const validateSubmitQuiz = (req, res, next) => {
  const { error } = submitQuizSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }
  next();
};

export const validateExportQuizResults = (req, res, next) => {
  const { error } = exportQuizResultsSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }
  next();
};
