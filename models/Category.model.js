/**
 * Category Model
 *
 * Simple model for grouping courses under categories.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class CategoryModel {
  /**
   * Get all categories
   * @param {Object} options - Pagination options
   * @returns {Object} { data, pagination }
   */
  static async getAll(options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("course_categories").select("*").orderBy("name", "asc");
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("id as count");
      const total = parseInt(count);
      const categories = await query.limit(params.limit).offset(params.offset);
      return {
        data: categories.map(CategoryModel.sanitizeCategory),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get category by ID
   * @param {number} id - Category ID
   * @returns {Object|null} Category or null
   */
  static async findById(id) {
    try {
      const category = await db("course_categories")
        .where("id", id)
        .first();
      return CategoryModel.sanitizeCategory(category);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Create a new category
   * @param {Object} data - Category data (name, description)
   * @returns {Object} Created category
   */
  static async create(data) {
    try {
      const { name, description } = data;
      if (!name || !name.trim()) {
        throw AppError.badRequest("Category name is required");
      }
      // Check if name already exists
      const existing = await db("course_categories")
        .where("name", name.trim())
        .first();
      if (existing) {
        throw AppError.conflict("Category name already exists");
      }
      const [category] = await db("course_categories")
        .insert({
          name: name.trim(),
          description: description ? description.trim() : null,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("*");
      return CategoryModel.sanitizeCategory(category);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update category
   * @param {number} id - Category ID
   * @param {Object} data - Update data
   * @returns {Object} Updated category
   */
  static async update(id, data) {
    try {
      const { name, description } = data;
      // Check if category exists
      const category = await db("course_categories").where("id", id).first();
      if (!category) {
        throw AppError.notFound("Category not found");
      }
      const updateData = {};
      if (name !== undefined) {
        if (!name || !name.trim()) {
          throw AppError.badRequest("Category name cannot be empty");
        }
        updateData.name = name.trim();
        // Check if new name already exists
        const existing = await db("course_categories")
          .where("name", name.trim())
          .where("id", "!=", id)
          .first();
        if (existing) {
          throw AppError.conflict("Category name already exists");
        }
      }
      if (description !== undefined) {
        updateData.description = description ? description.trim() : null;
      }
      if (Object.keys(updateData).length === 0) {
        throw AppError.badRequest("No valid fields to update");
      }
      updateData.updated_at = db.fn.now();
      const [updatedCategory] = await db("course_categories")
        .where("id", id)
        .update(updateData)
        .returning("*");
      return CategoryModel.sanitizeCategory(updatedCategory);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete category
   * @param {number} id - Category ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    try {
      // Check if category exists
      const category = await db("course_categories").where("id", id).first();
      if (!category) {
        throw AppError.notFound("Category not found");
      }
      // Check if category has courses
      const courseCount = await db("courses")
        .where("category_id", id)
        .count("id as count")
        .first();
      if (parseInt(courseCount.count) > 0) {
        throw AppError.conflict("Cannot delete category with associated courses");
      }
      await db("course_categories").where("id", id).del();
      return true;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get courses in a category
   * @param {number} categoryId - Category ID
   * @param {Object} options - Pagination options
   * @returns {Object} { data, pagination }
   */
  static async getCourses(categoryId, options = {}) {
    try {
      // Check if category exists
      const category = await db("course_categories").where("id", categoryId).first();
      if (!category) {
        throw AppError.notFound("Category not found");
      }
      const params = parsePaginationParams(options);
      let query = db("courses")
        .select("courses.*", "users.name as instructor_name")
        .leftJoin("users", "courses.instructor_id", "users.id")
        .where("courses.category_id", categoryId)
        .orderBy("courses.created_at", "desc");
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("courses.id as count");
      const total = parseInt(count);
      const courses = await query.limit(params.limit).offset(params.offset);
      return {
        data: courses,
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  static sanitizeCategory(category) {
    if (!category) return null;
    const { id, name, description, created_at, updated_at } = category;
    return { id, name, description, created_at, updated_at };
  }
}

export default CategoryModel;
