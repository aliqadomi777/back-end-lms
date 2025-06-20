/**
 * Course Model
 *
 * This model handles all database operations related to courses,
 * including course management and content organization.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { sanitizeString } from '../utils/validation.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class CourseModel {
  /**
   * Find course by ID
   * @param {number} id - Course ID
   * @param {Object} options - Query options
   * @returns {Object|null} Course object or null
   */
  static async findById(id, options = {}) {
    try {
      const {
        includeInstructor = false,
        includeCategory = false,
        includeModules = false,
      } = options;

      let query = db("courses")
        .select(
          "courses.*",
          "course_categories.name as category_name",
          "users.name as instructor_name",
          "file_uploads.file_path as thumbnail_path"
        )
        .leftJoin(
          "course_categories",
          "courses.category_id",
          "course_categories.id"
        )
        .leftJoin("users", "courses.instructor_id", "users.id")
        .leftJoin(
          "file_uploads",
          "courses.thumbnail_file_id",
          "file_uploads.id"
        )
        .where("courses.id", id);

      if (includeModules) {
        const modules = await db("course_modules")
          .where("course_id", id)
          .orderBy("position", "asc");

        const course = await query.first();
        if (course) {
          course.modules = modules;
        }
        return course || null;
      }

      return (await query.first()) || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new course
   * @param {Object} courseData - Course data
   * @returns {Object} Created course
   */
  static async create(courseData) {
    const trx = await db.transaction();
    try {
      let {
        title,
        description,
        instructor_id,
        category_id,
        thumbnail_url,
        thumbnail_file_id,
        tags = [],
        is_published = false,
        is_approved = false,
        created_by,
      } = courseData;

      // Validate and sanitize required fields
      title = sanitizeString(title, { trim: true, maxLength: 255, allowEmpty: false });
      if (!title || !instructor_id) {
        throw AppError.badRequest("Title and instructor are required");
      }

      // Validate instructor exists
      const instructor = await trx("users").where("id", instructor_id).first();
      if (!instructor) {
        throw AppError.notFound("Instructor not found");
      }

      // Validate category exists if provided
      if (category_id) {
        const category = await trx("course_categories")
          .where("id", category_id)
          .first();
        if (!category) {
          throw AppError.notFound("Category not found");
        }
      }

      // Validate thumbnail file if provided
      if (thumbnail_file_id) {
        const file = await trx("file_uploads")
          .where("id", thumbnail_file_id)
          .first();
        if (!file) {
          throw AppError.notFound("Thumbnail file not found");
        }
      }

      const [course] = await trx("courses")
        .insert({
          title,
          description: description ? sanitizeString(description, { trim: true, maxLength: 1000 }) : null,
          instructor_id,
          category_id,
          thumbnail_url,
          thumbnail_file_id,
          tags,
          is_published,
          is_approved,
          created_by,
          updated_by: created_by,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("*");
      await trx.commit();
      return CourseModel.sanitizeCourse(course);
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update course
   * @param {number} id - Course ID
   * @param {Object} updateData - Data to update
   * @param {number} updatedBy - User ID of updater
   * @returns {Object} Updated course
   */
  static async update(id, updateData, updatedBy) {
    const trx = await db.transaction();
    try {
      let {
        title,
        description,
        category_id,
        thumbnail_url,
        thumbnail_file_id,
        tags,
        is_published,
        is_approved,
      } = updateData;

      // Validate course exists
      const course = await trx("courses").where("id", id).first();
      if (!course) {
        throw AppError.notFound("Course not found");
      }

      // Validate and sanitize fields if provided
      if (title) title = sanitizeString(title, { trim: true, maxLength: 255, allowEmpty: false });
      if (description) description = sanitizeString(description, { trim: true, maxLength: 1000 });
      if (category_id) {
        const category = await trx("course_categories")
          .where("id", category_id)
          .first();
        if (!category) {
          throw AppError.notFound("Category not found");
        }
      }
      if (thumbnail_file_id) {
        const file = await trx("file_uploads")
          .where("id", thumbnail_file_id)
          .first();
        if (!file) {
          throw AppError.notFound("Thumbnail file not found");
        }
      }
      // Only admin can update approval status
      if (is_approved !== undefined) {
        const updater = await trx("users").where("id", updatedBy).first();
        if (!updater || updater.role !== "admin") {
          throw AppError.forbidden("Only admin can update approval status");
        }
      }
      const [updatedCourse] = await trx("courses")
        .where("id", id)
        .update({
          title,
          description,
          category_id,
          thumbnail_url,
          thumbnail_file_id,
          tags,
          is_published,
          is_approved,
          updated_by: updatedBy,
          updated_at: db.fn.now(),
        })
        .returning("*");
      await trx.commit();
      return CourseModel.sanitizeCourse(updatedCourse);
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete course
   * @param {number} id - Course ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    const trx = await db.transaction();
    try {
      // Validate course exists
      const course = await trx("courses").where("id", id).first();
      if (!course) {
        throw AppError.notFound("Course not found");
      }
      // Check for enrollments
      const enrollmentCount = await trx("course_enrollments")
        .where("course_id", id)
        .count("id as count")
        .first();
      if (parseInt(enrollmentCount.count) > 0) {
        throw AppError.conflict("Cannot delete course with active enrollments");
      }
      // Get all modules in this course
      const modules = await trx("course_modules")
        .where("course_id", id)
        .select("id");

      const moduleIds = modules.map((module) => module.id);

      if (moduleIds.length > 0) {
        // Get all lessons in these modules
        const lessons = await trx("course_lessons")
          .whereIn("module_id", moduleIds)
          .select("id");

        const lessonIds = lessons.map((lesson) => lesson.id);

        if (lessonIds.length > 0) {
          // Delete lessons
          await trx("course_lessons").whereIn("id", lessonIds).del();
        }

        // Delete modules
        await trx("course_modules").whereIn("id", moduleIds).del();
      }

      // Delete course
      await trx("courses").where("id", id).del();

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Get all courses
   * @param {Object} options - Query options
   * @returns {Object} Courses with pagination
   */
  static async getAll(options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("courses")
        .select(
          "courses.*",
          "course_categories.name as category_name",
          "users.name as instructor_name",
          "file_uploads.file_path as thumbnail_path"
        )
        .leftJoin(
          "course_categories",
          "courses.category_id",
          "course_categories.id"
        )
        .leftJoin("users", "courses.instructor_id", "users.id")
        .leftJoin(
          "file_uploads",
          "courses.thumbnail_file_id",
          "file_uploads.id"
        );
      // Apply filters
      if (options.category_id) {
        query = query.where("courses.category_id", options.category_id);
      }
      if (options.instructor_id) {
        query = query.where("courses.instructor_id", options.instructor_id);
      }
      if (typeof options.is_published === "boolean") {
        query = query.where("courses.is_published", options.is_published);
      }
      if (typeof options.is_approved === "boolean") {
        query = query.where("courses.is_approved", options.is_approved);
      }
      if (options.search) {
        query = query.where(function () {
          this.where("courses.title", "ilike", `%${options.search}%`).orWhere(
            "courses.description",
            "ilike",
            `%${options.search}%`
          );
        });
      }
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("courses.id as count");
      const total = parseInt(count);
      // Apply pagination
      const courses = await query
        .orderBy(params.sortBy || "courses.created_at", params.sortOrder || "DESC")
        .limit(params.limit)
        .offset(params.offset);
      return {
        data: courses.map(CourseModel.sanitizeCourse),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get courses by instructor
   * @param {number} instructorId - Instructor ID
   * @param {Object} options - Query options
   * @returns {Object} Courses with pagination
   */
  static async getByInstructor(instructorId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("courses")
        .select(
          "courses.*",
          "course_categories.name as category_name",
          "file_uploads.file_path as thumbnail_path"
        )
        .leftJoin(
          "course_categories",
          "courses.category_id",
          "course_categories.id"
        )
        .leftJoin(
          "file_uploads",
          "courses.thumbnail_file_id",
          "file_uploads.id"
        )
        .where("courses.instructor_id", instructorId);
      if (typeof options.is_published === "boolean") {
        query = query.where("courses.is_published", options.is_published);
      }
      if (typeof options.is_approved === "boolean") {
        query = query.where("courses.is_approved", options.is_approved);
      }
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("courses.id as count");
      const total = parseInt(count);
      // Apply pagination
      const courses = await query
        .orderBy(params.sortBy || "courses.created_at", params.sortOrder || "DESC")
        .limit(params.limit)
        .offset(params.offset);
      return {
        data: courses.map(CourseModel.sanitizeCourse),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update course approval status
   * @param {number} id - Course ID
   * @param {boolean} isApproved - Approval status
   * @param {number} updatedBy - User ID of updater
   * @returns {Object} Updated course
   */
  static async updateApprovalStatus(id, isApproved, updatedBy) {
    const trx = await db.transaction();
    try {
      // Validate course exists
      const course = await trx("courses").where("id", id).first();
      if (!course) {
        throw AppError.notFound("Course not found");
      }
      const [updatedCourse] = await trx("courses")
        .where("id", id)
        .update({
          is_approved: isApproved,
          updated_by: updatedBy,
          updated_at: db.fn.now(),
        })
        .returning("*");
      await trx.commit();
      return CourseModel.sanitizeCourse(updatedCourse);
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update course publish status
   * @param {number} id - Course ID
   * @param {boolean} isPublished - Publish status
   * @param {number} updatedBy - User ID of updater
   * @returns {Object} Updated course
   */
  static async updatePublishStatus(id, isPublished, updatedBy) {
    const trx = await db.transaction();
    try {
      // Validate course exists
      const course = await trx("courses").where("id", id).first();
      if (!course) {
        throw AppError.notFound("Course not found");
      }
      // Check if course is approved before publishing
      if (isPublished && !course.is_approved) {
        throw AppError.conflict("Course must be approved before publishing");
      }
      const [updatedCourse] = await trx("courses")
        .where("id", id)
        .update({
          is_published: isPublished,
          updated_by: updatedBy,
          updated_at: db.fn.now(),
        })
        .returning("*");
      await trx.commit();
      return CourseModel.sanitizeCourse(updatedCourse);
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get analytics for a course
   * @param {number} courseId - Course ID
   * @returns {Object} Analytics data
   */
  static async getCourseAnalytics(courseId) {
    try {
      // Validate course exists
      const course = await db('courses').where('id', courseId).first();
      if (!course) throw AppError.notFound('Course not found');
      // Total enrollments
      const totalEnrollments = parseInt((await db('course_enrollments').where('course_id', courseId).count('id as count').first()).count);
      // Total modules
      const totalModules = parseInt((await db('course_modules').where('course_id', courseId).count('id as count').first()).count);
      // Total lessons
      const moduleIds = (await db('course_modules').where('course_id', courseId).select('id')).map(m => m.id);
      let totalLessons = 0;
      if (moduleIds.length > 0) {
        totalLessons = parseInt((await db('course_lessons').whereIn('module_id', moduleIds).count('id as count').first()).count);
      }
      // Total assignments
      let totalAssignments = 0;
      if (moduleIds.length > 0) {
        const lessonIds = (await db('course_lessons').whereIn('module_id', moduleIds).select('id')).map(l => l.id);
        if (lessonIds.length > 0) {
          totalAssignments = parseInt((await db('assignments').whereIn('lesson_id', lessonIds).count('id as count').first()).count);
        }
      }
      // Total quizzes
      let totalQuizzes = 0;
      if (moduleIds.length > 0) {
        const lessonIds = (await db('course_lessons').whereIn('module_id', moduleIds).select('id')).map(l => l.id);
        if (lessonIds.length > 0) {
          totalQuizzes = parseInt((await db('quizzes').whereIn('lesson_id', lessonIds).count('id as count').first()).count);
        }
      }
      // Average completion rate (students who completed all lessons / total enrollments)
      let avgCompletionRate = 0;
      if (moduleIds.length > 0 && totalLessons > 0 && totalEnrollments > 0) {
        const lessonIds = (await db('course_lessons').whereIn('module_id', moduleIds).select('id')).map(l => l.id);
        // For each enrolled user, count completed lessons
        const completions = await db('lesson_completions')
          .whereIn('lesson_id', lessonIds)
          .select('user_id')
          .groupBy('user_id')
          .count('lesson_id as completedLessons');
        const fullyCompleted = completions.filter(c => parseInt(c.completedLessons) === totalLessons).length;
        avgCompletionRate = Math.round((fullyCompleted / totalEnrollments) * 100);
      }
      return {
        totalEnrollments,
        totalModules,
        totalLessons,
        totalAssignments,
        totalQuizzes,
        avgCompletionRate
      };
    } catch (error) {
      throw error;
    }
  }

  static sanitizeCourse(course) {
    if (!course) return null;
    // Remove or mask any internal fields if needed
    // For now, just return the course as is
    return course;
  }
}

export default CourseModel;
