/**
 * Assignment Submission Service
 *
 * This service handles all assignment submission and grading related functionality,
 * including file uploads, submissions, and grading.
 */

import AssignmentSubmissionModel from '../models/AssignmentSubmission.model.js';
import AssignmentModel from '../models/Assignment.model.js';
import { AppError } from '../utils/AppError.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';
import FileUploadModel from '../models/FileUpload.model.js';
import { deleteFromCloudinary } from '../utils/cloudinary.js';
import { cleanupFiles } from '../utils/fileUpload.js';

class AssignmentSubmissionService {
  /**
   * Submit an assignment
   * @param {Object} submissionData - Submission data
   * @returns {Object} Created submission
   */
  static async submitAssignment(submissionData) {
    const assignment = await AssignmentModel.findById(submissionData.assignment_id);
    if (!assignment) throw AppError.notFound('Assignment not found');
    if (assignment.deadline && new Date() > new Date(assignment.deadline) && !assignment.allow_late_submission) {
      throw AppError.forbidden('Assignment deadline has passed and late submissions are not allowed');
    }
    const existing = await AssignmentSubmissionModel.getByUserAndAssignment(submissionData.user_id, submissionData.assignment_id);
    if (existing) throw AppError.conflict('Assignment already submitted');
    const submission = await AssignmentSubmissionModel.create(submissionData);
    return AssignmentSubmissionModel.sanitize(submission);
  }

  /**
   * Grade an assignment submission
   * @param {number} submissionId - Submission ID
   * @param {Object} gradingData - Grade data
   * @returns {Object} Updated submission
   */
  static async gradeSubmission(submissionId, gradingData) {
    const submission = await AssignmentSubmissionModel.findById(submissionId);
    if (!submission) throw AppError.notFound('Submission not found');
    if (submission.submission_status !== 'submitted') throw AppError.badRequest('Can only grade submitted assignments');
    const updated = await AssignmentSubmissionModel.gradeSubmission(submissionId, gradingData);
    return AssignmentSubmissionModel.sanitize(updated);
  }

  /**
   * Get submission by ID
   * @param {number} submissionId - Submission ID
   * @returns {Object} Submission with files
   */
  static async getSubmissionById(submissionId) {
    const submission = await AssignmentSubmissionModel.findById(submissionId);
    if (!submission) throw AppError.notFound('Submission not found');
    return AssignmentSubmissionModel.sanitize(submission);
  }

  /**
   * Get submissions for an assignment
   * @param {number} assignmentId - Assignment ID
   * @returns {Object} Submissions with pagination
   */
  static async getSubmissionsByAssignment(assignmentId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const { data, pagination } = await AssignmentSubmissionModel.getByAssignment(assignmentId, { page, limit });
    return {
      data: data.map(AssignmentSubmissionModel.sanitize),
      pagination
    };
  }

  /**
   * Get student's submissions for an assignment
   * @param {number} userId - Student ID
   * @returns {Object} Submissions with pagination
   */
  static async getSubmissionsByUser(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const { data, pagination } = await AssignmentSubmissionModel.getByUser(userId, { page, limit });
    return {
      data: data.map(AssignmentSubmissionModel.sanitize),
      pagination
    };
  }

  /**
   * Delete a submission
   * @param {number} submissionId - Submission ID
   * @returns {boolean} Success status
   */
  static async deleteSubmission(submissionId) {
    // Fetch the submission
    const submission = await AssignmentSubmissionModel.findById(submissionId);
    if (!submission) throw AppError.notFound('Submission not found');
    // If there is an uploaded file, delete it from cloud/local and DB
    if (submission.submission_file_id) {
      const file = await FileUploadModel.findById(submission.submission_file_id);
      if (file) {
        // Try to delete from Cloudinary if public_id exists
        if (file.public_id) {
          await deleteFromCloudinary(file.public_id, file.mime_type && file.mime_type.startsWith('image') ? 'image' : file.mime_type && file.mime_type.startsWith('video') ? 'video' : 'raw');
        }
        // Try to delete from local disk if file_path exists
        if (file.file_path) {
          await cleanupFiles([{ path: file.file_path }]);
        }
        // Delete file record from DB
        await FileUploadModel.delete(file.id);
      }
    }
    // Delete the submission itself
    return await AssignmentSubmissionModel.delete(submissionId);
  }
}

export default AssignmentSubmissionService;
