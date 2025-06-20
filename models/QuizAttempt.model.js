/**
 * QuizAttempt Model
 *
 * Tracks quiz attempts and their results.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class QuizAttemptModel {
  /**
   * Get attempt by ID
   * @param {number} id - Attempt ID
   * @returns {Object|null} Attempt or null
   */
  static async findById(id) {
    try {
      return await db("quiz_attempts")
        .select(
          "quiz_attempts.*",
          "quizzes.title as quiz_title",
          "quizzes.passing_score",
          "quizzes.time_limit_minutes",
          "users.name as student_name",
          "users.email as student_email"
        )
        .leftJoin("quizzes", "quiz_attempts.quiz_id", "quizzes.id")
        .leftJoin("users", "quiz_attempts.user_id", "users.id")
        .where("quiz_attempts.id", id)
        .first();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get attempts by user and quiz
   * @param {number} userId - User ID
   * @param {number} quizId - Quiz ID
   * @returns {Array} User's attempts for the quiz
   */
  static async getByUserAndQuiz(userId, quizId) {
    try {
      const attempts = await db("quiz_attempts")
        .select("*")
        .where({
          user_id: userId,
          quiz_id: quizId
        })
        .orderBy("attempt_number", "asc");
      return attempts.map(QuizAttemptModel.sanitizeAttempt);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get attempts by user
   * @param {number} userId - User ID
   * @returns {Array} User's quiz attempts
   */
  static async getByUser(userId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("quiz_attempts")
        .select(
          "quiz_attempts.*",
          "quizzes.title as quiz_title",
          "quizzes.passing_score"
        )
        .leftJoin("quizzes", "quiz_attempts.quiz_id", "quizzes.id")
        .where("quiz_attempts.user_id", userId);
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("quiz_attempts.id as count");
      const total = parseInt(count);
      // Apply pagination
      const attempts = await query
        .orderBy("quiz_attempts.started_at", "desc")
        .limit(params.limit)
        .offset(params.offset);
      return {
        data: attempts.map(QuizAttemptModel.sanitizeAttempt),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get attempts by quiz
   * @param {number} quizId - Quiz ID
   * @returns {Array} Quiz attempts
   */
  static async getByQuiz(quizId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("quiz_attempts")
        .select(
          "quiz_attempts.*",
          "users.name as student_name",
          "users.email as student_email"
        )
        .leftJoin("users", "quiz_attempts.user_id", "users.id")
        .where("quiz_attempts.quiz_id", quizId);
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("quiz_attempts.id as count");
      const total = parseInt(count);
      // Apply pagination
      const attempts = await query
        .orderBy("quiz_attempts.started_at", "desc")
        .limit(params.limit)
        .offset(params.offset);
      return {
        data: attempts.map(QuizAttemptModel.sanitizeAttempt),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get current attempt (in progress)
   * @param {number} userId - User ID
   * @param {number} quizId - Quiz ID
   * @returns {Object|null} Current attempt or null
   */
  static async getCurrentAttempt(userId, quizId) {
    try {
      return await db("quiz_attempts")
        .where({
          user_id: userId,
          quiz_id: quizId,
          attempt_status: "in_progress"
        })
        .first();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Start a new attempt
   * @param {number} userId - User ID
   * @param {number} quizId - Quiz ID
   * @returns {Object} Created attempt
   */
  static async startAttempt(userId, quizId) {
    try {
      // Validate user exists
      const user = await db("users").where("id", userId).first();
      if (!user) {
        throw AppError.notFound("User not found");
      }

      // Validate quiz exists and is active
      const quiz = await db("quizzes").where("id", quizId).where("is_active", true).first();
      if (!quiz) {
        throw AppError.notFound("Quiz not found or inactive");
      }

      // Check if user has reached attempt limit
      const existingAttempts = await this.getByUserAndQuiz(userId, quizId);
      const attemptLimit = quiz.attempt_limit || 3;

      if (existingAttempts.length >= attemptLimit) {
        throw AppError.forbidden(`Maximum attempts (${attemptLimit}) reached for this quiz`);
      }

      // Check if there's already an in-progress attempt
      const currentAttempt = await this.getCurrentAttempt(userId, quizId);
      if (currentAttempt) {
        throw AppError.conflict("You already have an attempt in progress");
      }

      const attemptNumber = existingAttempts.length + 1;

      const [attempt] = await db("quiz_attempts")
        .insert({
          quiz_id: quizId,
          user_id: userId,
          attempt_number: attemptNumber,
          attempt_status: "in_progress",
          started_at: db.fn.now()
        })
        .returning("*");

      return QuizAttemptModel.sanitizeAttempt(attempt);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Submit attempt
   * @param {number} attemptId - Attempt ID
   * @param {number} percentageScore - Percentage score
   * @param {number} timeSpentMinutes - Time spent in minutes
   * @returns {Object} Updated attempt
   */
  static async submitAttempt(attemptId, percentageScore, timeSpentMinutes) {
    try {
      // Check if attempt exists and is in progress
      const attempt = await db("quiz_attempts").where("id", attemptId).first();
      if (!attempt) {
        throw AppError.notFound("Attempt not found");
      }

      if (attempt.attempt_status !== "in_progress") {
        throw AppError.badRequest("Attempt is not in progress");
      }

      // Get quiz details
      const quiz = await db("quizzes").where("id", attempt.quiz_id).first();
      if (!quiz) {
        throw AppError.notFound("Quiz not found");
      }

      // Validate score
      if (percentageScore < 0 || percentageScore > 100) {
        throw AppError.badRequest("Percentage score must be between 0 and 100");
      }

      // Determine if passed
      const isPassed = percentageScore >= quiz.passing_score;

      const [updatedAttempt] = await db("quiz_attempts")
        .where("id", attemptId)
        .update({
          percentage_score: percentageScore,
          is_passed: isPassed,
          submitted_at: db.fn.now(),
          time_spent_minutes: timeSpentMinutes || null,
          attempt_status: "completed"
        })
        .returning("*");

      return QuizAttemptModel.sanitizeAttempt(updatedAttempt);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Abandon attempt
   * @param {number} attemptId - Attempt ID
   * @returns {Object} Updated attempt
   */
  static async abandonAttempt(attemptId) {
    try {
      // Check if attempt exists and is in progress
      const attempt = await db("quiz_attempts").where("id", attemptId).first();
      if (!attempt) {
        throw AppError.notFound("Attempt not found");
      }
      if (attempt.attempt_status !== "in_progress") {
        throw AppError.badRequest("Attempt is not in progress");
      }
      const [updatedAttempt] = await db("quiz_attempts")
        .where("id", attemptId)
        .update({
          attempt_status: "abandoned"
        })
        .returning("*");
      return QuizAttemptModel.sanitizeAttempt(updatedAttempt);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update attempt status
   * @param {number} attemptId - Attempt ID
   * @param {string} status - New status
   * @returns {Object} Updated attempt
   */
  static async updateStatus(attemptId, status) {
    try {
      const allowedStatuses = ["in_progress", "completed", "abandoned", "expired"];
      if (!allowedStatuses.includes(status)) {
        throw AppError.badRequest("Invalid attempt status");
      }
      const [updatedAttempt] = await db("quiz_attempts")
        .where("id", attemptId)
        .update({
          attempt_status: status
        })
        .returning("*");
      return QuizAttemptModel.sanitizeAttempt(updatedAttempt);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete attempt
   * @param {number} id - Attempt ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    try {
      // Check if attempt exists
      const attempt = await db("quiz_attempts").where("id", id).first();
      if (!attempt) {
        throw AppError.notFound("Attempt not found");
      }
      // Delete associated responses first
      await db("quiz_responses").where("attempt_id", id).del();
      // Delete attempt
      await db("quiz_attempts").where("id", id).del();
      return true;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get attempt statistics
   * @param {number} quizId - Quiz ID
   * @returns {Object} Attempt statistics
   */
  static async getQuizStats(quizId) {
    try {
      const totalAttempts = await db("quiz_attempts")
        .where("quiz_id", quizId)
        .count("id as count")
        .first();
      const completedAttempts = await db("quiz_attempts")
        .where("quiz_id", quizId)
        .where("attempt_status", "completed")
        .count("id as count")
        .first();
      const passedAttempts = await db("quiz_attempts")
        .where("quiz_id", quizId)
        .where("is_passed", true)
        .count("id as count")
        .first();
      const avgScore = await db("quiz_attempts")
        .where("quiz_id", quizId)
        .where("attempt_status", "completed")
        .avg("percentage_score as avg_score")
        .first();
      const total = parseInt(totalAttempts.count);
      const completed = parseInt(completedAttempts.count);
      const passed = parseInt(passedAttempts.count);
      const passRate = completed > 0 ? Math.round((passed / completed) * 100) : 0;
      const avgScoreValue = Math.round(parseFloat(avgScore.avg_score) || 0);
      return {
        totalAttempts: total,
        completedAttempts: completed,
        passedAttempts: passed,
        failedAttempts: completed - passed,
        passRate,
        averageScore: avgScoreValue
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get user attempt statistics
   * @param {number} userId - User ID
   * @returns {Object} User attempt statistics
   */
  static async getUserStats(userId) {
    try {
      const totalAttempts = await db("quiz_attempts")
        .where("user_id", userId)
        .count("id as count")
        .first();
      const completedAttempts = await db("quiz_attempts")
        .where("user_id", userId)
        .where("attempt_status", "completed")
        .count("id as count")
        .first();
      const passedAttempts = await db("quiz_attempts")
        .where("user_id", userId)
        .where("is_passed", true)
        .count("id as count")
        .first();
      const avgScore = await db("quiz_attempts")
        .where("user_id", userId)
        .where("attempt_status", "completed")
        .avg("percentage_score as avg_score")
        .first();
      const total = parseInt(totalAttempts.count);
      const completed = parseInt(completedAttempts.count);
      const passed = parseInt(passedAttempts.count);
      const passRate = completed > 0 ? Math.round((passed / completed) * 100) : 0;
      const avgScoreValue = Math.round(parseFloat(avgScore.avg_score) || 0);
      return {
        totalAttempts: total,
        completedAttempts: completed,
        passedAttempts: passed,
        failedAttempts: completed - passed,
        passRate,
        averageScore: avgScoreValue
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get recent attempts
   * @param {number} limit - Number of recent attempts to return
   * @returns {Array} Recent quiz attempts
   */
  static async getRecentAttempts(limit = 10) {
    try {
      const attempts = await db("quiz_attempts")
        .select(
          "quiz_attempts.*",
          "quizzes.title as quiz_title",
          "users.name as student_name"
        )
        .leftJoin("quizzes", "quiz_attempts.quiz_id", "quizzes.id")
        .leftJoin("users", "quiz_attempts.user_id", "users.id")
        .orderBy("quiz_attempts.started_at", "desc")
        .limit(limit);
      return attempts.map(QuizAttemptModel.sanitizeAttempt);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Clean up expired attempts
   * @returns {number} Number of expired attempts
   */
  static async cleanupExpiredAttempts() {
    try {
      // Get quizzes with time limits
      const quizzesWithTimeLimit = await db("quizzes")
        .select("id", "time_limit_minutes")
        .whereNotNull("time_limit_minutes");
      let expiredCount = 0;
      for (const quiz of quizzesWithTimeLimit) {
        const expiredAttempts = await db("quiz_attempts")
          .where("quiz_id", quiz.id)
          .where("attempt_status", "in_progress")
          .where("started_at", "<", db.raw(`CURRENT_TIMESTAMP - INTERVAL '${quiz.time_limit_minutes} minutes'`));
        if (expiredAttempts.length > 0) {
          await db("quiz_attempts")
            .whereIn("id", expiredAttempts.map(a => a.id))
            .update({
              attempt_status: "expired"
            });
          expiredCount += expiredAttempts.length;
        }
      }
      return expiredCount;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Submit a response for a quiz attempt
   * @param {number} attemptId
   * @param {number} questionId
   * @param {Array} selectedOptions
   * @param {string} textResponse
   * @returns {Object} Created response
   */
  static async submitResponse(attemptId, questionId, selectedOptions = [], textResponse = null) {
    // Import here to avoid circular dependency
    const QuizResponseModel = (await import('./QuizResponse.model.js')).default;
    return await QuizResponseModel.create({
      attempt_id: attemptId,
      question_id: questionId,
      selected_options: selectedOptions,
      text_response: textResponse
    });
  }

  /**
   * Complete a quiz attempt (finalize and grade)
   * @param {number} attemptId
   * @returns {Object} Completed attempt with score
   */
  static async completeAttempt(attemptId) {
    try {
      const attempt = await db("quiz_attempts").where("id", attemptId).first();
      if (!attempt) {
        throw AppError.notFound("Attempt not found");
      }
      if (attempt.attempt_status !== "in_progress") {
        throw AppError.badRequest("Attempt is not in progress");
      }
      const [updatedAttempt] = await db("quiz_attempts")
        .where("id", attemptId)
        .update({
          attempt_status: "completed",
          submitted_at: db.fn.now()
        })
        .returning("*");
      return QuizAttemptModel.sanitizeAttempt(updatedAttempt);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get attempt with all responses
   * @param {number} attemptId
   * @returns {Object} Attempt with responses
   */
  static async getAttemptWithResponses(attemptId) {
    try {
      const attempt = await db("quiz_attempts").where("id", attemptId).first();
      if (!attempt) {
        throw AppError.notFound("Attempt not found");
      }
      // Import here to avoid circular dependency
      const QuizResponseModel = (await import('./QuizResponse.model.js')).default;
      const responses = await QuizResponseModel.getByAttempt(attemptId);
      return {
        ...QuizAttemptModel.sanitizeAttempt(attempt),
        responses
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get user's best attempt for a quiz
   * @param {number} quizId
   * @param {number} userId
   * @returns {Object|null} Best attempt
   */
  static async getBestAttempt(quizId, userId) {
    try {
      const attempt = await db("quiz_attempts")
        .where({ quiz_id: quizId, user_id: userId, attempt_status: "completed" })
        .orderBy("percentage_score", "desc")
        .first();
      return attempt ? QuizAttemptModel.sanitizeAttempt(attempt) : null;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get results for a quiz (for instructor analytics)
   * @param {number} quizId
   * @param {Object} options - { page, limit }
   * @returns {Object} Results with pagination
   */
  static async getResultsByQuiz(quizId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("quiz_attempts")
        .select(
          "quiz_attempts.*",
          "users.name as student_name",
          "users.email as student_email"
        )
        .leftJoin("users", "quiz_attempts.user_id", "users.id")
        .where("quiz_attempts.quiz_id", quizId)
        .where("quiz_attempts.attempt_status", "completed");
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("quiz_attempts.id as count");
      const total = parseInt(count);
      // Apply pagination
      const attempts = await query
        .orderBy("quiz_attempts.percentage_score", "desc")
        .limit(params.limit)
        .offset(params.offset);
      return {
        data: attempts.map(QuizAttemptModel.sanitizeAttempt),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Export quiz results (CSV/Excel)
   * @param {number} quizId
   * @param {string} format - 'csv' or 'excel'
   * @returns {string|Buffer} Exported data
   */
  static async exportResults(quizId, format = 'csv') {
    try {
      // Export logic handled in service layer or utility
      // This method is a placeholder for service to call
      return null;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get paginated attempts for a user on a quiz
   * @param {number} quizId
   * @param {number} userId
   * @param {object} options - { page, limit }
   * @returns {object} { data, pagination }
   */
  static async getUserAttempts(quizId, userId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db('quiz_attempts')
        .select('*')
        .where({ quiz_id: quizId, user_id: userId });
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count('id as count');
      const total = parseInt(count);
      // Apply pagination
      const attempts = await query
        .orderBy('started_at', 'desc')
        .limit(params.limit)
        .offset(params.offset);
      return {
        data: attempts.map(QuizAttemptModel.sanitizeAttempt),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  static sanitizeAttempt(attempt) {
    if (!attempt) return null;
    // Remove or mask any internal fields if needed
    // For now, just return the attempt as is
    return attempt;
  }
}

export default QuizAttemptModel; 