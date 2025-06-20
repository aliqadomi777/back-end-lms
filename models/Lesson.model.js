/**
 * Lesson Model
 *
 * This model handles all database operations related to course lessons,
 * including CRUD operations and content management.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { sanitizeString } from '../utils/validation.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class LessonModel {
  /**
   * Get all lessons for a specific module
   * @param {number} moduleId - The module ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Lessons with pagination
   */
  static async findByModuleId(moduleId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      // Validate module exists
      const module = await db("course_modules").where("id", moduleId).first();
      if (!module) {
        throw AppError.notFound("Module not found");
      }
      let query = db("course_lessons")
        .select(
          "course_lessons.*",
          "creator.name as created_by_name",
          "updater.name as updated_by_name",
          "file_uploads.file_path as content_file_path"
        )
        .leftJoin("users as creator", "course_lessons.created_by", "creator.id")
        .leftJoin("users as updater", "course_lessons.updated_by", "updater.id")
        .leftJoin(
          "file_uploads",
          "course_lessons.content_file_id",
          "file_uploads.id"
        )
        .where("course_lessons.module_id", moduleId)
        .orderBy("course_lessons.position");
      if (typeof options.is_published === "boolean") {
        query = query.where("course_lessons.is_published", options.is_published);
      }
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("course_lessons.id as count");
      const total = parseInt(count);
      // Apply pagination
      const lessons = await query.limit(params.limit).offset(params.offset);
      return {
        data: lessons.map(LessonModel.sanitizeLesson),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get a lesson by ID
   * @param {number} id - The lesson ID
   * @returns {Promise<Object|null>} Lesson object or null if not found
   */
  static async findById(id) {
    try {
      const lesson = await db("course_lessons")
        .select(
          "course_lessons.*",
          "course_modules.title as module_title",
          "course_modules.course_id",
          "courses.title as course_title",
          "creator.name as created_by_name",
          "updater.name as updated_by_name",
          "file_uploads.file_path as content_file_path"
        )
        .leftJoin(
          "course_modules",
          "course_lessons.module_id",
          "course_modules.id"
        )
        .leftJoin("courses", "course_modules.course_id", "courses.id")
        .leftJoin("users as creator", "course_lessons.created_by", "creator.id")
        .leftJoin("users as updater", "course_lessons.updated_by", "updater.id")
        .leftJoin(
          "file_uploads",
          "course_lessons.content_file_id",
          "file_uploads.id"
        )
        .where("course_lessons.id", id)
        .first();

      return lesson || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new lesson
   * @param {Object} lessonData - The lesson data
   * @returns {Promise<Object>} Created lesson
   */
  static async create(lessonData) {
    const trx = await db.transaction();
    try {
      let {
        module_id,
        title,
        content_type,
        content_url,
        content_file_id,
        duration_minutes,
        position,
        is_preview = false,
        is_published = false,
        created_by,
      } = lessonData;
      // Validate and sanitize required fields
      title = sanitizeString(title, { trim: true, maxLength: 255, allowEmpty: false });
      if (!title || !module_id || !content_type || !created_by) {
        throw AppError.badRequest("Title, module ID, content type, and creator are required");
      }
      // Validate module exists
      const module = await trx("course_modules").where("id", module_id).first();
      if (!module) {
        throw AppError.notFound("Module not found");
      }
      // Validate content type
      const validContentTypes = ["video", "text", "pdf", "quiz", "assignment"];
      if (!validContentTypes.includes(content_type)) {
        throw AppError.badRequest("Invalid content type");
      }
      // Validate content file if provided
      if (content_file_id) {
        const file = await trx("file_uploads")
          .where("id", content_file_id)
          .first();
        if (!file) {
          throw AppError.notFound("Content file not found");
        }
      }
      // If no position provided, set it to the next available
      let finalPosition = position;
      if (finalPosition === undefined) {
        const lastLesson = await trx("course_lessons")
          .where("module_id", module_id)
          .orderBy("position", "desc")
          .first();
        finalPosition = lastLesson ? lastLesson.position + 1 : 1;
      }
      const [lessonId] = await trx("course_lessons")
        .insert({
          module_id,
          title,
          content_type,
          content_url,
          content_file_id,
          duration_minutes,
          position: finalPosition,
          is_preview,
          is_published,
          created_by,
          updated_by: created_by,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("id");
      await trx.commit();
      return await this.findById(lessonId);
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update a lesson
   * @param {number} id - The lesson ID
   * @param {Object} updateData - The data to update
   * @param {number} updatedBy - User ID of updater
   * @returns {Promise<Object|null>} Updated lesson or null if not found
   */
  static async update(id, updateData, updatedBy) {
    const trx = await db.transaction();
    try {
      const allowedFields = [
        "title",
        "content_type",
        "content_url",
        "content_file_id",
        "duration_minutes",
        "position",
        "is_published",
        "is_preview",
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
      // Validate lesson exists
      const lesson = await trx("course_lessons").where("id", id).first();
      if (!lesson) {
        throw AppError.notFound("Lesson not found");
      }
      // Validate content type if being updated
      if (filteredData.content_type) {
        const validContentTypes = [
          "video",
          "text",
          "pdf",
          "quiz",
          "assignment",
        ];
        if (!validContentTypes.includes(filteredData.content_type)) {
          throw AppError.badRequest("Invalid content type");
        }
      }
      // Validate content file if being updated
      if (filteredData.content_file_id) {
        const file = await trx("file_uploads")
          .where("id", filteredData.content_file_id)
          .first();
        if (!file) {
          throw AppError.notFound("Content file not found");
        }
      }
      // Trim and sanitize text fields
      if (filteredData.title) {
        filteredData.title = sanitizeString(filteredData.title, { trim: true, maxLength: 255, allowEmpty: false });
      }
      filteredData.updated_by = updatedBy;
      filteredData.updated_at = db.fn.now();
      const [updatedLesson] = await trx("course_lessons")
        .where("id", id)
        .update(filteredData)
        .returning("*");
      await trx.commit();
      return updatedLesson;
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete a lesson
   * @param {number} id - The lesson ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async delete(id) {
    const trx = await db.transaction();
    try {
      // Validate lesson exists
      const lesson = await trx("course_lessons").where("id", id).first();
      if (!lesson) {
        throw AppError.notFound("Lesson not found");
      }
      // Check for lesson completions
      const completionCount = await trx("lesson_completions")
        .where("lesson_id", id)
        .count("id as count")
        .first();
      if (parseInt(completionCount.count) > 0) {
        throw AppError.conflict("Cannot delete lesson with completions");
      }
      // Check for lesson views
      const viewCount = await trx("lesson_views")
        .where("lesson_id", id)
        .count("id as count")
        .first();
      if (parseInt(viewCount.count) > 0) {
        throw AppError.conflict("Cannot delete lesson with views");
      }
      // Delete the lesson
      await trx("course_lessons").where("id", id).del();
      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get all lessons for a course
   * @param {number} courseId - The course ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Lessons with pagination
   */
  static async findByCourseId(courseId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      // Validate course exists
      const course = await db("courses").where("id", courseId).first();
      if (!course) {
        throw AppError.notFound("Course not found");
      }
      let query = db("course_lessons")
        .select(
          "course_lessons.*",
          "course_modules.title as module_title",
          "creator.name as created_by_name",
          "updater.name as updated_by_name",
          "file_uploads.file_path as content_file_path"
        )
        .join("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("users as creator", "course_lessons.created_by", "creator.id")
        .leftJoin("users as updater", "course_lessons.updated_by", "updater.id")
        .leftJoin(
          "file_uploads",
          "course_lessons.content_file_id",
          "file_uploads.id"
        )
        .where("course_modules.course_id", courseId)
        .orderBy("course_modules.position")
        .orderBy("course_lessons.position");
      if (typeof options.is_published === "boolean") {
        query = query.where("course_lessons.is_published", options.is_published);
      }
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("course_lessons.id as count");
      const total = parseInt(count);
      // Apply pagination
      const lessons = await query.limit(params.limit).offset(params.offset);
      return {
        data: lessons.map(LessonModel.sanitizeLesson),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Reorder lessons
   * @param {number} moduleId - The module ID
   * @param {Array} lessonOrders - Array of {id, position} objects
   * @returns {Promise<boolean>} Success status
   */
  static async updateOrder(moduleId, lessonOrders) {
    const trx = await db.transaction();
    try {
      // Validate module exists
      const module = await trx("course_modules").where("id", moduleId).first();
      if (!module) {
        throw AppError.notFound("Module not found");
      }
      // Validate all lessons belong to the module
      const lessonIds = lessonOrders.map((order) => order.id);
      const lessons = await trx("course_lessons")
        .whereIn("id", lessonIds)
        .where("module_id", moduleId)
        .select("id");
      if (lessons.length !== lessonIds.length) {
        throw AppError.badRequest("Invalid lesson IDs provided");
      }
      // Update positions
      for (const order of lessonOrders) {
        await trx("course_lessons").where("id", order.id).update({
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
   * Update lesson publish status
   * @param {number} id - The lesson ID
   * @param {boolean} isPublished - Publish status
   * @param {number} updatedBy - User ID of updater
   * @returns {Promise<Object>} Updated lesson
   */
  static async updatePublishStatus(id, isPublished, updatedBy) {
    const trx = await db.transaction();
    try {
      // Validate lesson exists
      const lesson = await trx("course_lessons").where("id", id).first();
      if (!lesson) {
        throw AppError.notFound("Lesson not found");
      }
      const [updatedLesson] = await trx("course_lessons")
        .where("id", id)
        .update({
          is_published: isPublished,
          updated_by: updatedBy,
          updated_at: db.fn.now(),
        })
        .returning("*");
      await trx.commit();
      return updatedLesson;
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get lesson progress for a user
   * @param {number} lessonId - The lesson ID
   * @param {number} userId - The user ID
   * @returns {Promise<Object|null>} Progress object or null
   */
  static async getProgress(lessonId, userId) {
    try {
      const completion = await db("lesson_completions")
        .where({
          lesson_id: lessonId,
          user_id: userId,
        })
        .first();

      const views = await db("lesson_views")
        .where({
          lesson_id: lessonId,
          user_id: userId,
        })
        .sum("duration_seconds as total_duration")
        .first();

      return {
        is_completed: !!completion,
        completed_at: completion?.completed_at || null,
        total_duration: parseInt(views?.total_duration || 0),
        last_viewed: views?.viewed_at || null,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update lesson progress for a user
   * @param {number} lessonId - The lesson ID
   * @param {number} userId - The user ID
   * @param {Object} progressData - Progress data
   * @returns {Promise<Object>} Updated progress
   */
  static async updateProgress(lessonId, userId, progressData) {
    const trx = await db.transaction();

    try {
      const { is_completed, duration_seconds } = progressData;

      // Update or create lesson view
      if (duration_seconds) {
        await trx("lesson_views").insert({
          lesson_id: lessonId,
          user_id: userId,
          duration_seconds,
          viewed_at: db.fn.now(),
        });
      }

      // Handle completion status
      if (is_completed) {
        const existingCompletion = await trx("lesson_completions")
          .where({
            lesson_id: lessonId,
            user_id: userId,
          })
          .first();

        if (!existingCompletion) {
          await trx("lesson_completions").insert({
            lesson_id: lessonId,
            user_id: userId,
            completed_at: db.fn.now(),
          });
        }
      } else {
        await trx("lesson_completions")
          .where({
            lesson_id: lessonId,
            user_id: userId,
          })
          .del();
      }

      await trx.commit();
      return await this.getProgress(lessonId, userId);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  static sanitizeLesson(lesson) {
    if (!lesson) return null;
    // Remove or mask any internal fields if needed
    // For now, just return the lesson as is
    return lesson;
  }
}

export default LessonModel;
