import { AnalyticsService } from '../services/analytics.service.js';

export class AnalyticsController {
  /**
   * Get instructor dashboard analytics
   * GET /api/analytics/instructor/:instructorId
   */
  static async getInstructorDashboard(req, res, next) {
    try {
      const { instructorId } = req.params;
      const { course_id, date_from, date_to } = req.query;

      // Ensure instructor can only access their own data or admin can access any
      if (req.user.role !== 'admin' && req.user.id !== parseInt(instructorId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own analytics.'
        });
      }

      const analytics = await AnalyticsService.getInstructorDashboard(instructorId, {
        course_id,
        date_from,
        date_to
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get admin dashboard metrics
   * GET /api/analytics/admin
   */
  static async getAdminMetrics(req, res, next) {
    try {
      const { date_from, date_to, period = 'month' } = req.query;

      const metrics = await AnalyticsService.getAdminMetrics({
        date_from,
        date_to,
        period
      });

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get admin dashboard analytics
   * GET /api/analytics/admin/dashboard
   */
  static async getAdminDashboard(req, res, next) {
    try {
      const { date_from, date_to } = req.query;

      const analytics = await AnalyticsService.getAdminDashboard({
        date_from,
        date_to
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate course statistics
   * GET /api/analytics/courses/:courseId
   */
  static async generateCourseStats(req, res, next) {
    try {
      const { courseId } = req.params;
      const { include_students = false } = req.query;

      const stats = await AnalyticsService.getCourseStatistics(courseId, {
        includeStudents: include_students === 'true'
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get course student performance
   * GET /api/analytics/courses/:courseId/students
   */
  static async getCourseStudentPerformance(req, res, next) {
    try {
      const { courseId } = req.params;
      const { limit = 50, sort_by = 'overall_score' } = req.query;

      const students = await AnalyticsService.getCourseStudentPerformance(courseId, {
        limit: parseInt(limit),
        sortBy: sort_by
      });

      res.json({
        success: true,
        data: students
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top performing students
   * GET /api/analytics/students/top
   */
  static async getTopStudents(req, res, next) {
    try {
      const { course_id, limit = 10, metric = 'overall_score' } = req.query;

      const students = await AnalyticsService.getTopStudents({
        course_id,
        limit: parseInt(limit),
        metric
      });

      res.json({
        success: true,
        data: students
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get weekly engagement trends
   * GET /api/analytics/engagement/weekly
   */
  static async getWeeklyEngagementTrends(req, res, next) {
    try {
      const { course_id, weeks = 12 } = req.query;

      const trends = await AnalyticsService.getWeeklyEngagementTrends({
        course_id,
        weeks: parseInt(weeks)
      });

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student performance analytics
   * GET /api/analytics/students/:studentId
   */
  static async getStudentPerformance(req, res, next) {
    try {
      const { studentId } = req.params;
      const { course_id } = req.query;

      // Ensure student can only access their own data or instructor/admin can access
      if (req.user.role === 'student' && req.user.id !== parseInt(studentId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own performance.'
        });
      }

      const performance = await AnalyticsService.getStudentPerformance(studentId, {
        course_id
      });

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my performance analytics
   * GET /api/analytics/my/performance
   */
  static async getMyPerformance(req, res, next) {
    try {
      const { course_id } = req.query;
      const userId = req.user.id;

      const performance = await AnalyticsService.getStudentPerformance(userId, {
        course_id
      });

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my activity analytics
   * GET /api/analytics/my/activity
   */
  static async getMyActivity(req, res, next) {
    try {
      const { course_id, date_from, date_to } = req.query;
      const userId = req.user.id;

      const activity = await AnalyticsService.getUserActivity(userId, {
        course_id,
        date_from,
        date_to
      });

      res.json({
        success: true,
        data: activity
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get courses report (Admin only)
   * GET /api/analytics/admin/reports/courses
   */
  static async getCoursesReport(req, res, next) {
    try {
      const { date_from, date_to, format = 'json' } = req.query;

      const report = await AnalyticsService.getCoursesReport({
        date_from,
        date_to,
        format
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="courses_report.csv"');
      }

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get instructor students report (Admin only)
   * GET /api/analytics/instructor/:instructorId/reports/students
   */
  static async getInstructorStudentsReport(req, res, next) {
    try {
      const { instructorId } = req.params;
      const { course_id, date_from, date_to, format = 'json' } = req.query;

      const report = await AnalyticsService.getInstructorStudentsReport(instructorId, {
        course_id,
        date_from,
        date_to,
        format
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="instructor_students_report.csv"');
      }

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get grades report
   * GET /api/analytics/reports/grades
   */
  static async getGradesReport(req, res, next) {
    try {
      const { course_id, date_from, date_to, format = 'json' } = req.query;

      const report = await AnalyticsService.getGradesReport({
        course_id,
        date_from,
        date_to,
        format
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="grades_report.csv"');
      }

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get system health (Admin only)
   * GET /api/analytics/admin/system/health
   */
  static async getSystemHealth(req, res, next) {
    try {
      const health = await AnalyticsService.getSystemHealth();

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get lesson completion heatmap
   * GET /api/analytics/lessons/heatmap
   */
  static async getLessonCompletionHeatmap(req, res, next) {
    try {
      const { course_id, date_from, date_to } = req.query;

      if (!course_id) {
        return res.status(400).json({
          success: false,
          message: 'Course ID is required'
        });
      }

      const heatmap = await AnalyticsService.getLessonCompletionHeatmap(course_id, {
        date_from,
        date_to
      });

      res.json({
        success: true,
        data: heatmap
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get quiz and assignment statistics
   * GET /api/analytics/assessments
   */
  static async getAssessmentStats(req, res, next) {
    try {
      const { course_id, instructor_id, type } = req.query;

      const stats = await AnalyticsService.getAssessmentStatistics({
        course_id,
        instructor_id,
        type // 'quiz' or 'assignment'
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get course enrollment trends
   * GET /api/analytics/enrollments/trends
   */
  static async getEnrollmentTrends(req, res, next) {
    try {
      const { course_id, period = 'month', months = 6 } = req.query;

      const trends = await AnalyticsService.getEnrollmentTrends({
        course_id,
        period,
        months: parseInt(months)
      });

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user activity summary
   * GET /api/analytics/activity/:userId
   */
  static async getUserActivitySummary(req, res, next) {
    try {
      const { userId } = req.params;
      const { days = 30 } = req.query;

      // Ensure user can only access their own data or admin/instructor can access
      if (req.user.role === 'student' && req.user.id !== parseInt(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own activity.'
        });
      }

      const activity = await AnalyticsService.getUserActivitySummary(userId, {
        days: parseInt(days)
      });

      res.json({
        success: true,
        data: activity
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export analytics data
   * GET /api/analytics/export
   */
  static async exportAnalytics(req, res, next) {
    try {
      const { type, format = 'csv', course_id, instructor_id, date_from, date_to } = req.query;

      if (!type) {
        return res.status(400).json({
          success: false,
          message: 'Export type is required'
        });
      }

      const exportData = await AnalyticsService.exportAnalytics({
        type,
        format,
        course_id,
        instructor_id,
        date_from,
        date_to
      });

      // Set appropriate headers for file download
      const filename = `analytics_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');

      res.send(exportData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get real-time dashboard data
   * GET /api/analytics/realtime
   */
  static async getRealtimeDashboard(req, res, next) {
    try {
      const { course_id } = req.query;

      const realtimeData = await AnalyticsService.getRealtimeDashboard({
        course_id,
        user_id: req.user.id,
        user_role: req.user.role
      });

      res.json({
        success: true,
        data: realtimeData
      });
    } catch (error) {
      next(error);
    }
  }
}