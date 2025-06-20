/**
 * AssignmentSubmission Model
 *
 * Handles assignment submissions and grading.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { sanitizeString } from '../utils/validation.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class AssignmentSubmissionModel {
  /**
   * Get submission by ID
   * @param {number} id - Submission ID
   * @returns {Object|null} Submission or null
   */
  static async findById(id) {
    try {
      return await db("assignment_submissions")
        .select(
          "assignment_submissions.*",
          "assignments.title as assignment_title",
          "assignments.deadline",
          "assignments.max_score",
          "assignments.allow_late_submission",
          "users.name as student_name",
          "users.email as student_email",
          "graders.name as grader_name"
        )
        .leftJoin("assignments", "assignment_submissions.assignment_id", "assignments.id")
        .leftJoin("users", "assignment_submissions.user_id", "users.id")
        .leftJoin("users as graders", "assignment_submissions.graded_by", "graders.id")
        .where("assignment_submissions.id", id)
        .first();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get submission by user and assignment
   * @param {number} userId - User ID
   * @param {number} assignmentId - Assignment ID
   * @returns {Object|null} Submission or null
   */
  static async getByUserAndAssignment(userId, assignmentId) {
    try {
      return await db("assignment_submissions")
        .where({
          user_id: userId,
          assignment_id: assignmentId
        })
        .first();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get submissions by user
   * @param {number} userId - User ID
   * @returns {Array} User's submissions
   */
  static async getByUser(userId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("assignment_submissions")
        .select(
          "assignment_submissions.*",
          "assignments.title as assignment_title",
          "assignments.deadline",
          "assignments.max_score"
        )
        .leftJoin("assignments", "assignment_submissions.assignment_id", "assignments.id")
        .where("assignment_submissions.user_id", userId);
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("assignment_submissions.id as count");
      const total = parseInt(count);
      // Apply pagination
      const submissions = await query
        .orderBy(params.sortBy || "assignment_submissions.submitted_at", params.sortOrder || "DESC")
        .limit(params.limit)
        .offset(params.offset);
      return {
        data: submissions.map(AssignmentSubmissionModel.sanitizeSubmission),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get submissions by assignment
   * @param {number} assignmentId - Assignment ID
   * @returns {Array} Assignment submissions
   */
  static async getByAssignment(assignmentId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("assignment_submissions")
        .select(
          "assignment_submissions.*",
          "users.name as student_name",
          "users.email as student_email",
          "graders.name as grader_name"
        )
        .leftJoin("users", "assignment_submissions.user_id", "users.id")
        .leftJoin("users as graders", "assignment_submissions.graded_by", "graders.id")
        .where("assignment_submissions.assignment_id", assignmentId);
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("assignment_submissions.id as count");
      const total = parseInt(count);
      // Apply pagination
      const submissions = await query
        .orderBy(params.sortBy || "assignment_submissions.submitted_at", params.sortOrder || "DESC")
        .limit(params.limit)
        .offset(params.offset);
      return {
        data: submissions.map(AssignmentSubmissionModel.sanitizeSubmission),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Create a new submission
   * @param {Object} data - Submission data
   * @returns {Object} Created submission
   */
  static async create(data) {
    try {
      const {
        assignment_id,
        user_id,
        submission_text,
        submission_file_id,
        submission_url
      } = data;

      // Validate required fields
      if (!assignment_id || !user_id) {
        throw AppError.badRequest("Assignment ID and user ID are required");
      }

      // Validate at least one submission method
      if (!submission_text && !submission_file_id && !submission_url) {
        throw AppError.badRequest("At least one submission method (text, file, or URL) is required");
      }

      // Validate user exists
      const user = await db("users").where("id", user_id).first();
      if (!user) {
        throw AppError.notFound("User not found");
      }

      // Validate assignment exists
      const assignment = await db("assignments").where("id", assignment_id).first();
      if (!assignment) {
        throw AppError.notFound("Assignment not found");
      }

      // Check if submission already exists
      const existingSubmission = await this.getByUserAndAssignment(user_id, assignment_id);
      if (existingSubmission) {
        throw AppError.conflict("Submission already exists for this assignment");
      }

      // Check deadline
      const now = new Date();
      const deadline = new Date(assignment.deadline);
      const isLate = now > deadline && !assignment.allow_late_submission;

      if (isLate) {
        throw AppError.conflict("Assignment deadline has passed and late submissions are not allowed");
      }

      // Validate file if provided
      if (submission_file_id) {
        const file = await db("file_uploads").where("id", submission_file_id).first();
        if (!file) {
          throw AppError.notFound("Submission file not found");
        }
      }

      const [submission] = await db("assignment_submissions")
        .insert({
          assignment_id,
          user_id,
          submission_text: submission_text ? sanitizeString(submission_text, { trim: true, maxLength: 5000 }) : null,
          submission_file_id: submission_file_id || null,
          submission_url: submission_url ? sanitizeString(submission_url, { trim: true, maxLength: 1000 }) : null,
          submission_status: "submitted",
          submitted_at: db.fn.now()
        })
        .returning("*");

      return submission;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update submission
   * @param {number} id - Submission ID
   * @param {Object} data - Update data
   * @returns {Object} Updated submission
   */
  static async update(id, data) {
    try {
      // Check if submission exists
      const submission = await db("assignment_submissions").where("id", id).first();
      if (!submission) {
        throw AppError.notFound("Submission not found");
      }

      // Only allow updates if not graded
      if (submission.submission_status === "graded") {
        throw AppError.conflict("Cannot update graded submission");
      }

      const allowedFields = ["submission_text", "submission_file_id", "submission_url"];
      const updateData = {};

      Object.keys(data).forEach(key => {
        if (allowedFields.includes(key)) {
          updateData[key] = data[key];
        }
      });

      if (Object.keys(updateData).length === 0) {
        throw AppError.badRequest("No valid fields to update");
      }

      // Validate at least one submission method
      const newSubmissionText = updateData.submission_text !== undefined ? updateData.submission_text : submission.submission_text;
      const newSubmissionFileId = updateData.submission_file_id !== undefined ? updateData.submission_file_id : submission.submission_file_id;
      const newSubmissionUrl = updateData.submission_url !== undefined ? updateData.submission_url : submission.submission_url;

      if (!newSubmissionText && !newSubmissionFileId && !newSubmissionUrl) {
        throw AppError.badRequest("At least one submission method (text, file, or URL) is required");
      }

      // Trim and sanitize text if being updated
      if (updateData.submission_text) {
        updateData.submission_text = sanitizeString(updateData.submission_text, { trim: true, maxLength: 5000 });
      }

      // Trim and sanitize URL if being updated
      if (updateData.submission_url) {
        updateData.submission_url = sanitizeString(updateData.submission_url, { trim: true, maxLength: 1000 });
      }

      // Validate file if being updated
      if (updateData.submission_file_id) {
        const file = await db("file_uploads").where("id", updateData.submission_file_id).first();
        if (!file) {
          throw AppError.notFound("Submission file not found");
        }
      }

      const [updatedSubmission] = await db("assignment_submissions")
        .where("id", id)
        .update(updateData)
        .returning("*");

      return updatedSubmission;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Grade submission
   * @param {number} id - Submission ID
   * @param {Object} gradingData - Grading data
   * @returns {Object} Updated submission
   */
  static async gradeSubmission(id, gradingData) {
    try {
      const { grade, feedback, graded_by } = gradingData;

      // Check if submission exists
      const submission = await db("assignment_submissions").where("id", id).first();
      if (!submission) {
        throw AppError.notFound("Submission not found");
      }

      // Validate grader exists
      if (graded_by) {
        const grader = await db("users").where("id", graded_by).first();
        if (!grader) {
          throw AppError.notFound("Grader not found");
        }
      }

      // Get assignment details
      const assignment = await db("assignments").where("id", submission.assignment_id).first();
      if (!assignment) {
        throw AppError.notFound("Assignment not found");
      }

      // Validate grade
      if (grade !== null && (grade < 0 || grade > assignment.max_score)) {
        throw AppError.badRequest(`Grade must be between 0 and ${assignment.max_score}`);
      }

      const [updatedSubmission] = await db("assignment_submissions")
        .where("id", id)
        .update({
          grade: grade || null,
          feedback: feedback ? sanitizeString(feedback, { trim: true, maxLength: 2000 }) : null,
          graded_by: graded_by || null,
          graded_at: db.fn.now(),
          submission_status: "graded"
        })
        .returning("*");

      return updatedSubmission;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Return submission for revision
   * @param {number} id - Submission ID
   * @param {string} feedback - Return feedback
   * @param {number} gradedBy - Grader ID
   * @returns {Object} Updated submission
   */
  static async returnSubmission(id, feedback, gradedBy) {
    try {
      // Check if submission exists
      const submission = await db("assignment_submissions").where("id", id).first();
      if (!submission) {
        throw AppError.notFound("Submission not found");
      }

      // Validate grader exists
      if (gradedBy) {
        const grader = await db("users").where("id", gradedBy).first();
        if (!grader) {
          throw AppError.notFound("Grader not found");
        }
      }

      const [updatedSubmission] = await db("assignment_submissions")
        .where("id", id)
        .update({
          feedback: feedback ? sanitizeString(feedback, { trim: true, maxLength: 2000 }) : null,
          graded_by: gradedBy || null,
          graded_at: db.fn.now(),
          submission_status: "returned"
        })
        .returning("*");

      return updatedSubmission;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete submission
   * @param {number} id - Submission ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    try {
      // Check if submission exists
      const submission = await db("assignment_submissions").where("id", id).first();
      if (!submission) {
        throw AppError.notFound("Submission not found");
      }

      await db("assignment_submissions").where("id", id).del();
      return true;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get submission statistics for an assignment
   * @param {number} assignmentId - Assignment ID
   * @returns {Object} Submission statistics
   */
  static async getAssignmentStats(assignmentId) {
    try {
      const totalSubmissions = await db("assignment_submissions")
        .where("assignment_id", assignmentId)
        .count("id as count")
        .first();

      const gradedSubmissions = await db("assignment_submissions")
        .where("assignment_id", assignmentId)
        .where("submission_status", "graded")
        .count("id as count")
        .first();

      const avgGrade = await db("assignment_submissions")
        .where("assignment_id", assignmentId)
        .where("submission_status", "graded")
        .whereNotNull("grade")
        .avg("grade as avg_grade")
        .first();

      const total = parseInt(totalSubmissions.count);
      const graded = parseInt(gradedSubmissions.count);
      const avgGradeValue = Math.round(parseFloat(avgGrade.avg_grade) || 0);

      return {
        totalSubmissions: total,
        gradedSubmissions: graded,
        pendingSubmissions: total - graded,
        averageGrade: avgGradeValue
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get submission statistics for a user
   * @param {number} userId - User ID
   * @returns {Object} User submission statistics
   */
  static async getUserStats(userId) {
    try {
      const totalSubmissions = await db("assignment_submissions")
        .where("user_id", userId)
        .count("id as count")
        .first();

      const gradedSubmissions = await db("assignment_submissions")
        .where("user_id", userId)
        .where("submission_status", "graded")
        .count("id as count")
        .first();

      const avgGrade = await db("assignment_submissions")
        .where("user_id", userId)
        .where("submission_status", "graded")
        .whereNotNull("grade")
        .avg("grade as avg_grade")
        .first();

      const total = parseInt(totalSubmissions.count);
      const graded = parseInt(gradedSubmissions.count);
      const avgGradeValue = Math.round(parseFloat(avgGrade.avg_grade) || 0);

      return {
        totalSubmissions: total,
        gradedSubmissions: graded,
        pendingSubmissions: total - graded,
        averageGrade: avgGradeValue
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get recent submissions
   * @param {number} limit - Number of recent submissions to return
   * @returns {Array} Recent submissions
   */
  static async getRecentSubmissions(limit = 10) {
    try {
      const submissions = await db("assignment_submissions")
        .select(
          "assignment_submissions.*",
          "assignments.title as assignment_title",
          "users.name as student_name"
        )
        .leftJoin("assignments", "assignment_submissions.assignment_id", "assignments.id")
        .leftJoin("users", "assignment_submissions.user_id", "users.id")
        .orderBy("assignment_submissions.submitted_at", "desc")
        .limit(limit);
      return submissions.map(AssignmentSubmissionModel.sanitizeSubmission);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get late submissions
   * @param {number} assignmentId - Assignment ID
   * @returns {Array} Late submissions
   */
  static async getLateSubmissions(assignmentId) {
    try {
      const submissions = await db("assignment_submissions")
        .select(
          "assignment_submissions.*",
          "assignments.deadline",
          "users.name as student_name"
        )
        .leftJoin("assignments", "assignment_submissions.assignment_id", "assignments.id")
        .leftJoin("users", "assignment_submissions.user_id", "users.id")
        .where("assignment_submissions.assignment_id", assignmentId)
        .where("assignment_submissions.submitted_at", ">", db.raw("assignments.deadline"))
        .orderBy("assignment_submissions.submitted_at", "desc");
      return submissions.map(AssignmentSubmissionModel.sanitizeSubmission);
    } catch (error) {
      throw error;
    }
  }

  static sanitizeSubmission(submission) {
    if (!submission) return null;
    // Remove or mask any internal fields if needed
    // For now, just return the submission as is
    return submission;
  }
}

export default AssignmentSubmissionModel; 