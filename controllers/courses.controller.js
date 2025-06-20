import { CoursesService } from '../services/courses.service.js';

export class CoursesController {
  static async createCourse(req, res, next) {
    try {
      const instructorId = req.user.id;
      const courseData = { ...req.body, instructor_id: instructorId };
      const result = await CoursesService.createCourse(courseData);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Course created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllCourses(req, res, next) {
    try {
      const { page = 1, limit = 10, sort = 'created_at', order = 'desc', search = '', category_id, level, status } = req.query;
      const filters = { category_id, level, status };
      const result = await CoursesService.getAllCourses({ page, limit, sort, order, search, filters });
      
      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
        message: 'Courses retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCourseById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await CoursesService.getCourseById(id, userId);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Course retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateCourse(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      const updateData = req.body;
      const result = await CoursesService.updateCourse(id, instructorId, updateData);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Course updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCourse(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      await CoursesService.deleteCourse(id, instructorId);
      
      res.status(200).json({
        success: true,
        data: null,
        message: 'Course deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async publishCourse(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      const result = await CoursesService.publishCourse(id, instructorId);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Course published successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async unpublishCourse(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      const result = await CoursesService.unpublishCourse(id, instructorId);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Course unpublished successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getInstructorCourses(req, res, next) {
    try {
      const instructorId = req.user.id;
      const { page = 1, limit = 10, sort = 'created_at', order = 'desc', search = '', status } = req.query;
      const filters = { status };
      const result = await CoursesService.getInstructorCourses(instructorId, { page, limit, sort, order, search, filters });
      
      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
        message: 'Instructor courses retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCourseAnalytics(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      const result = await CoursesService.getCourseAnalytics(id, instructorId);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Course analytics retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async approveCourse(req, res, next) {
    try {
      const { id } = req.params;
      const result = await CoursesService.approveCourse(id);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Course approved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async rejectCourse(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await CoursesService.rejectCourse(id, reason);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Course rejected successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}