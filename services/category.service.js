import CategoryModel from "../models/Category.model.js";
import { AppError } from "../utils/AppError.js";

export class CategoryService {
  static async getAllCategories() {
    return await CategoryModel.getAll();
  }

  static async getCategoryById(id) {
    const category = await CategoryModel.getById(id);
    if (!category) throw AppError.notFound("Category not found");
    return category;
  }

  static async createCategory(data) {
    return await CategoryModel.create(data);
  }

  static async updateCategory(id, data) {
    return await CategoryModel.update(id, data);
  }

  static async deleteCategory(id) {
    return await CategoryModel.delete(id);
  }
}
