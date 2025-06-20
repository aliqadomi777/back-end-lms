import { ModulesService } from '../services/modules.service.js';

export class ModulesController {
  static async createModule(req, res, next) {
    try {
      const instructorId = req.user.id;
      const { course_id } = req.params;
      const moduleData = { ...req.body, course_id };
      const result = await ModulesService.createModule(moduleData, instructorId);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Module created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCourseModules(req, res, next) {
    try {
      const { course_id } = req.params;
      const userId = req.user?.id;
      const result = await ModulesService.getCourseModules(course_id, userId);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Course modules retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getModuleById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await ModulesService.getModuleById(id, userId);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Module retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateModule(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      const updateData = req.body;
      const result = await ModulesService.updateModule(id, instructorId, updateData);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Module updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteModule(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      await ModulesService.deleteModule(id, instructorId);
      
      res.status(200).json({
        success: true,
        data: null,
        message: 'Module deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async reorderModules(req, res, next) {
    try {
      const { course_id } = req.params;
      const instructorId = req.user.id;
      const { module_orders } = req.body;
      const result = await ModulesService.reorderModules(course_id, instructorId, module_orders);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Modules reordered successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async duplicateModule(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      const result = await ModulesService.duplicateModule(id, instructorId);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Module duplicated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getModuleProgress(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const result = await ModulesService.getModuleProgress(id, userId);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Module progress retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}