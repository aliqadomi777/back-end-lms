import { EnrollmentsService } from '../services/enrollments.service.js';

export class EnrollmentsController {
  static async enrollInCourse(req, res, next) {
    try {
      const userId = req.user.id;
      const { course_id } = req.body;
      const result = await EnrollmentsService.enrollUser(userId, course_id);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Successfully enrolled in course'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyEnrollments(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, sort = 'enrolled_at', order = 'desc', status } = req.query;
      const filters = { status };
      const result = await EnrollmentsService.getUserEnrollments(userId, { page, limit, sort, order, filters });
      
      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
        message: 'Enrollments retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEnrollmentProgress(req, res, next) {
    try {
      const userId = req.user.id;
      const { course_id } = req.params;
      const result = await EnrollmentsService.getEnrollmentProgress(userId, course_id);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Enrollment progress retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProgress(req, res, next) {
    try {
      const userId = req.user.id;
      const { course_id } = req.params;
      const { lesson_id, completed = true } = req.body;
      const result = await EnrollmentsService.updateLessonProgress(userId, course_id, lesson_id, completed);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Progress updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCourseEnrollments(req, res, next) {
    try {
      const instructorId = req.user.id;
      const { course_id } = req.params;
      const { page = 1, limit = 10, sort = 'enrolled_at', order = 'desc', status } = req.query;
      const filters = { status };
      const result = await EnrollmentsService.getCourseEnrollments(course_id, instructorId, { page, limit, sort, order, filters });
      
      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
        message: 'Course enrollments retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllEnrollments(req, res, next) {
    try {
      const { page = 1, limit = 10, sort = 'enrolled_at', order = 'desc', status, course_id, user_id } = req.query;
      const filters = { status, course_id, user_id };
      const result = await EnrollmentsService.getAllEnrollments({ page, limit, sort, order, filters });
      
      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
        message: 'All enrollments retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async unenrollUser(req, res, next) {
    try {
      const userId = req.user.id;
      const { course_id } = req.params;
      await EnrollmentsService.unenrollUser(userId, course_id);
      
      res.status(200).json({
        success: true,
        data: null,
        message: 'Successfully unenrolled from course'
      });
    } catch (error) {
      next(error);
    }
  }

  static async generateCertificate(req, res, next) {
    try {
      const userId = req.user.id;
      const { course_id } = req.params;
      const result = await EnrollmentsService.generateCertificate(userId, course_id);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Certificate generated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEnrollmentStats(req, res, next) {
    try {
      const { course_id, start_date, end_date } = req.query;
      const result = await EnrollmentsService.getEnrollmentStats({ course_id, start_date, end_date });
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Enrollment statistics retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async exportEnrollments(req, res, next) {
    try {
      const { format = 'csv', course_id, start_date, end_date } = req.query;
      const result = await EnrollmentsService.exportEnrollments({ format, course_id, start_date, end_date });
      
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=enrollments.${format}`);
      res.send(result);
    } catch (error) {
      next(error);
    }
  }
}