/**
 * Assignment Submission Routes
 *
 * This file defines all routes related to assignment submissions,
 * including submissions, file uploads, and grading.
 */

import express from "express";
import AssignmentSubmissionController from "../controllers/assignment-submission.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";
import { assignmentValidators } from "../validators/assignments.validator.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Submit an assignment
router.post(
  "/assignments/:assignmentId/submit",
  requireRole(["student", "instructor", "admin"]),
  validate(assignmentValidators.submitAssignment),
  AssignmentSubmissionController.submitAssignment
);

// Grade a submission
router.post(
  "/submissions/:submissionId/grade",
  requireRole(["instructor", "admin"]),
  validate(assignmentValidators.gradeSubmission),
  AssignmentSubmissionController.gradeSubmission
);

// Get a specific submission
router.get(
  "/submissions/:submissionId",
  requireRole(["student", "instructor", "admin"]),
  AssignmentSubmissionController.getSubmission
);

// Get all submissions for an assignment
router.get(
  "/assignments/:assignmentId/submissions",
  requireRole(["instructor", "admin"]),
  AssignmentSubmissionController.getSubmissions
);

// Get student's submission for an assignment
router.get(
  "/assignments/:assignmentId/my-submission",
  requireRole(["student", "instructor", "admin"]),
  AssignmentSubmissionController.getMySubmission
);

// Delete a submission
router.delete(
  "/submissions/:submissionId",
  requireRole(["student", "instructor", "admin"]),
  AssignmentSubmissionController.deleteSubmission
);

export default router;
