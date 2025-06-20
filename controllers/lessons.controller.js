import { LessonsService } from '../services/lessons.service.js';

export class LessonsController {
  static async createLesson(req, res, next) {
    try {
      const instructorId = req.user.id;
      const { module_id } = req.params;
      const lessonData = { ...req.body, module_id };
      const result = await LessonsService.createLesson(lessonData, instructorId);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Lesson created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getModuleLessons(req, res, next) {
    try {
      const { module_id } = req.params;
      const userId = req.user?.id;
      const result = await LessonsService.getModuleLessons(module_id, userId);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Module lessons retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLessonById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await LessonsService.getLessonById(id, userId);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Lesson retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateLesson(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      const updateData = req.body;
      const result = await LessonsService.updateLesson(id, instructorId, updateData);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Lesson updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteLesson(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      await LessonsService.deleteLesson(id, instructorId);
      
      res.status(200).json({
        success: true,
        data: null,
        message: 'Lesson deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async reorderLessons(req, res, next) {
    try {
      const { module_id } = req.params;
      const instructorId = req.user.id;
      const { lesson_orders } = req.body;
      const result = await LessonsService.reorderLessons(module_id, instructorId, lesson_orders);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Lessons reordered successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async markLessonComplete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const result = await LessonsService.markLessonComplete(id, userId);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Lesson marked as complete'
      });
    } catch (error) {
      next(error);
    }
  }

  static async markLessonIncomplete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const result = await LessonsService.markLessonIncomplete(id, userId);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Lesson marked as incomplete'
      });
    } catch (error) {
      next(error);
    }
  }

  static async trackLessonView(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { duration_watched } = req.body;
      const result = await LessonsService.trackLessonView(id, userId, duration_watched);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Lesson view tracked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async duplicateLesson(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      const result = await LessonsService.duplicateLesson(id, instructorId);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Lesson duplicated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}