/**
 * LessonCompletion Model
 *
 * Tracks lesson completion progress for users.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class LessonCompletionModel {
  /**
   * Get completion by ID
   * @param {number} id - Completion ID
   * @returns {Object|null} Completion or null
   */
  static async findById(id) {
    try {
      const completion = await db("lesson_completions")
        .select(
          "lesson_completions.*",
          "course_lessons.title as lesson_title",
          "course_lessons.content_type",
          "course_modules.title as module_title",
          "courses.title as course_title",
          "users.name as student_name"
        )
        .leftJoin("course_lessons", "lesson_completions.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("courses", "course_modules.course_id", "courses.id")
        .leftJoin("users", "lesson_completions.user_id", "users.id")
        .where("lesson_completions.id", id)
        .first();
      return LessonCompletionModel.sanitizeCompletion(completion);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get completion by user and lesson
   * @param {number} userId - User ID
   * @param {number} lessonId - Lesson ID
   * @returns {Object|null} Completion or null
   */
  static async findByUserAndLesson(userId, lessonId) {
    try {
      return await db("lesson_completions")
        .where({
          user_id: userId,
          lesson_id: lessonId
        })
        .first();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all completions for user
   * @param {number} userId - User ID
   * @returns {Array} User's lesson completions
   */
  static async getByUser(userId) {
    try {
      return await db("lesson_completions")
        .select(
          "lesson_completions.*",
          "course_lessons.title as lesson_title",
          "course_lessons.content_type",
          "course_modules.title as module_title",
          "courses.title as course_title"
        )
        .leftJoin("course_lessons", "lesson_completions.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("courses", "course_modules.course_id", "courses.id")
        .where("lesson_completions.user_id", userId)
        .orderBy("lesson_completions.completed_at", "desc");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get completions for a course
   * @param {number} courseId - Course ID
   * @returns {Array} Course lesson completions
   */
  static async getByCourse(courseId) {
    try {
      return await db("lesson_completions")
        .select(
          "lesson_completions.*",
          "course_lessons.title as lesson_title",
          "course_modules.title as module_title",
          "users.name as student_name"
        )
        .leftJoin("course_lessons", "lesson_completions.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("users", "lesson_completions.user_id", "users.id")
        .where("course_modules.course_id", courseId)
        .orderBy("lesson_completions.completed_at", "desc");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get completions for a lesson
   * @param {number} lessonId - Lesson ID
   * @returns {Array} Lesson completions
   */
  static async getByLesson(lessonId) {
    try {
      return await db("lesson_completions")
        .select(
          "lesson_completions.*",
          "users.name as student_name",
          "users.email as student_email"
        )
        .leftJoin("users", "lesson_completions.user_id", "users.id")
        .where("lesson_completions.lesson_id", lessonId)
        .orderBy("lesson_completions.completed_at", "desc");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark lesson as completed
   * @param {number} userId - User ID
   * @param {number} lessonId - Lesson ID
   * @returns {Object} Created completion record
   */
  static async markCompleted(userId, lessonId) {
    try {
      // Validate user exists
      const user = await db("users").where("id", userId).first();
      if (!user) {
        throw AppError.notFound("User not found");
      }

      // Validate lesson exists
      const lesson = await db("course_lessons").where("id", lessonId).first();
      if (!lesson) {
        throw AppError.notFound("Lesson not found");
      }

      // Check if already completed
      const existing = await db("lesson_completions")
        .where({
          user_id: userId,
          lesson_id: lessonId
        })
        .first();

      if (existing) {
        throw AppError.conflict("Lesson is already completed");
      }

      const [completion] = await db("lesson_completions")
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          completed_at: db.fn.now()
        })
        .returning("*");

      return LessonCompletionModel.sanitizeCompletion(completion);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Remove completion record
   * @param {number} userId - User ID
   * @param {number} lessonId - Lesson ID
   * @returns {boolean} Success status
   */
  static async removeCompletion(userId, lessonId) {
    try {
      const result = await db("lesson_completions")
        .where({
          user_id: userId,
          lesson_id: lessonId
        })
        .del();

      return result > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete completion by ID
   * @param {number} id - Completion ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    try {
      // Check if completion exists
      const completion = await db("lesson_completions").where("id", id).first();
      if (!completion) {
        throw AppError.notFound("Completion record not found");
      }

      await db("lesson_completions").where("id", id).del();
      return true;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get user's course progress
   * @param {number} userId - User ID
   * @param {number} courseId - Course ID
   * @returns {Object} Course progress statistics
   */
  static async getCourseProgress(userId, courseId) {
    try {
      // Get total lessons in course
      const totalLessons = await db("course_lessons")
        .select("course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .where("course_modules.course_id", courseId)
        .count("course_lessons.id as count")
        .first();

      // Get completed lessons
      const completedLessons = await db("lesson_completions")
        .select("lesson_completions.lesson_id")
        .leftJoin("course_lessons", "lesson_completions.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .where("lesson_completions.user_id", userId)
        .where("course_modules.course_id", courseId)
        .count("lesson_completions.id as count")
        .first();

      const total = parseInt(totalLessons.count);
      const completed = parseInt(completedLessons.count);
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        total,
        completed,
        remaining: total - completed,
        percentage
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's overall progress
   * @param {number} userId - User ID
   * @returns {Object} Overall progress statistics
   */
  static async getUserProgress(userId) {
    try {
      // Get total completed lessons
      const totalCompleted = await db("lesson_completions")
        .where("user_id", userId)
        .count("id as count")
        .first();

      // Get completed lessons by course
      const courseProgress = await db("lesson_completions")
        .select(
          "courses.id as course_id",
          "courses.title as course_title",
          db.raw("COUNT(lesson_completions.id) as completed_lessons")
        )
        .leftJoin("course_lessons", "lesson_completions.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("courses", "course_modules.course_id", "courses.id")
        .where("lesson_completions.user_id", userId)
        .groupBy("courses.id", "courses.title")
        .orderBy("completed_lessons", "desc");

      return {
        totalCompleted: parseInt(totalCompleted.count),
        courseProgress
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get recent completions
   * @param {number} limit - Number of recent completions to return
   * @returns {Array} Recent lesson completions
   */
  static async getRecentCompletions(limit = 10) {
    try {
      return await db("lesson_completions")
        .select(
          "lesson_completions.*",
          "course_lessons.title as lesson_title",
          "course_modules.title as module_title",
          "courses.title as course_title",
          "users.name as student_name"
        )
        .leftJoin("course_lessons", "lesson_completions.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("courses", "course_modules.course_id", "courses.id")
        .leftJoin("users", "lesson_completions.user_id", "users.id")
        .orderBy("lesson_completions.completed_at", "desc")
        .limit(limit);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get completion statistics
   * @returns {Object} Completion statistics
   */
  static async getStats() {
    try {
      const totalCompletions = await db("lesson_completions").count("id as count").first();
      const todayCompletions = await db("lesson_completions")
        .where("completed_at", ">=", db.raw("CURRENT_DATE"))
        .count("id as count")
        .first();
      const thisWeekCompletions = await db("lesson_completions")
        .where("completed_at", ">=", db.raw("CURRENT_DATE - INTERVAL '7 days'"))
        .count("id as count")
        .first();

      return {
        total: parseInt(totalCompletions.count),
        today: parseInt(todayCompletions.count),
        thisWeek: parseInt(thisWeekCompletions.count)
      };
    } catch (error) {
      throw error;
    }
  }

  static async markComplete({ user_id, lesson_id }) {
    if (!user_id || !lesson_id) throw new Error("user_id and lesson_id required");
    // Prevent duplicates
    const exists = await db("lesson_completions").where({ user_id, lesson_id }).first();
    if (exists) return exists;
    const [completion] = await db("lesson_completions")
      .insert({ user_id, lesson_id })
      .returning("*");
    return completion;
  }

  static async isCompleted({ user_id, lesson_id }) {
    return !!(await db("lesson_completions").where({ user_id, lesson_id }).first());
  }

  static async getByUser(userId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("lesson_completions")
        .select(
          "lesson_completions.*",
          "course_lessons.title as lesson_title",
          "course_lessons.content_type",
          "course_modules.title as module_title",
          "courses.title as course_title"
        )
        .leftJoin("course_lessons", "lesson_completions.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("courses", "course_modules.course_id", "courses.id")
        .where("lesson_completions.user_id", userId)
        .orderBy("lesson_completions.completed_at", "desc");
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("lesson_completions.id as count");
      const total = parseInt(count);
      const completions = await query.limit(params.limit).offset(params.offset);
      return {
        data: completions.map(LessonCompletionModel.sanitizeCompletion),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  static async getByCourse(courseId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("lesson_completions")
        .select(
          "lesson_completions.*",
          "course_lessons.title as lesson_title",
          "course_modules.title as module_title",
          "users.name as student_name"
        )
        .leftJoin("course_lessons", "lesson_completions.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("users", "lesson_completions.user_id", "users.id")
        .where("course_modules.course_id", courseId)
        .orderBy("lesson_completions.completed_at", "desc");
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("lesson_completions.id as count");
      const total = parseInt(count);
      const completions = await query.limit(params.limit).offset(params.offset);
      return {
        data: completions.map(LessonCompletionModel.sanitizeCompletion),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  static async getByLesson(lessonId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("lesson_completions")
        .select(
          "lesson_completions.*",
          "users.name as student_name",
          "users.email as student_email"
        )
        .leftJoin("users", "lesson_completions.user_id", "users.id")
        .where("lesson_completions.lesson_id", lessonId)
        .orderBy("lesson_completions.completed_at", "desc");
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("lesson_completions.id as count");
      const total = parseInt(count);
      const completions = await query.limit(params.limit).offset(params.offset);
      return {
        data: completions.map(LessonCompletionModel.sanitizeCompletion),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  static async getRecentCompletions(limit = 10) {
    try {
      const completions = await db("lesson_completions")
        .select(
          "lesson_completions.*",
          "course_lessons.title as lesson_title",
          "users.name as student_name"
        )
        .leftJoin("course_lessons", "lesson_completions.lesson_id", "course_lessons.id")
        .leftJoin("users", "lesson_completions.user_id", "users.id")
        .orderBy("lesson_completions.completed_at", "desc")
        .limit(limit);
      return completions.map(LessonCompletionModel.sanitizeCompletion);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  static sanitizeCompletion(completion) {
    if (!completion) return null;
    const {
      id, user_id, lesson_id, completed_at, lesson_title, content_type, module_title, course_title, student_name
    } = completion;
    return { id, user_id, lesson_id, completed_at, lesson_title, content_type, module_title, course_title, student_name };
  }
}

export default LessonCompletionModel; 