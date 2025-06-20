/**
 * Assignment Model
 *
 * This model handles all database operations related to assignments,
 * including creation, updates, and basic management.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { sanitizeString } from '../utils/validation.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class AssignmentModel {
  /**
   * Find assignment by ID
   * @param {number} id - Assignment ID
   * @returns {Object|null} Assignment object or null
   */
  static async findById(id) {
    try {
      return await db("assignments")
        .select(
          "assignments.*",
          "courses.title as course_title",
          "course_lessons.title as lesson_title"
        )
        .leftJoin("courses", "assignments.course_id", "courses.id")
        .leftJoin(
          "course_lessons",
          "assignments.lesson_id",
          "course_lessons.id"
        )
        .where("assignments.id", id)
        .first();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new assignment
   * @param {Object} assignmentData - Assignment data
   * @returns {Object} Created assignment
   */
  static async create(assignmentData) {
    const trx = await db.transaction();
    try {
      let {
        title,
        description,
        lesson_id,
        deadline,
        max_score = 100,
        instructions = null,
        allow_late_submission = false,
        created_by,
      } = assignmentData;
      // Validate and sanitize required fields
      title = sanitizeString(title, { trim: true, maxLength: 255, allowEmpty: false });
      if (!title || !lesson_id || !deadline || !created_by) {
        throw AppError.badRequest("Title, lesson ID, deadline, and creator are required");
      }
      // Validate lesson exists
      const lesson = await trx("course_lessons").where("id", lesson_id).first();
      if (!lesson) {
        throw AppError.notFound("Lesson not found");
      }
      const [assignmentId] = await trx("assignments")
        .insert({
          title,
          description: description ? sanitizeString(description, { trim: true, maxLength: 1000 }) : null,
          lesson_id,
          deadline,
          max_score,
          instructions: instructions ? sanitizeString(instructions, { trim: true, maxLength: 2000 }) : null,
          allow_late_submission,
          created_by,
          updated_by: created_by,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("id");
      const assignment = await this.findById(assignmentId);
      await trx.commit();
      return assignment;
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update assignment
   * @param {number} id - Assignment ID
   * @param {Object} updateData - Data to update
   * @param {number} updatedBy - User ID who is updating
   * @returns {Object} Updated assignment
   */
  static async update(id, updateData, updatedBy) {
    const trx = await db.transaction();
    try {
      // Validate assignment exists
      const assignment = await trx("assignments").where("id", id).first();
      if (!assignment) {
        throw AppError.notFound("Assignment not found");
      }
      const allowedFields = [
        "title",
        "description",
        "deadline",
        "max_score",
        "instructions",
        "allow_late_submission",
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
      // Trim and sanitize text fields
      if (filteredData.title) {
        filteredData.title = sanitizeString(filteredData.title, { trim: true, maxLength: 255, allowEmpty: false });
      }
      if (filteredData.description) {
        filteredData.description = sanitizeString(filteredData.description, { trim: true, maxLength: 1000 });
      }
      if (filteredData.instructions) {
        filteredData.instructions = sanitizeString(filteredData.instructions, { trim: true, maxLength: 2000 });
      }
      filteredData.updated_by = updatedBy;
      filteredData.updated_at = db.fn.now();
      await trx("assignments").where("id", id).update(filteredData);
      const updatedAssignment = await this.findById(id);
      await trx.commit();
      return updatedAssignment;
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete assignment
   * @param {number} id - Assignment ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    const trx = await db.transaction();
    try {
      // Validate assignment exists
      const assignment = await trx("assignments").where("id", id).first();
      if (!assignment) {
        throw AppError.notFound("Assignment not found");
      }
      // Check for submissions
      const submissionCount = await trx("assignment_submissions")
        .where("assignment_id", id)
        .count("id as count")
        .first();
      if (parseInt(submissionCount.count) > 0) {
        throw AppError.conflict("Cannot delete assignment with submissions");
      }
      await trx("assignments").where("id", id).del();
      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  static sanitizeAssignment(assignment) {
    if (!assignment) return null;
    // Remove or mask any internal fields
    const {
      deleted_at,
      internal_notes,
      ...publicFields
    } = assignment;
    return publicFields;
  }

  /**
   * Get assignments by course
   * @param {number} courseId - Course ID
   * @param {Object} options - Query options
   * @returns {Object} Assignments with pagination
   */
  static async getByCourse(courseId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      // Validate course exists
      const course = await db("courses").where("id", courseId).first();
      if (!course) {
        throw AppError.notFound("Course not found");
      }
      let query = db("assignments")
        .select("assignments.*")
        .where("assignments.course_id", courseId);
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("assignments.id as count");
      const total = parseInt(count);
      // Apply pagination
      const assignments = await query
        .orderBy(params.sortBy || "assignments.created_at", params.sortOrder || "DESC")
        .limit(params.limit)
        .offset(params.offset);
      return {
        data: assignments.map(AssignmentModel.sanitizeAssignment),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get assignments by lesson
   * @param {number} lessonId - Lesson ID
   * @param {Object} options - Query options
   * @returns {Object} Assignments with pagination
   */
  static async getByLesson(lessonId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      // Validate lesson exists
      const lesson = await db("course_lessons").where("id", lessonId).first();
      if (!lesson) {
        throw AppError.notFound("Lesson not found");
      }
      let query = db("assignments")
        .select("assignments.*")
        .where("assignments.lesson_id", lessonId);
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("assignments.id as count");
      const total = parseInt(count);
      // Apply pagination
      const assignments = await query
        .orderBy(params.sortBy || "assignments.created_at", params.sortOrder || "DESC")
        .limit(params.limit)
        .offset(params.offset);
      return {
        data: assignments.map(AssignmentModel.sanitizeAssignment),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * List assignments with filtering and pagination
   * @param {Object} filters - Filtering options
   * @param {Object} options - Pagination/sorting options
   * @returns {Object} Assignments with pagination
   */
  static async findMany(filters = {}, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db('assignments').select('*');
      // Apply filters
      if (filters.lesson_id) query = query.where('lesson_id', filters.lesson_id);
      if (filters.course_id) query = query.where('course_id', filters.course_id);
      if (filters.created_by) query = query.where('created_by', filters.created_by);
      if (filters.deadline_before) query = query.where('deadline', '<', filters.deadline_before);
      if (filters.deadline_after) query = query.where('deadline', '>', filters.deadline_after);
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count('id as count');
      const total = parseInt(count);
      // Apply pagination
      const assignments = await query.orderBy(params.sortBy || 'created_at', params.sortOrder || 'desc').limit(params.limit).offset(params.offset);
      return {
        data: assignments.map(AssignmentModel.sanitizeAssignment),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get assignments for instructor
   * @param {number} instructorId - Instructor user ID
   * @param {Object} options - Pagination/filter options
   * @returns {Object} Assignments with pagination
   */
  static async findByInstructor(instructorId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      // Validate instructor exists
      const instructor = await db('users').where('id', instructorId).where('role', 'instructor').first();
      if (!instructor) throw AppError.notFound('Instructor not found');
      let query = db('assignments')
        .select('assignments.*')
        .leftJoin('course_lessons', 'assignments.lesson_id', 'course_lessons.id')
        .leftJoin('courses', 'course_lessons.course_id', 'courses.id')
        .where('courses.instructor_id', instructorId);
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count('assignments.id as count');
      const total = parseInt(count);
      // Apply pagination
      const assignments = await query.orderBy(params.sortBy || 'assignments.created_at', params.sortOrder || 'desc').limit(params.limit).offset(params.offset);
      return {
        data: assignments.map(AssignmentModel.sanitizeAssignment),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get assignment statistics
   * @param {number} assignmentId - Assignment ID
   * @returns {Object} Assignment statistics
   */
  static async getStatistics(assignmentId) {
    try {
      // Total submissions
      const total = parseInt((await db('assignment_submissions').where('assignment_id', assignmentId).count('id as count').first()).count);
      // Graded submissions
      const graded = parseInt((await db('assignment_submissions').where('assignment_id', assignmentId).where('submission_status', 'graded').count('id as count').first()).count);
      // Average grade
      const avgGrade = Math.round(parseFloat((await db('assignment_submissions').where('assignment_id', assignmentId).where('submission_status', 'graded').avg('grade as avg').first()).avg) || 0);
      return { total, graded, avgGrade };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get upcoming assignment deadlines for a user
   * @param {number} userId - User ID
   * @param {number} days - Days ahead to look
   * @returns {Array} Upcoming assignments
   */
  static async getUpcomingDeadlines(userId, days = 7) {
    try {
      const now = new Date();
      const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      // Get user's enrolled courses
      const enrollments = await db('course_enrollments').where('user_id', userId);
      const courseIds = enrollments.map(e => e.course_id);
      if (courseIds.length === 0) return [];
      // Get assignments due in the next X days
      const assignments = await db('assignments')
        .select('*')
        .whereIn('course_id', courseIds)
        .andWhere('deadline', '>', now)
        .andWhere('deadline', '<', future)
        .orderBy('deadline', 'asc');
      return assignments.map(AssignmentModel.sanitizeAssignment);
    } catch (error) {
      throw error;
    }
  }
}

export default AssignmentModel;
