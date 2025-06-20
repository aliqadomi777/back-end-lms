import express from "express";
import { QuizzesController } from "../controllers/quizzes.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import requireInstructor from "../middleware/requireInstructor.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { apiLimiter as rateLimiter } from "../middleware/rateLimit.middleware.js";
import {
  validateCreateQuiz,
  validateUpdateQuiz,
  validateAddQuestion,
  validateUpdateQuestion,
  validateSubmitQuiz,
  validateExportQuizResults,
} from "../validators/quizzes.validator.js";

const router = express.Router();

// Public routes (for enrolled students)
router.get("/course/:courseId", QuizzesController.getCourseQuizzes);
router.get("/:id", QuizzesController.getQuizById);

// Student routes (require authentication)
router.post(
  "/:id/start",
  authenticate,
  rateLimiter, // 10 attempts per 15 minutes
  QuizzesController.startQuizAttempt
);

router.post(
  "/:id/submit",
  authenticate,
  rateLimiter, // 5 submissions per 15 minutes
  validateSubmitQuiz,
  QuizzesController.submitQuizAttempt
);

router.get("/:id/attempts", authenticate, QuizzesController.getQuizAttempts);

// Instructor routes
router.post(
  "/",
  authenticate,
  requireInstructor,
  rateLimiter, // 20 quiz creations per 15 minutes
  validateCreateQuiz,
  QuizzesController.createQuiz
);

router.put(
  "/:id",
  authenticate,
  requireInstructor,
  rateLimiter, // 30 updates per 15 minutes
  validateUpdateQuiz,
  QuizzesController.updateQuiz
);

router.delete(
  "/:id",
  authenticate,
  requireInstructor,
  rateLimiter, // 10 deletions per 15 minutes
  QuizzesController.deleteQuiz
);

// Question management routes
router.post(
  "/:id/questions",
  authenticate,
  requireInstructor,
  rateLimiter, // 50 question additions per 15 minutes
  validateAddQuestion,
  QuizzesController.addQuestion
);

router.put(
  "/:id/questions/:questionId",
  authenticate,
  requireInstructor,
  rateLimiter, // 50 question updates per 15 minutes
  validateUpdateQuestion,
  QuizzesController.updateQuestion
);

router.delete(
  "/:id/questions/:questionId",
  authenticate,
  requireInstructor,
  rateLimiter, // 20 question deletions per 15 minutes
  QuizzesController.deleteQuestion
);

// Quiz results and analytics routes
router.get(
  "/:id/results",
  authenticate,
  requireInstructor,
  QuizzesController.getQuizResults
);

router.get(
  "/:id/analytics",
  authenticate,
  requireInstructor,
  QuizzesController.getQuizAnalytics
);

router.post(
  "/:id/export",
  authenticate,
  requireInstructor,
  rateLimiter, // 5 exports per 15 minutes
  validateExportQuizResults,
  QuizzesController.exportQuizResults
);

export default router;
