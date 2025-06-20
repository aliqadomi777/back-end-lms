/**
 * LessonView Model
 *
 * Tracks lesson viewing analytics and engagement metrics.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class LessonViewModel {
  /**
   * Get view by ID
   * @param {number} id - View ID
   * @returns {Object|null} View or null
   */
  static async findById(id) {
    try {
      return await db("lesson_views")
        .select(
          "lesson_views.*",
          "course_lessons.title as lesson_title",
          "course_lessons.content_type",
          "course_modules.title as module_title",
          "courses.title as course_title",
          "users.name as student_name"
        )
        .leftJoin("course_lessons", "lesson_views.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("courses", "course_modules.course_id", "courses.id")
        .leftJoin("users", "lesson_views.user_id", "users.id")
        .where("lesson_views.id", id)
        .first();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get views by user and lesson
   * @param {number} userId - User ID
   * @param {number} lessonId - Lesson ID
   * @returns {Array} User's views for the lesson
   */
  static async getByUserAndLesson(userId, lessonId) {
    try {
      return await db("lesson_views")
        .where({
          user_id: userId,
          lesson_id: lessonId
        })
        .orderBy("viewed_at", "desc");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all views for user
   * @param {number} userId - User ID
   * @returns {Array} User's lesson views
   */
  static async getByUser(userId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("lesson_views")
        .select(
          "lesson_views.*",
          "course_lessons.title as lesson_title",
          "course_lessons.content_type",
          "course_modules.title as module_title",
          "courses.title as course_title"
        )
        .leftJoin("course_lessons", "lesson_views.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("courses", "course_modules.course_id", "courses.id")
        .where("lesson_views.user_id", userId);
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("lesson_views.id as count");
      const total = parseInt(count);
      const views = await query.orderBy("lesson_views.viewed_at", "desc").limit(params.limit).offset(params.offset);
      return {
        data: views.map(LessonViewModel.sanitizeView),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get views for a lesson
   * @param {number} lessonId - Lesson ID
   * @returns {Array} Lesson views
   */
  static async getByLesson(lessonId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("lesson_views")
        .select(
          "lesson_views.*",
          "users.name as student_name",
          "users.email as student_email"
        )
        .leftJoin("users", "lesson_views.user_id", "users.id")
        .where("lesson_views.lesson_id", lessonId);
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("lesson_views.id as count");
      const total = parseInt(count);
      const views = await query.orderBy("lesson_views.viewed_at", "desc").limit(params.limit).offset(params.offset);
      return {
        data: views.map(LessonViewModel.sanitizeView),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get views for a course
   * @param {number} courseId - Course ID
   * @returns {Array} Course lesson views
   */
  static async getByCourse(courseId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("lesson_views")
        .select(
          "lesson_views.*",
          "course_lessons.title as lesson_title",
          "course_modules.title as module_title",
          "users.name as student_name"
        )
        .leftJoin("course_lessons", "lesson_views.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("users", "lesson_views.user_id", "users.id")
        .where("course_modules.course_id", courseId);
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("lesson_views.id as count");
      const total = parseInt(count);
      const views = await query.orderBy("lesson_views.viewed_at", "desc").limit(params.limit).offset(params.offset);
      return {
        data: views.map(LessonViewModel.sanitizeView),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Record a lesson view
   * @param {number} userId - User ID
   * @param {number} lessonId - Lesson ID
   * @param {number} durationSeconds - View duration in seconds
   * @returns {Object} Created view record
   */
  static async recordView(userId, lessonId, durationSeconds = 0) {
    try {
      // Validate user exists
      const user = await db("users").where("id", userId).first();
      if (!user) {
        throw new Error("User not found");
      }

      // Validate lesson exists
      const lesson = await db("course_lessons").where("id", lessonId).first();
      if (!lesson) {
        throw new Error("Lesson not found");
      }

      // Validate duration
      if (durationSeconds < 0) {
        throw new Error("Duration cannot be negative");
      }

      const [view] = await db("lesson_views")
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          duration_seconds: durationSeconds,
          viewed_at: db.fn.now()
        })
        .returning("*");

      return view;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update view duration
   * @param {number} id - View ID
   * @param {number} durationSeconds - New duration in seconds
   * @returns {Object} Updated view record
   */
  static async updateDuration(id, durationSeconds) {
    try {
      // Check if view exists
      const view = await db("lesson_views").where("id", id).first();
      if (!view) {
        throw new Error("View record not found");
      }

      // Validate duration
      if (durationSeconds < 0) {
        throw new Error("Duration cannot be negative");
      }

      const [updatedView] = await db("lesson_views")
        .where("id", id)
        .update({
          duration_seconds: durationSeconds
        })
        .returning("*");

      return updatedView;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete view by ID
   * @param {number} id - View ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    try {
      // Check if view exists
      const view = await db("lesson_views").where("id", id).first();
      if (!view) {
        throw new Error("View record not found");
      }

      await db("lesson_views").where("id", id).del();
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get lesson engagement statistics
   * @param {number} lessonId - Lesson ID
   * @returns {Object} Lesson engagement statistics
   */
  static async getLessonEngagement(lessonId) {
    try {
      const totalViews = await db("lesson_views")
        .where("lesson_id", lessonId)
        .count("id as count")
        .first();

      const uniqueViewers = await db("lesson_views")
        .where("lesson_id", lessonId)
        .distinct("user_id")
        .count("user_id as count")
        .first();

      const avgDuration = await db("lesson_views")
        .where("lesson_id", lessonId)
        .avg("duration_seconds as avg_duration")
        .first();

      const totalDuration = await db("lesson_views")
        .where("lesson_id", lessonId)
        .sum("duration_seconds as total_duration")
        .first();

      return {
        totalViews: parseInt(totalViews.count),
        uniqueViewers: parseInt(uniqueViewers.count),
        averageDuration: Math.round(parseFloat(avgDuration.avg_duration) || 0),
        totalDuration: parseInt(totalDuration.total_duration) || 0
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user engagement statistics
   * @param {number} userId - User ID
   * @returns {Object} User engagement statistics
   */
  static async getUserEngagement(userId) {
    try {
      const totalViews = await db("lesson_views")
        .where("user_id", userId)
        .count("id as count")
        .first();

      const uniqueLessons = await db("lesson_views")
        .where("user_id", userId)
        .distinct("lesson_id")
        .count("lesson_id as count")
        .first();

      const totalDuration = await db("lesson_views")
        .where("user_id", userId)
        .sum("duration_seconds as total_duration")
        .first();

      const avgDuration = await db("lesson_views")
        .where("user_id", userId)
        .avg("duration_seconds as avg_duration")
        .first();

      return {
        totalViews: parseInt(totalViews.count),
        uniqueLessons: parseInt(uniqueLessons.count),
        totalDuration: parseInt(totalDuration.total_duration) || 0,
        averageDuration: Math.round(parseFloat(avgDuration.avg_duration) || 0)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get course engagement statistics
   * @param {number} courseId - Course ID
   * @returns {Object} Course engagement statistics
   */
  static async getCourseEngagement(courseId) {
    try {
      const totalViews = await db("lesson_views")
        .select("lesson_views.lesson_id")
        .leftJoin("course_lessons", "lesson_views.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .where("course_modules.course_id", courseId)
        .count("lesson_views.id as count")
        .first();

      const uniqueViewers = await db("lesson_views")
        .select("lesson_views.user_id")
        .leftJoin("course_lessons", "lesson_views.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .where("course_modules.course_id", courseId)
        .distinct("lesson_views.user_id")
        .count("lesson_views.user_id as count")
        .first();

      const totalDuration = await db("lesson_views")
        .select("lesson_views.duration_seconds")
        .leftJoin("course_lessons", "lesson_views.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .where("course_modules.course_id", courseId)
        .sum("lesson_views.duration_seconds as total_duration")
        .first();

      return {
        totalViews: parseInt(totalViews.count),
        uniqueViewers: parseInt(uniqueViewers.count),
        totalDuration: parseInt(totalDuration.total_duration) || 0
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get recent views
   * @param {number} limit - Number of recent views to return
   * @returns {Array} Recent lesson views
   */
  static async getRecentViews(limit = 10) {
    try {
      const views = await db("lesson_views")
        .select(
          "lesson_views.*",
          "course_lessons.title as lesson_title",
          "course_modules.title as module_title",
          "courses.title as course_title",
          "users.name as student_name"
        )
        .leftJoin("course_lessons", "lesson_views.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("courses", "course_modules.course_id", "courses.id")
        .leftJoin("users", "lesson_views.user_id", "users.id")
        .orderBy("lesson_views.viewed_at", "desc")
        .limit(limit);
      return views.map(LessonViewModel.sanitizeView);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get view statistics
   * @returns {Object} View statistics
   */
  static async getStats() {
    try {
      const totalViews = await db("lesson_views").count("id as count").first();
      const todayViews = await db("lesson_views")
        .where("viewed_at", ">=", db.raw("CURRENT_DATE"))
        .count("id as count")
        .first();
      const thisWeekViews = await db("lesson_views")
        .where("viewed_at", ">=", db.raw("CURRENT_DATE - INTERVAL '7 days'"))
        .count("id as count")
        .first();

      return {
        total: parseInt(totalViews.count),
        today: parseInt(todayViews.count),
        thisWeek: parseInt(thisWeekViews.count)
      };
    } catch (error) {
      throw error;
    }
  }

  static async logView({ user_id, lesson_id, duration_seconds }) {
    if (!user_id || !lesson_id) throw new Error("user_id and lesson_id required");
    if (duration_seconds !== undefined && duration_seconds < 0) throw new Error("Duration cannot be negative");
    const [view] = await db("lesson_views")
      .insert({ user_id, lesson_id, duration_seconds: duration_seconds || 0 })
      .returning("*");
    return view;
  }

  static async getTotalTimeByUser(user_id) {
    const result = await db("lesson_views")
      .where({ user_id })
      .sum("duration_seconds as total");
    return result[0].total || 0;
  }

  static sanitizeView(view) {
    if (!view) return null;
    // Remove or mask any internal fields if needed
    // For now, just return the view as is
    return view;
  }
}

export default LessonViewModel; 