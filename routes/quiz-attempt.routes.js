/**
 * Quiz Attempt Routes
 *
 * This file defines all routes related to quiz attempts,
 * including starting attempts, submitting responses, and retrieving results.
 */

import express from "express";
import QuizAttemptController from "../controllers/quiz-attempt.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";
import { validateSubmitQuiz } from "../validators/quizzes.validator.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Start a new quiz attempt
router.post(
  "/quizzes/:quizId/attempts",
  requireRole(["student", "instructor", "admin"]),
  validate(),
  QuizAttemptController.startAttempt
);

// Submit a quiz response
router.post(
  "/attempts/:attemptId/responses",
  requireRole(["student", "instructor", "admin"]),
  validateSubmitQuiz,
  QuizAttemptController.submitResponse
);

// Complete a quiz attempt
router.post(
  "/attempts/:attemptId/complete",
  requireRole(["student", "instructor", "admin"]),
  validate(),
  QuizAttemptController.completeAttempt
);

// Get attempt details with responses
router.get(
  "/attempts/:attemptId",
  requireRole(["student", "instructor", "admin"]),
  QuizAttemptController.getAttempt
);

// Get user's attempts for a quiz
router.get(
  "/quizzes/:quizId/attempts",
  requireRole(["student", "instructor", "admin"]),
  QuizAttemptController.getUserAttempts
);

// Get quiz statistics (instructor/admin only)
router.get(
  "/quizzes/:quizId/statistics",
  requireRole(["instructor", "admin"]),
  QuizAttemptController.getQuizStatistics
);

// Get user's best attempt for a quiz
router.get(
  "/quizzes/:quizId/best-attempt",
  requireRole(["student", "instructor", "admin"]),
  QuizAttemptController.getBestAttempt
);

export default router;
