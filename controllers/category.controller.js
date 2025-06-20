import { CategoryService } from "../services/category.service.js";
import {
  validateCategory,
  validateCategoryUpdate,
} from "../validators/category.validator.js";
import { AppError } from "../utils/AppError.js";

export class CategoryController {
  static async getAllCategories(req, res, next) {
    try {
      const categories = await CategoryService.getAllCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryById(req, res, next) {
    try {
      const { id } = req.params;
      const category = await CategoryService.getCategoryById(id);
      res.status(200).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req, res, next) {
    try {
      const { error } = validateCategory(req.body);
      if (error) throw AppError.badRequest(error.details[0].message);
      const category = await CategoryService.createCategory(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const { error } = validateCategoryUpdate(req.body);
      if (error) throw AppError.badRequest(error.details[0].message);
      const category = await CategoryService.updateCategory(id, req.body);
      res.status(200).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;
      await CategoryService.deleteCategory(id);
      res.status(204).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
