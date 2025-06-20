import express from "express";
import { CoursesController } from "../controllers/courses.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import requireAdmin from "../middleware/requireAdmin.js";
import requireInstructor from "../middleware/requireInstructor.js";
import {
  validateCourseCreation,
  validateCourseUpdate,
} from "../validators/courses.validator.js";
import { apiLimiter as rateLimit } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

// Public routes
router.get("/", CoursesController.getAllCourses);
router.get("/:id", CoursesController.getCourseById);

// Instructor routes
router.post(
  "/",
  authenticate,
  requireInstructor,
  rateLimit,
  validateCourseCreation,
  CoursesController.createCourse
);
router.put(
  "/:id",
  authenticate,
  requireInstructor,
  validateCourseUpdate,
  CoursesController.updateCourse
);
router.delete(
  "/:id",
  authenticate,
  requireInstructor,
  CoursesController.deleteCourse
);
router.put(
  "/:id/publish",
  authenticate,
  requireInstructor,
  CoursesController.publishCourse
);
router.put(
  "/:id/unpublish",
  authenticate,
  requireInstructor,
  CoursesController.unpublishCourse
);
router.get(
  "/instructor/my-courses",
  authenticate,
  requireInstructor,
  CoursesController.getInstructorCourses
);
router.get(
  "/:id/analytics",
  authenticate,
  requireInstructor,
  CoursesController.getCourseAnalytics
);

// Admin routes
router.put(
  "/:id/approve",
  authenticate,
  requireAdmin,
  CoursesController.approveCourse
);
router.put(
  "/:id/reject",
  authenticate,
  requireAdmin,
  CoursesController.rejectCourse
);

export default router;
