/**
 * Enrollment Model
 *
 * This model handles all database operations related to course enrollments.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class EnrollmentModel {
  /**
   * Find enrollment by ID
   * @param {number} id - Enrollment ID
   * @returns {Object|null} Enrollment object or null
   */
  static async findById(id) {
    try {
      return await db("course_enrollments")
        .select(
          "course_enrollments.*",
          "courses.title as course_title",
          "users.name as student_name",
          "users.email as student_email"
        )
        .leftJoin("courses", "course_enrollments.course_id", "courses.id")
        .leftJoin("users", "course_enrollments.user_id", "users.id")
        .where("course_enrollments.id", id)
        .first();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find enrollment by course and student
   * @param {number} courseId - Course ID
   * @param {number} studentId - Student ID
   * @returns {Object|null} Enrollment object or null
   */
  static async findByCourseAndStudent(courseId, studentId) {
    try {
      return await db("course_enrollments")
        .select("*")
        .where({
          course_id: courseId,
          user_id: studentId,
        })
        .first();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new enrollment
   * @param {Object} enrollmentData - Enrollment data
   * @returns {Object} Created enrollment
   */
  static async create(enrollmentData) {
    const trx = await db.transaction();
    try {
      const {
        course_id,
        user_id,
        enrollment_status = "active",
        enrolled_at = new Date(),
      } = enrollmentData;

      // Check if enrollment already exists
      const existingEnrollment = await trx("course_enrollments")
        .where({
          course_id,
          user_id,
        })
        .first();
      if (existingEnrollment) {
        throw AppError.conflict("Student is already enrolled in this course");
      }

      // Check if course exists and is published
      const course = await trx("courses")
        .select("id", "title", "is_published", "is_approved")
        .where("id", course_id)
        .first();
      if (!course) {
        throw AppError.notFound("Course not found");
      }
      if (!course.is_published || !course.is_approved) {
        throw AppError.conflict("Course is not available for enrollment");
      }

      // Check if user exists
      const user = await trx("users")
        .select("id", "role")
        .where("id", user_id)
        .first();
      if (!user) {
        throw AppError.notFound("User not found");
      }
      if (user.role !== "student") {
        throw AppError.forbidden("Only students can enroll in courses");
      }

      const [enrollment] = await trx("course_enrollments")
        .insert({
          course_id,
          user_id,
          enrollment_status,
          enrolled_at,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("*");
      await trx.commit();
      return EnrollmentModel.sanitizeEnrollment(enrollment);
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update enrollment status
   * @param {number} id - Enrollment ID
   * @param {string} status - New status
   * @returns {Object} Updated enrollment
   */
  static async updateStatus(id, status) {
    const trx = await db.transaction();
    try {
      const validStatuses = ["active", "completed", "dropped", "suspended"];
      if (!validStatuses.includes(status)) {
        throw AppError.badRequest("Invalid enrollment status");
      }
      // Validate enrollment exists
      const enrollment = await trx("course_enrollments").where({ id }).first();
      if (!enrollment) {
        throw AppError.notFound("Enrollment not found");
      }
      const [updatedEnrollment] = await trx("course_enrollments")
        .where({ id })
        .update({
          enrollment_status: status,
          updated_at: db.fn.now(),
        })
        .returning("*");
      await trx.commit();
      return EnrollmentModel.sanitizeEnrollment(updatedEnrollment);
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get enrollments by student
   * @param {number} studentId - Student ID
   * @param {Object} options - Query options
   * @returns {Array} Student enrollments
   */
  static async getByStudent(studentId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      // Validate student exists
      const student = await db("users")
        .where({ id: studentId, role: "student" })
        .first();
      if (!student) {
        throw AppError.notFound("Student not found");
      }
      let query = db("course_enrollments")
        .select(
          "course_enrollments.*",
          "courses.title as course_title",
          "courses.description as course_description",
          "courses.thumbnail_url",
          "users.name as instructor_name",
          "course_categories.name as category_name"
        )
        .leftJoin("courses", "course_enrollments.course_id", "courses.id")
        .leftJoin("users", "courses.instructor_id", "users.id")
        .leftJoin(
          "course_categories",
          "courses.category_id",
          "course_categories.id"
        )
        .where("course_enrollments.user_id", studentId);
      if (options.status) {
        const validStatuses = ["active", "completed", "dropped", "suspended"];
        if (!validStatuses.includes(options.status)) {
          throw AppError.badRequest("Invalid enrollment status");
        }
        query = query.where("course_enrollments.enrollment_status", options.status);
      }
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("course_enrollments.id as count");
      const total = parseInt(count);
      // Apply pagination
      const enrollments = await query
        .orderBy(params.sortBy || "course_enrollments.enrolled_at", params.sortOrder || "DESC")
        .limit(params.limit)
        .offset(params.offset);
      return {
        data: enrollments.map(EnrollmentModel.sanitizeEnrollment),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get enrollments by course
   * @param {number} courseId - Course ID
   * @param {Object} options - Query options
   * @returns {Object} Course enrollments with pagination
   */
  static async getByCourse(courseId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      // Validate course exists
      const course = await db("courses").where({ id: courseId }).first();
      if (!course) {
        throw AppError.notFound("Course not found");
      }
      let query = db("course_enrollments")
        .select(
          "course_enrollments.*",
          "users.name as student_name",
          "users.email as student_email"
        )
        .leftJoin("users", "course_enrollments.user_id", "users.id")
        .where("course_enrollments.course_id", courseId);
      if (options.status) {
        const validStatuses = ["active", "completed", "dropped", "suspended"];
        if (!validStatuses.includes(options.status)) {
          throw AppError.badRequest("Invalid enrollment status");
        }
        query = query.where("course_enrollments.enrollment_status", options.status);
      }
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("course_enrollments.id as count");
      const total = parseInt(count);
      // Apply pagination
      const enrollments = await query
        .orderBy(params.sortBy || "course_enrollments.enrolled_at", params.sortOrder || "DESC")
        .limit(params.limit)
        .offset(params.offset);
      return {
        data: enrollments.map(EnrollmentModel.sanitizeEnrollment),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete enrollment
   * @param {number} id - Enrollment ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    const trx = await db.transaction();
    try {
      // Validate enrollment exists
      const enrollment = await trx("course_enrollments").where({ id }).first();
      if (!enrollment) {
        throw AppError.notFound("Enrollment not found");
      }
      await trx("course_enrollments").where({ id }).del();
      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  static async getWithProgress(userId, courseId) {
    try {
      return await db('course_enrollments')
        .select(
          'course_enrollments.*',
          'courses.title as course_title',
          'courses.description as course_description',
          'users.name as student_name'
        )
        .leftJoin('courses', 'course_enrollments.course_id', 'courses.id')
        .leftJoin('users', 'course_enrollments.user_id', 'users.id')
        .where({
          'course_enrollments.user_id': userId,
          'course_enrollments.course_id': courseId
        })
        .first();
    } catch (error) {
      throw error;
    }
  }

  static async isEnrolled(userId, courseId) {
    try {
      const enrollment = await db('course_enrollments')
        .where({ user_id: userId, course_id: courseId })
        .first();
      return !!enrollment && enrollment.enrollment_status === 'active';
    } catch (error) {
      throw error;
    }
  }

  static async getCourseStats(courseId) {
    try {
      const stats = await db('course_enrollments')
        .count('* as total_enrollments')
        .where('course_id', courseId)
        .first();
      return {
        total_enrollments: parseInt(stats.total_enrollments) || 0
      };
    } catch (error) {
      throw error;
    }
  }

  static async getRecent(options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("course_enrollments")
        .select(
          "course_enrollments.*",
          "courses.title as course_title",
          "users.name as student_name"
        )
        .leftJoin("courses", "course_enrollments.course_id", "courses.id")
        .leftJoin("users", "course_enrollments.user_id", "users.id")
        .orderBy(params.sortBy || "course_enrollments.enrolled_at", params.sortOrder || "DESC");
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("course_enrollments.id as count");
      const total = parseInt(count);
      const enrollments = await query.limit(params.limit).offset(params.offset);
      return {
        data: enrollments.map(EnrollmentModel.sanitizeEnrollment),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  static sanitizeEnrollment(enrollment) {
    if (!enrollment) return null;
    // Remove or mask any internal fields if needed
    // For now, just return the enrollment as is
    return enrollment;
  }

  /**
   * Find all enrollments with pagination, sorting, and filters
   * @param {Object} options - { limit, offset, sort, order, filters }
   * @returns {Object} { enrollments, total }
   */
  static async findAll(options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("course_enrollments")
        .select(
          "course_enrollments.*",
          "courses.title as course_title",
          "users.name as student_name"
        )
        .leftJoin("courses", "course_enrollments.course_id", "courses.id")
        .leftJoin("users", "course_enrollments.user_id", "users.id")
        .orderBy(params.sortBy || "course_enrollments.enrolled_at", params.sortOrder || "DESC");
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.where(key, value);
          }
        });
      }
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("course_enrollments.id as count");
      const total = parseInt(count);
      const enrollments = await query.limit(params.limit).offset(params.offset);
      return {
        data: enrollments.map(EnrollmentModel.sanitizeEnrollment),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Alias for findByCourseAndStudent (for service compatibility)
   */
  static async findByUserAndCourse(userId, courseId) {
    return this.findByCourseAndStudent(courseId, userId);
  }

  /**
   * Get enrollment stats for a course/date range
   * @param {Object} options - { course_id, start_date, end_date }
   * @returns {Object} Stats
   */
  static async getStats({ course_id, start_date, end_date }) {
    try {
      let query = db('course_enrollments').where('course_id', course_id);
      if (start_date) query = query.where('enrolled_at', '>=', start_date);
      if (end_date) query = query.where('enrolled_at', '<=', end_date);
      const total = parseInt((await query.clone().count('id as count').first()).count);
      const completed = parseInt((await query.clone().where('enrollment_status', 'completed').count('id as count').first()).count);
      const dropped = parseInt((await query.clone().where('enrollment_status', 'dropped').count('id as count').first()).count);
      return { total, completed, dropped };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get enrollments for export (CSV/Excel)
   * @param {Object} options - { course_id, start_date, end_date }
   * @returns {Array} Enrollments
   */
  static async getForExport({ course_id, start_date, end_date }) {
    try {
      let query = db('course_enrollments')
        .select(
          'course_enrollments.id as enrollment_id',
          'users.name as user_name',
          'users.email as user_email',
          'courses.title as course_title',
          'course_enrollments.enrolled_at',
          'course_enrollments.enrollment_status as status',
          db.raw('COALESCE(course_enrollments.progress_percentage, 0) as progress_percentage'),
          'course_enrollments.completed_at'
        )
        .leftJoin('users', 'course_enrollments.user_id', 'users.id')
        .leftJoin('courses', 'course_enrollments.course_id', 'courses.id');
      if (course_id) query = query.where('course_enrollments.course_id', course_id);
      if (start_date) query = query.where('course_enrollments.enrolled_at', '>=', start_date);
      if (end_date) query = query.where('course_enrollments.enrolled_at', '<=', end_date);
      return await query.orderBy('course_enrollments.enrolled_at', 'desc');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update certificate URL for a user/course
   * @param {number} userId
   * @param {number} courseId
   * @param {string} certificateUrl
   */
  static async updateCertificate(userId, courseId, certificateUrl) {
    try {
      await db('course_enrollments')
        .where({ user_id: userId, course_id: courseId })
        .update({ certificate_url: certificateUrl, updated_at: db.fn.now() });
    } catch (error) {
      throw error;
    }
  }
}

export default EnrollmentModel;
