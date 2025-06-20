/**
 * Module Model
 *
 * This model handles all database operations related to course modules,
 * including CRUD operations and content management.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { sanitizeString } from '../utils/validation.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class ModuleModel {
  /**
   * Find module by ID
   * @param {number} moduleId - Module ID
   * @param {Object} options - Query options
   * @returns {Object|null} Module data
   */
  static async findById(moduleId, options = {}) {
    try {
      const { includeLessons = false } = options;

      let query = db("course_modules")
        .select(
          "course_modules.*",
          "courses.title as course_title",
          "courses.instructor_id",
          "creator.name as created_by_name",
          "updater.name as updated_by_name"
        )
        .leftJoin("courses", "course_modules.course_id", "courses.id")
        .leftJoin("users as creator", "course_modules.created_by", "creator.id")
        .leftJoin("users as updater", "course_modules.updated_by", "updater.id")
        .where("course_modules.id", moduleId)
        .first();

      const module = await query;
      if (!module) return null;

      // Include lessons if requested
      if (includeLessons) {
        module.lessons = await db("course_lessons")
          .select("course_lessons.*")
          .where("course_lessons.module_id", moduleId)
          .orderBy("course_lessons.position");
      }

      return module;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new module
   * @param {Object} moduleData - Module data
   * @returns {Object} Created module
   */
  static async create(moduleData) {
    const trx = await db.transaction();
    try {
      let {
        course_id,
        title,
        description,
        position,
        is_published = false,
        created_by,
      } = moduleData;

      // Validate and sanitize required fields
      title = sanitizeString(title, { trim: true, maxLength: 255, allowEmpty: false });
      if (!title || !course_id || !created_by) {
        throw AppError.badRequest("Title, course ID, and creator are required");
      }

      // Validate course exists
      const course = await trx("courses").where("id", course_id).first();
      if (!course) {
        throw AppError.notFound("Course not found");
      }

      // If no position provided, set it to the next available
      let finalPosition = position;
      if (finalPosition === undefined) {
        const lastModule = await trx("course_modules")
          .where("course_id", course_id)
          .orderBy("position", "desc")
          .first();
        finalPosition = lastModule ? lastModule.position + 1 : 1;
      }

      const [moduleId] = await trx("course_modules")
        .insert({
          course_id,
          title,
          description: description ? sanitizeString(description, { trim: true, maxLength: 1000 }) : null,
          position: finalPosition,
          is_published,
          created_by,
          updated_by: created_by,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("id");
      await trx.commit();
      return await this.findById(moduleId);
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update module
   * @param {number} moduleId - Module ID
   * @param {Object} updateData - Update data
   * @param {number} updatedBy - User ID of updater
   * @returns {Object} Updated module
   */
  static async update(moduleId, updateData, updatedBy) {
    const trx = await db.transaction();
    try {
      const allowedFields = [
        "title",
        "description",
        "position",
        "is_published",
      ];
      const filteredData = {};
      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });
      if (Object.keys(filteredData).length === 0) {
        throw AppError.badRequest("No valid fields to update");
      }
      // Validate module exists
      const module = await trx("course_modules").where("id", moduleId).first();
      if (!module) {
        throw AppError.notFound("Module not found");
      }
      // Trim and sanitize text fields
      if (filteredData.title) {
        filteredData.title = sanitizeString(filteredData.title, { trim: true, maxLength: 255, allowEmpty: false });
      }
      if (filteredData.description) {
        filteredData.description = sanitizeString(filteredData.description, { trim: true, maxLength: 1000 });
      }
      filteredData.updated_by = updatedBy;
      filteredData.updated_at = db.fn.now();
      const [updatedModule] = await trx("course_modules")
        .where("id", moduleId)
        .update(filteredData)
        .returning("*");
      await trx.commit();
      return await this.findById(moduleId);
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete module
   * @param {number} moduleId - Module ID
   * @returns {boolean} Success status
   */
  static async delete(moduleId) {
    const trx = await db.transaction();
    try {
      // Validate module exists
      const module = await trx("course_modules").where("id", moduleId).first();
      if (!module) {
        throw AppError.notFound("Module not found");
      }
      // Get all lessons in this module
      const lessons = await trx("course_lessons")
        .where("module_id", moduleId)
        .select("id");
      const lessonIds = lessons.map((lesson) => lesson.id);
      if (lessonIds.length > 0) {
        // Check for lesson completions
        const completionCount = await trx("lesson_completions")
          .whereIn("lesson_id", lessonIds)
          .count("id as count")
          .first();
        if (parseInt(completionCount.count) > 0) {
          throw AppError.conflict("Cannot delete module with completed lessons");
        }
        // Check for lesson views
        const viewCount = await trx("lesson_views")
          .whereIn("lesson_id", lessonIds)
          .count("id as count")
          .first();
        if (parseInt(viewCount.count) > 0) {
          throw AppError.conflict("Cannot delete module with viewed lessons");
        }
        // Delete lessons
        await trx("course_lessons").whereIn("id", lessonIds).del();
      }
      // Delete the module
      await trx("course_modules").where("id", moduleId).del();
      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get modules by course
   * @param {number} courseId - Course ID
   * @param {Object} options - Query options
   * @returns {Object} Modules with pagination
   */
  static async getByCourse(courseId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      // Validate course exists
      const course = await db("courses").where("id", courseId).first();
      if (!course) {
        throw AppError.notFound("Course not found");
      }
      let query = db("course_modules")
        .select(
          "course_modules.*",
          "creator.name as created_by_name",
          "updater.name as updated_by_name"
        )
        .leftJoin("users as creator", "course_modules.created_by", "creator.id")
        .leftJoin("users as updater", "course_modules.updated_by", "updater.id")
        .where("course_modules.course_id", courseId)
        .orderBy("course_modules.position");
      if (typeof options.is_published === "boolean") {
        query = query.where("course_modules.is_published", options.is_published);
      }
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("course_modules.id as count");
      const total = parseInt(count);
      // Apply pagination
      const modules = await query.limit(params.limit).offset(params.offset);
      // Include lessons if requested
      if (options.includeLessons) {
        for (const module of modules) {
          module.lessons = await db("course_lessons")
            .select("course_lessons.*")
            .where("course_lessons.module_id", module.id)
            .orderBy("course_lessons.position");
        }
      }
      return {
        data: modules.map(ModuleModel.sanitizeModule),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Reorder modules
   * @param {number} courseId - Course ID
   * @param {Array} moduleOrders - Array of {id, position} objects
   * @returns {boolean} Success status
   */
  static async reorderModules(courseId, moduleOrders) {
    const trx = await db.transaction();
    try {
      // Validate course exists
      const course = await trx("courses").where("id", courseId).first();
      if (!course) {
        throw AppError.notFound("Course not found");
      }
      // Validate all modules belong to the course
      const moduleIds = moduleOrders.map((order) => order.id);
      const modules = await trx("course_modules")
        .whereIn("id", moduleIds)
        .where("course_id", courseId)
        .select("id");
      if (modules.length !== moduleIds.length) {
        throw AppError.badRequest("Invalid module IDs provided");
      }
      // Update positions
      for (const order of moduleOrders) {
        await trx("course_modules").where("id", order.id).update({
          position: order.position,
          updated_at: db.fn.now(),
        });
      }
      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update module publish status
   * @param {number} moduleId - Module ID
   * @param {boolean} isPublished - Publish status
   * @param {number} updatedBy - User ID of updater
   * @returns {Object} Updated module
   */
  static async updatePublishStatus(moduleId, isPublished, updatedBy) {
    const trx = await db.transaction();
    try {
      // Validate module exists
      const module = await trx("course_modules").where("id", moduleId).first();
      if (!module) {
        throw AppError.notFound("Module not found");
      }
      const [updatedModule] = await trx("course_modules")
        .where("id", moduleId)
        .update({
          is_published: isPublished,
          updated_by: updatedBy,
          updated_at: db.fn.now(),
        })
        .returning("*");
      await trx.commit();
      return updatedModule;
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Find module by ID with all lessons
   * @param {number} moduleId
   * @returns {Object|null} Module with lessons
   */
  static async findByIdWithLessons(moduleId) {
    const module = await this.findById(moduleId, { includeLessons: true });
    return module;
  }

  /**
   * Get max order index for modules in a course
   * @param {number} courseId
   * @returns {number} Max position
   */
  static async getMaxOrderIndex(courseId) {
    const max = await db('course_modules').where('course_id', courseId).max('position as max').first();
    return max?.max || 0;
  }

  /**
   * Duplicate a module and its lessons
   * @param {number} moduleId
   * @param {Object} options - { title, order_index }
   * @returns {Object} Duplicated module
   */
  static async duplicate(moduleId, { title, order_index }) {
    const trx = await db.transaction();
    try {
      // Get original module and lessons
      const origModule = await trx('course_modules').where('id', moduleId).first();
      if (!origModule) throw AppError.notFound('Module not found');
      const origLessons = await trx('course_lessons').where('module_id', moduleId);
      // Create new module
      const [newModuleId] = await trx('course_modules').insert({
        course_id: origModule.course_id,
        title: title || origModule.title + ' (Copy)',
        description: origModule.description,
        position: order_index || (origModule.position + 1),
        is_published: false,
        created_by: origModule.created_by,
        updated_by: origModule.updated_by,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      }).returning('id');
      // Duplicate lessons
      for (const lesson of origLessons) {
        await trx('course_lessons').insert({
          module_id: newModuleId,
          title: lesson.title,
          content_type: lesson.content_type,
          content_url: lesson.content_url,
          content_file_id: lesson.content_file_id,
          duration_minutes: lesson.duration_minutes,
          position: lesson.position,
          is_preview: lesson.is_preview,
          is_published: false,
          created_by: lesson.created_by,
          updated_by: lesson.updated_by,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        });
      }
      await trx.commit();
      return await this.findByIdWithLessons(newModuleId);
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get module progress for a user
   * @param {number} moduleId
   * @param {number} userId
   * @returns {Object} Progress stats
   */
  static async getModuleProgress(moduleId, userId) {
    // Get all lessons in the module
    const lessons = await db('course_lessons').where('module_id', moduleId).select('id');
    const lessonIds = lessons.map(l => l.id);
    if (lessonIds.length === 0) return { completed: 0, total: 0, percent: 0 };
    // Count completed lessons
    const completed = await db('lesson_completions').whereIn('lesson_id', lessonIds).andWhere('user_id', userId).count('id as count').first();
    const total = lessonIds.length;
    const percent = Math.round((parseInt(completed.count) / total) * 100);
    return { completed: parseInt(completed.count), total, percent };
  }

  static sanitizeModule(module) {
    if (!module) return null;
    // Remove or mask any internal fields
    const {
      deleted_at, // remove
      internal_notes, // remove
      ...publicFields
    } = module;
    return publicFields;
  }
}

export default ModuleModel;
