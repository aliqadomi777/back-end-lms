/**
 * Assignment Submission Controller
 *
 * This controller handles all assignment submission related API endpoints,
 * including submissions, file uploads, and grading.
 */

import AssignmentSubmissionService from "../services/assignment-submission.service.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { assignmentUpload } from "../middleware/fileUpload.middleware.js";

class AssignmentSubmissionController {
  /**
   * Submit an assignment
   * @route POST /api/assignments/:assignmentId/submit
   * @access Private
   */
  static submitAssignment = [
    assignmentUpload.array("files", 5), // Allow up to 5 files
    asyncHandler(async (req, res) => {
      const { assignmentId } = req.params;
      const userId = req.user.id;
      const { submission_text } = req.body;
      const files = req.files || [];

      validateRequest(req, {
        body: {
          submission_text: { type: "string" },
        },
      });

      const submission = await AssignmentSubmissionService.submitAssignment({
        assignment_id: assignmentId,
        user_id: userId,
        submission_text,
        files,
      });

      res.status(201).json({
        success: true,
        data: submission,
      });
    }),
  ];

  /**
   * Grade an assignment submission
   * @route POST /api/submissions/:submissionId/grade
   * @access Private (Instructor/Admin only)
   */
  static gradeSubmission = asyncHandler(async (req, res) => {
    const { submissionId } = req.params;
    const { points_earned, feedback } = req.body;
    const gradedBy = req.user.id;

    validateRequest(req, {
      body: {
        points_earned: { type: "number", required: true },
        feedback: { type: "string" },
      },
    });

    const submission = await AssignmentSubmissionService.gradeSubmission(
      submissionId,
      { points_earned, feedback },
      gradedBy
    );

    res.status(200).json({
      success: true,
      data: submission,
    });
  });

  /**
   * Get a specific submission
   * @route GET /api/submissions/:submissionId
   * @access Private
   */
  static getSubmission = asyncHandler(async (req, res) => {
    const { submissionId } = req.params;
    const userId = req.user.id;

    const submission =
      await AssignmentSubmissionService.getSubmissionById(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: "Submission not found",
      });
    }

    // Ensure user can only access their own submissions or is an instructor/admin
    if (
      submission.user_id !== userId &&
      !["instructor", "admin"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to access this submission",
      });
    }

    res.status(200).json({
      success: true,
      data: submission,
    });
  });

  /**
   * Get submissions for an assignment
   * @route GET /api/assignments/:assignmentId/submissions
   * @access Private (Instructor/Admin only)
   */
  static getSubmissions = asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    const { status, page, limit } = req.query;

    // Only instructors and admins can view all submissions
    if (!["instructor", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to view submissions",
      });
    }

    const result = await AssignmentSubmissionService.getSubmissions(
      assignmentId,
      {
        status,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
      }
    );

    res.status(200).json({
      success: true,
      data: result.submissions,
      pagination: result.pagination,
    });
  });

  /**
   * Get student's submission for an assignment
   * @route GET /api/assignments/:assignmentId/my-submission
   * @access Private
   */
  static getMySubmission = asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    const userId = req.user.id;

    const submission = await AssignmentSubmissionService.getStudentSubmission(
      assignmentId,
      userId
    );

    res.status(200).json({
      success: true,
      data: submission,
    });
  });

  /**
   * Delete a submission
   * @route DELETE /api/submissions/:submissionId
   * @access Private
   */
  static deleteSubmission = asyncHandler(async (req, res) => {
    const { submissionId } = req.params;
    const userId = req.user.id;

    const submission =
      await AssignmentSubmissionService.getSubmissionById(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: "Submission not found",
      });
    }

    // Ensure user can only delete their own submissions or is an instructor/admin
    if (
      submission.user_id !== userId &&
      !["instructor", "admin"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this submission",
      });
    }

    await AssignmentSubmissionService.deleteSubmission(submissionId);

    res.status(200).json({
      success: true,
      data: null,
    });
  });
}

export default AssignmentSubmissionController;
