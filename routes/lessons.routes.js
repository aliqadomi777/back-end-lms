import express from "express";
import { LessonsController } from "../controllers/lessons.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import requireInstructor from "../middleware/requireInstructor.js";
import requireStudent from "../middleware/requireStudent.js";
import {
  validateLessonCreation,
  validateLessonUpdate,
  validateLessonReorder,
  validateLessonView,
} from "../validators/lessons.validator.js";

const router = express.Router();

// Public/Student routes (with optional authentication)
router.get(
  "/module/:module_id",
  authenticate,
  LessonsController.getModuleLessons
);
router.get("/:id", authenticate, LessonsController.getLessonById);

// Student routes
router.post(
  "/:id/complete",
  authenticate,
  requireStudent,
  LessonsController.markLessonComplete
);
router.delete(
  "/:id/complete",
  authenticate,
  requireStudent,
  LessonsController.markLessonIncomplete
);
router.post(
  "/:id/view",
  authenticate,
  requireStudent,
  validateLessonView,
  LessonsController.trackLessonView
);

// Instructor routes
router.post(
  "/module/:module_id",
  authenticate,
  requireInstructor,
  validateLessonCreation,
  LessonsController.createLesson
);
router.put(
  "/:id",
  authenticate,
  requireInstructor,
  validateLessonUpdate,
  LessonsController.updateLesson
);
router.delete(
  "/:id",
  authenticate,
  requireInstructor,
  LessonsController.deleteLesson
);
router.put(
  "/module/:module_id/reorder",
  authenticate,
  requireInstructor,
  validateLessonReorder,
  LessonsController.reorderLessons
);
router.post(
  "/:id/duplicate",
  authenticate,
  requireInstructor,
  LessonsController.duplicateLesson
);

export default router;
