/**
 * Quiz Attempt Service
 *
 * This service handles all quiz attempt and response related operations,
 * including starting attempts, submitting responses, and retrieving results.
 */

import QuizAttemptModel from '../models/QuizAttempt.model.js';
import QuizModel from '../models/Quiz.model.js';
import { AppError } from '../utils/AppError.js';
import { paginate } from '../utils/pagination.js';

class QuizAttemptService {
  /**
   * Start a new quiz attempt
   * @param {number} quizId - Quiz ID
   * @param {number} userId - User ID
   * @returns {Object} Quiz attempt data
   */
  static async startAttempt(userId, quizId) {
    const attempt = await QuizAttemptModel.startAttempt(userId, quizId);
    if (!attempt) throw AppError.badRequest('Could not start attempt');
    return QuizAttemptModel.sanitize(attempt);
  }

  /**
   * Submit a quiz response
   * @param {number} attemptId - Attempt ID
   * @param {number} questionId - Question ID
   * @param {Array} selectedOptions - Array of selected option IDs
   * @param {string} textResponse - Text response for open-ended questions
   * @returns {Object} Response data
   */
  static async submitResponse(
    attemptId,
    questionId,
    selectedOptions = [],
    textResponse = null
  ) {
    const response = await QuizAttemptModel.submitResponse(attemptId, questionId, selectedOptions, textResponse);
    if (!response) throw AppError.badRequest('Could not submit response');
    return QuizAttemptModel.sanitizeResponse(response);
  }

  /**
   * Complete a quiz attempt
   * @param {number} attemptId - Attempt ID
   * @returns {Object} Completed attempt data with score
   */
  static async completeAttempt(attemptId) {
    const completedAttempt = await QuizAttemptModel.completeAttempt(attemptId);
    if (!completedAttempt) throw AppError.badRequest('Could not complete attempt');
    return QuizAttemptModel.sanitize(completedAttempt);
  }

  /**
   * Get attempt details with responses
   * @param {number} attemptId - Attempt ID
   * @returns {Object} Attempt data with responses
   */
  static async getAttempt(attemptId) {
    const attempt = await QuizAttemptModel.getAttemptWithResponses(attemptId);
    if (!attempt) throw AppError.notFound('Attempt not found');
    return QuizAttemptModel.sanitizeAttemptWithResponses(attempt);
  }

  /**
   * Get user's attempts for a quiz
   * @param {number} quizId - Quiz ID
   * @param {number} userId - User ID
   * @returns {Array} List of attempts
   */
  static async getUserAttempts(quizId, userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const { data, pagination } = await QuizAttemptModel.getUserAttempts(quizId, userId, { page, limit });
    return {
      data: data.map(QuizAttemptModel.sanitize),
      pagination
    };
  }

  /**
   * Get quiz statistics
   * @param {number} quizId - Quiz ID
   * @returns {Object} Quiz statistics
   */
  static async getQuizStatistics(quizId) {
    const stats = await QuizAttemptModel.getQuizStatistics(quizId);
    if (!stats) throw AppError.notFound('Quiz statistics not found');
    return stats;
  }

  /**
   * Get user's best attempt for a quiz
   * @param {number} quizId - Quiz ID
   * @param {number} userId - User ID
   * @returns {Object} Best attempt
   */
  static async getBestAttempt(quizId, userId) {
    const attempt = await QuizAttemptModel.getBestAttempt(quizId, userId);
    if (!attempt) throw AppError.notFound('Best attempt not found');
    return QuizAttemptModel.sanitize(attempt);
  }
}

export default QuizAttemptService;
