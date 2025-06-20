import express from "express";
import { EnrollmentsController } from "../controllers/enrollments.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import requireAdmin from "../middleware/requireAdmin.js";
import requireInstructor from "../middleware/requireInstructor.js";
import requireStudent from "../middleware/requireStudent.js";
import {
  validateEnrollment,
  validateProgressUpdate,
} from "../validators/enrollments.validator.js";
import { apiLimiter as rateLimit } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

// Student routes
router.post(
  "/",
  authenticate,
  requireStudent,
  rateLimit,
  validateEnrollment,
  EnrollmentsController.enrollInCourse
);
router.get(
  "/my-enrollments",
  authenticate,
  requireStudent,
  EnrollmentsController.getMyEnrollments
);
router.get(
  "/:course_id/progress",
  authenticate,
  requireStudent,
  EnrollmentsController.getEnrollmentProgress
);
router.put(
  "/:course_id/progress",
  authenticate,
  requireStudent,
  validateProgressUpdate,
  EnrollmentsController.updateProgress
);
router.delete(
  "/:course_id",
  authenticate,
  requireStudent,
  EnrollmentsController.unenrollUser
);
router.post(
  "/:course_id/certificate",
  authenticate,
  requireStudent,
  EnrollmentsController.generateCertificate
);

// Instructor routes
router.get(
  "/course/:course_id",
  authenticate,
  requireInstructor,
  EnrollmentsController.getCourseEnrollments
);

// Admin routes
router.get(
  "/",
  authenticate,
  requireAdmin,
  EnrollmentsController.getAllEnrollments
);
router.get(
  "/stats",
  authenticate,
  requireAdmin,
  EnrollmentsController.getEnrollmentStats
);
router.get(
  "/export",
  authenticate,
  requireAdmin,
  EnrollmentsController.exportEnrollments
);

export default router;
