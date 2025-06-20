import Joi from 'joi';

export const analyticsValidator = {
  // Dashboard validation
  getDashboard: {
    query: Joi.object({
      course_id: Joi.number().integer().positive().optional(),
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().min(Joi.ref('date_from')).optional(),
      period: Joi.string().valid('day', 'week', 'month', 'year').default('month')
    })
  },

  // Admin metrics validation
  getAdminMetrics: {
    query: Joi.object({
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().min(Joi.ref('date_from')).optional(),
      period: Joi.string().valid('day', 'week', 'month', 'year').default('month'),
      include_details: Joi.boolean().default(false)
    })
  },

  // Course statistics validation
  getCourseStats: {
    params: Joi.object({
      courseId: Joi.number().integer().positive().required()
    }),
    query: Joi.object({
      include_students: Joi.boolean().default(false),
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().min(Joi.ref('date_from')).optional(),
      detailed: Joi.boolean().default(false)
    })
  },

  // Top students validation
  getTopStudents: {
    query: Joi.object({
      course_id: Joi.number().integer().positive().optional(),
      limit: Joi.number().integer().min(1).max(100).default(10),
      metric: Joi.string().valid('completion_rate', 'average_score', 'total_points', 'activity').default('completion_rate'),
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().min(Joi.ref('date_from')).optional()
    })
  },

  // Student performance validation
  getStudentPerformance: {
    params: Joi.object({
      studentId: Joi.number().integer().positive().required()
    }),
    query: Joi.object({
      course_id: Joi.number().integer().positive().optional(),
      include_details: Joi.boolean().default(false),
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().min(Joi.ref('date_from')).optional()
    })
  },

  // Engagement trends validation
  getEngagementTrends: {
    query: Joi.object({
      course_id: Joi.number().integer().positive().optional(),
      weeks: Joi.number().integer().min(1).max(52).default(12),
      metric: Joi.string().valid('views', 'completions', 'time_spent', 'interactions').default('views')
    })
  },

  // Enrollment trends validation
  getEnrollmentTrends: {
    query: Joi.object({
      course_id: Joi.number().integer().positive().optional(),
      period: Joi.string().valid('day', 'week', 'month').default('month'),
      months: Joi.number().integer().min(1).max(24).default(6)
    })
  },

  // Lesson heatmap validation
  getLessonHeatmap: {
    query: Joi.object({
      course_id: Joi.number().integer().positive().required(),
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().min(Joi.ref('date_from')).optional()
    })
  },

  // Assessment statistics validation
  getAssessmentStats: {
    query: Joi.object({
      course_id: Joi.number().integer().positive().optional(),
      instructor_id: Joi.number().integer().positive().optional(),
      type: Joi.string().valid('quiz', 'assignment', 'both').default('both'),
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().min(Joi.ref('date_from')).optional()
    })
  },

  // User activity validation
  getUserActivity: {
    params: Joi.object({
      userId: Joi.number().integer().positive().required()
    }),
    query: Joi.object({
      days: Joi.number().integer().min(1).max(365).default(30),
      course_id: Joi.number().integer().positive().optional()
    })
  },

  // Export analytics validation
  exportAnalytics: {
    query: Joi.object({
      type: Joi.string().valid(
        'course_stats',
        'student_performance',
        'quiz_results',
        'assignment_results',
        'enrollment_data'
      ).required(),
      format: Joi.string().valid('csv', 'json').default('csv'),
      course_id: Joi.number().integer().positive().optional(),
      instructor_id: Joi.number().integer().positive().optional(),
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().min(Joi.ref('date_from')).optional()
    })
  },

  // Real-time dashboard validation
  getRealtimeDashboard: {
    query: Joi.object({
      course_id: Joi.number().integer().positive().optional(),
      refresh_interval: Joi.number().integer().min(5).max(300).default(30) // seconds
    })
  },

  // My performance validation (for students)
  getMyPerformance: {
    query: Joi.object({
      course_id: Joi.number().integer().positive().optional(),
      include_details: Joi.boolean().default(false),
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().min(Joi.ref('date_from')).optional()
    })
  },

  // My activity validation (for students)
  getMyActivity: {
    query: Joi.object({
      days: Joi.number().integer().min(1).max(365).default(30),
      course_id: Joi.number().integer().positive().optional(),
      activity_type: Joi.string().valid('all', 'lessons', 'quizzes', 'assignments').default('all')
    })
  },

  // Courses report validation (admin)
  getCoursesReport: {
    query: Joi.object({
      format: Joi.string().valid('csv', 'json', 'excel').default('csv'),
      include_stats: Joi.boolean().default(true),
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().min(Joi.ref('date_from')).optional(),
      status: Joi.string().valid('all', 'published', 'draft', 'archived').default('all')
    })
  },

  // Instructor students report validation (admin)
  getInstructorStudentsReport: {
    params: Joi.object({
      instructorId: Joi.number().integer().positive().required()
    }),
    query: Joi.object({
      format: Joi.string().valid('csv', 'json', 'excel').default('csv'),
      course_id: Joi.number().integer().positive().optional(),
      include_performance: Joi.boolean().default(true),
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().min(Joi.ref('date_from')).optional()
    })
  },

  // Grades report validation
  getGradesReport: {
    query: Joi.object({
      format: Joi.string().valid('csv', 'json', 'excel').default('csv'),
      course_id: Joi.number().integer().positive().optional(),
      student_id: Joi.number().integer().positive().optional(),
      assessment_type: Joi.string().valid('all', 'quiz', 'assignment').default('all'),
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().min(Joi.ref('date_from')).optional(),
      include_details: Joi.boolean().default(false)
    })
  }
};