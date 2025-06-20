import Joi from 'joi';

export const assignmentValidators = {
  createAssignment: {
    body: Joi.object({
      lesson_id: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'Lesson ID must be a number',
          'number.integer': 'Lesson ID must be an integer',
          'number.positive': 'Lesson ID must be positive',
          'any.required': 'Lesson ID is required'
        }),
      title: Joi.string().min(3).max(255).required()
        .messages({
          'string.min': 'Title must be at least 3 characters long',
          'string.max': 'Title cannot exceed 255 characters',
          'any.required': 'Title is required'
        }),
      description: Joi.string().max(1000).optional()
        .messages({
          'string.max': 'Description cannot exceed 1000 characters'
        }),
      instructions: Joi.string().max(5000).optional()
        .messages({
          'string.max': 'Instructions cannot exceed 5000 characters'
        }),
      deadline: Joi.date().iso().greater('now').optional()
        .messages({
          'date.base': 'Deadline must be a valid date',
          'date.greater': 'Deadline must be in the future'
        }),
      max_score: Joi.number().integer().min(1).max(1000).default(100)
        .messages({
          'number.base': 'Max score must be a number',
          'number.integer': 'Max score must be an integer',
          'number.min': 'Max score must be at least 1',
          'number.max': 'Max score cannot exceed 1000'
        }),
      allow_late_submission: Joi.boolean().default(false)
        .messages({
          'boolean.base': 'Allow late submission must be a boolean'
        })
    })
  },

  updateAssignment: {
    params: Joi.object({
      id: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'Assignment ID must be a number',
          'number.integer': 'Assignment ID must be an integer',
          'number.positive': 'Assignment ID must be positive',
          'any.required': 'Assignment ID is required'
        })
    }),
    body: Joi.object({
      title: Joi.string().min(3).max(255).optional()
        .messages({
          'string.min': 'Title must be at least 3 characters long',
          'string.max': 'Title cannot exceed 255 characters'
        }),
      description: Joi.string().max(1000).optional()
        .messages({
          'string.max': 'Description cannot exceed 1000 characters'
        }),
      instructions: Joi.string().max(5000).optional()
        .messages({
          'string.max': 'Instructions cannot exceed 5000 characters'
        }),
      deadline: Joi.date().iso().optional()
        .messages({
          'date.base': 'Deadline must be a valid date'
        }),
      max_score: Joi.number().integer().min(1).max(1000).optional()
        .messages({
          'number.base': 'Max score must be a number',
          'number.integer': 'Max score must be an integer',
          'number.min': 'Max score must be at least 1',
          'number.max': 'Max score cannot exceed 1000'
        }),
      allow_late_submission: Joi.boolean().optional()
        .messages({
          'boolean.base': 'Allow late submission must be a boolean'
        })
    }).min(1)
  },

  submitAssignment: {
    params: Joi.object({
      id: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'Assignment ID must be a number',
          'number.integer': 'Assignment ID must be an integer',
          'number.positive': 'Assignment ID must be positive',
          'any.required': 'Assignment ID is required'
        })
    }),
    body: Joi.object({
      submission_text: Joi.string().max(10000).optional()
        .messages({
          'string.max': 'Submission text cannot exceed 10000 characters'
        }),
      submission_url: Joi.string().uri().optional()
        .messages({
          'string.uri': 'Submission URL must be a valid URL'
        })
    }).or('submission_text', 'submission_url')
      .messages({
        'object.missing': 'Either submission text or submission URL is required'
      })
  },

  gradeSubmission: {
    params: Joi.object({
      submissionId: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'Submission ID must be a number',
          'number.integer': 'Submission ID must be an integer',
          'number.positive': 'Submission ID must be positive',
          'any.required': 'Submission ID is required'
        })
    }),
    body: Joi.object({
      grade: Joi.number().integer().min(0).required()
        .messages({
          'number.base': 'Grade must be a number',
          'number.integer': 'Grade must be an integer',
          'number.min': 'Grade cannot be negative',
          'any.required': 'Grade is required'
        }),
      feedback: Joi.string().max(2000).optional()
        .messages({
          'string.max': 'Feedback cannot exceed 2000 characters'
        })
    })
  },

  listAssignments: {
    query: Joi.object({
      lesson_id: Joi.number().integer().positive().optional()
        .messages({
          'number.base': 'Lesson ID must be a number',
          'number.integer': 'Lesson ID must be an integer',
          'number.positive': 'Lesson ID must be positive'
        }),
      course_id: Joi.number().integer().positive().optional()
        .messages({
          'number.base': 'Course ID must be a number',
          'number.integer': 'Course ID must be an integer',
          'number.positive': 'Course ID must be positive'
        }),
      instructor_id: Joi.number().integer().positive().optional()
        .messages({
          'number.base': 'Instructor ID must be a number',
          'number.integer': 'Instructor ID must be an integer',
          'number.positive': 'Instructor ID must be positive'
        }),
      page: Joi.number().integer().min(1).default(1)
        .messages({
          'number.base': 'Page must be a number',
          'number.integer': 'Page must be an integer',
          'number.min': 'Page must be at least 1'
        }),
      limit: Joi.number().integer().min(1).max(100).default(10)
        .messages({
          'number.base': 'Limit must be a number',
          'number.integer': 'Limit must be an integer',
          'number.min': 'Limit must be at least 1',
          'number.max': 'Limit cannot exceed 100'
        }),
      sort: Joi.string().valid('title', 'deadline', 'created_at', 'max_score').default('created_at')
        .messages({
          'any.only': 'Sort must be one of: title, deadline, created_at, max_score'
        }),
      order: Joi.string().valid('asc', 'desc').default('desc')
        .messages({
          'any.only': 'Order must be either asc or desc'
        })
    })
  },

  getSubmissions: {
    params: Joi.object({
      id: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'Assignment ID must be a number',
          'number.integer': 'Assignment ID must be an integer',
          'number.positive': 'Assignment ID must be positive',
          'any.required': 'Assignment ID is required'
        })
    }),
    query: Joi.object({
      status: Joi.string().valid('draft', 'submitted', 'graded', 'returned').optional()
        .messages({
          'any.only': 'Status must be one of: draft, submitted, graded, returned'
        }),
      page: Joi.number().integer().min(1).default(1)
        .messages({
          'number.base': 'Page must be a number',
          'number.integer': 'Page must be an integer',
          'number.min': 'Page must be at least 1'
        }),
      limit: Joi.number().integer().min(1).max(100).default(10)
        .messages({
          'number.base': 'Limit must be a number',
          'number.integer': 'Limit must be an integer',
          'number.min': 'Limit must be at least 1',
          'number.max': 'Limit cannot exceed 100'
        }),
      sort: Joi.string().valid('submitted_at', 'graded_at', 'grade').default('submitted_at')
        .messages({
          'any.only': 'Sort must be one of: submitted_at, graded_at, grade'
        }),
      order: Joi.string().valid('asc', 'desc').default('desc')
        .messages({
          'any.only': 'Order must be either asc or desc'
        })
    })
  }
};