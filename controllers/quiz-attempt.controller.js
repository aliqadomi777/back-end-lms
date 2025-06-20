/**
 * Quiz Attempt Controller
 *
 * This controller handles all quiz attempt related API endpoints,
 * including starting attempts, submitting responses, and retrieving results.
 */

import QuizAttemptService from "../services/quiz-attempt.service.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";

class QuizAttemptController {
  /**
   * Start a new quiz attempt
   * @route POST /api/quizzes/:quizId/attempts
   * @access Private
   */
  static startAttempt = asyncHandler(async (req, res) => {
    const { quizId } = req.params;
    const userId = req.user.id;

    const attempt = await QuizAttemptService.startAttempt(quizId, userId);

    res.status(201).json({
      success: true,
      data: attempt,
    });
  });

  /**
   * Submit a quiz response
   * @route POST /api/quiz-attempts/:attemptId/submit
   * @access Private
   */
  static submitResponse = asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    const { questionId, selectedOptions, textResponse } = req.body;

    validateRequest(req, {
      questionId: "required|numeric",
      selectedOptions: "array",
      textResponse: "string",
    });

    const response = await QuizAttemptService.submitResponse(
      attemptId,
      questionId,
      selectedOptions,
      textResponse
    );

    res.status(200).json({
      success: true,
      data: response,
    });
  });

  /**
   * Complete a quiz attempt
   * @route POST /api/quiz-attempts/:attemptId/complete
   * @access Private
   */
  static completeAttempt = asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    const attempt = await QuizAttemptService.completeAttempt(attemptId);

    res.status(200).json({
      success: true,
      data: attempt,
    });
  });

  /**
   * Get attempt details with responses
   * @route GET /api/quiz-attempts/:attemptId
   * @access Private
   */
  static getAttempt = asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    const userId = req.user.id;

    const attempt = await QuizAttemptService.getAttempt(attemptId);

    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: "Quiz attempt not found",
      });
    }

    // Ensure user can only access their own attempts
    if (attempt.user_id !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to access this attempt",
      });
    }

    res.status(200).json({
      success: true,
      data: attempt,
    });
  });

  /**
   * Get user's attempts for a quiz
   * @route GET /api/quizzes/:quizId/attempts
   * @access Private
   */
  static getUserAttempts = asyncHandler(async (req, res) => {
    const { quizId } = req.params;
    const userId = req.user.id;

    const attempts = await QuizAttemptService.getUserAttempts(quizId, userId);

    res.status(200).json({
      success: true,
      data: attempts,
    });
  });

  /**
   * Get quiz statistics
   * @route GET /api/quizzes/:quizId/statistics
   * @access Private (Instructor/Admin only)
   */
  static getQuizStatistics = asyncHandler(async (req, res) => {
    const { quizId } = req.params;

    // Only instructors and admins can view quiz statistics
    if (!["instructor", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to view quiz statistics",
      });
    }

    const statistics = await QuizAttemptService.getQuizStatistics(quizId);

    res.status(200).json({
      success: true,
      data: statistics,
    });
  });

  /**
   * Get user's best attempt for a quiz
   * @route GET /api/quizzes/:quizId/best-attempt
   * @access Private
   */
  static getBestAttempt = asyncHandler(async (req, res) => {
    const { quizId } = req.params;
    const userId = req.user.id;

    const attempt = await QuizAttemptService.getBestAttempt(quizId, userId);

    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: "No completed attempts found for this quiz",
      });
    }

    res.status(200).json({
      success: true,
      data: attempt,
    });
  });
}

export default QuizAttemptController;
