import express from "express";
import { AssignmentController } from "../controllers/assignments.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import requireInstructor from "../middleware/requireInstructor.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { validate } from "../middleware/validate.middleware.js";
import { assignmentValidators } from "../validators/assignments.validator.js";
import fileUploadMiddleware from "../middleware/fileUpload.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Assignment CRUD operations
router.post(
  "/",
  requireInstructor,
  validate(assignmentValidators.createAssignment),
  AssignmentController.createAssignment
);

router.put(
  "/:id",
  requireInstructor,
  validate(assignmentValidators.updateAssignment),
  AssignmentController.updateAssignment
);

router.delete("/:id", requireInstructor, AssignmentController.deleteAssignment);

router.get("/:id", AssignmentController.getAssignmentDetails);

router.get(
  "/",
  validate(assignmentValidators.listAssignments),
  AssignmentController.listAssignments
);

// Assignment statistics
router.get(
  "/:id/stats",
  requireInstructor,
  AssignmentController.getAssignmentStats
);

// Assignment submissions
router.post(
  "/:id/submit",
  fileUploadMiddleware.assignmentUpload.single("file"),
  validate(assignmentValidators.submitAssignment),
  AssignmentController.submitAssignment
);

router.get(
  "/:id/submissions",
  requireInstructor,
  validate(assignmentValidators.getSubmissions),
  AssignmentController.getSubmissionsForAssignment
);

router.get("/:id/submission-status", AssignmentController.getSubmissionStatus);

// Grading
router.put(
  "/submissions/:submissionId/grade",
  requireInstructor,
  validate(assignmentValidators.gradeSubmission),
  AssignmentController.gradeSubmission
);

// Lesson-specific assignment
router.get("/lesson/:lessonId", AssignmentController.getAssignmentForLesson);

export default router;
