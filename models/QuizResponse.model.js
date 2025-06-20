/**
 * QuizResponse Model
 *
 * Tracks individual question responses within quiz attempts.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { sanitizeString } from '../utils/validation.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class QuizResponseModel {
  /**
   * Get response by ID
   * @param {number} id - Response ID
   * @returns {Object|null} Response or null
   */
  static async findById(id) {
    try {
      const response = await db("quiz_responses")
        .select(
          "quiz_responses.*",
          "quiz_questions.question_text",
          "quiz_questions.question_type",
          "quiz_questions.points",
          "quiz_attempts.attempt_number"
        )
        .leftJoin("quiz_questions", "quiz_responses.question_id", "quiz_questions.id")
        .leftJoin("quiz_attempts", "quiz_responses.attempt_id", "quiz_attempts.id")
        .where("quiz_responses.id", id)
        .first();
      return QuizResponseModel.sanitizeResponse(response);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get responses by attempt
   * @param {number} attemptId - Attempt ID
   * @returns {Array} Responses for the attempt
   */
  static async getByAttempt(attemptId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("quiz_responses")
        .select(
          "quiz_responses.*",
          "quiz_questions.question_text",
          "quiz_questions.question_type",
          "quiz_questions.points",
          "quiz_questions.explanation"
        )
        .leftJoin("quiz_questions", "quiz_responses.question_id", "quiz_questions.id")
        .where("quiz_responses.attempt_id", attemptId)
        .orderBy("quiz_responses.answered_at", "asc");
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("quiz_responses.id as count");
      const total = parseInt(count);
      // Apply pagination
      const responses = await query.limit(params.limit).offset(params.offset);
      return {
        data: responses.map(QuizResponseModel.sanitizeResponse),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get response by attempt and question
   * @param {number} attemptId - Attempt ID
   * @param {number} questionId - Question ID
   * @returns {Object|null} Response or null
   */
  static async getByAttemptAndQuestion(attemptId, questionId) {
    try {
      const response = await db("quiz_responses")
        .where({
          attempt_id: attemptId,
          question_id: questionId
        })
        .first();
      return QuizResponseModel.sanitizeResponse(response);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get responses by question
   * @param {number} questionId - Question ID
   * @returns {Array} Responses for the question
   */
  static async getByQuestion(questionId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("quiz_responses")
        .select(
          "quiz_responses.*",
          "quiz_attempts.attempt_number",
          "users.name as student_name"
        )
        .leftJoin("quiz_attempts", "quiz_responses.attempt_id", "quiz_attempts.id")
        .leftJoin("users", "quiz_attempts.user_id", "users.id")
        .where("quiz_responses.question_id", questionId)
        .orderBy("quiz_responses.answered_at", "desc");
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("quiz_responses.id as count");
      const total = parseInt(count);
      // Apply pagination
      const responses = await query.limit(params.limit).offset(params.offset);
      return {
        data: responses.map(QuizResponseModel.sanitizeResponse),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Create a new response
   * @param {Object} data - Response data
   * @returns {Object} Created response
   */
  static async create(data) {
    try {
      let {
        attempt_id,
        question_id,
        selected_options,
        text_response,
        time_spent_seconds
      } = data;
      // Validate required fields
      if (!attempt_id || !question_id) {
        throw AppError.badRequest("Attempt ID and question ID are required");
      }
      // Validate attempt exists and is in progress
      const attempt = await db("quiz_attempts").where("id", attempt_id).first();
      if (!attempt) {
        throw AppError.notFound("Attempt not found");
      }
      if (attempt.attempt_status !== "in_progress") {
        throw AppError.badRequest("Attempt is not in progress");
      }
      // Validate question exists
      const question = await db("quiz_questions").where("id", question_id).first();
      if (!question) {
        throw AppError.notFound("Question not found");
      }
      // Check if response already exists
      const existingResponse = await db("quiz_responses")
        .where({ attempt_id, question_id })
        .first();
      if (existingResponse) {
        throw AppError.conflict("Response already exists for this question");
      }
      // Validate selected_options format
      if (selected_options && !Array.isArray(selected_options)) {
        throw AppError.badRequest("Selected options must be an array");
      }
      // Validate time spent
      if (time_spent_seconds && time_spent_seconds < 0) {
        throw AppError.badRequest("Time spent cannot be negative");
      }
      // Sanitize text_response
      if (text_response) {
        text_response = sanitizeString(text_response, { trim: true, maxLength: 2000 });
      }
      const [response] = await db("quiz_responses")
        .insert({
          attempt_id,
          question_id,
          selected_options: selected_options || null,
          text_response: text_response || null,
          time_spent_seconds: time_spent_seconds || null,
          answered_at: db.fn.now()
        })
        .returning("*");
      return QuizResponseModel.sanitizeResponse(response);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update response
   * @param {number} id - Response ID
   * @param {Object} data - Update data
   * @returns {Object} Updated response
   */
  static async update(id, data) {
    try {
      // Check if response exists
      const response = await db("quiz_responses").where("id", id).first();
      if (!response) {
        throw AppError.notFound("Response not found");
      }
      // Check if attempt is still in progress
      const attempt = await db("quiz_attempts").where("id", response.attempt_id).first();
      if (attempt.attempt_status !== "in_progress") {
        throw AppError.badRequest("Cannot update response for completed attempt");
      }
      const allowedFields = ["selected_options", "text_response", "time_spent_seconds"];
      const updateData = {};
      Object.keys(data).forEach(key => {
        if (allowedFields.includes(key)) {
          updateData[key] = data[key];
        }
      });
      if (Object.keys(updateData).length === 0) {
        throw AppError.badRequest("No valid fields to update");
      }
      // Validate selected_options format
      if (updateData.selected_options && !Array.isArray(updateData.selected_options)) {
        throw AppError.badRequest("Selected options must be an array");
      }
      // Validate time spent
      if (updateData.time_spent_seconds && updateData.time_spent_seconds < 0) {
        throw AppError.badRequest("Time spent cannot be negative");
      }
      // Sanitize text_response if being updated
      if (updateData.text_response) {
        updateData.text_response = sanitizeString(updateData.text_response, { trim: true, maxLength: 2000 });
      }
      const [updatedResponse] = await db("quiz_responses")
        .where("id", id)
        .update(updateData)
        .returning("*");
      return QuizResponseModel.sanitizeResponse(updatedResponse);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Grade response
   * @param {number} id - Response ID
   * @param {boolean} isCorrect - Whether the response is correct
   * @param {number} pointsEarned - Points earned for the response
   * @returns {Object} Updated response
   */
  static async gradeResponse(id, isCorrect, pointsEarned = 0) {
    try {
      // Check if response exists
      const response = await db("quiz_responses").where("id", id).first();
      if (!response) {
        throw new Error("Response not found");
      }

      // Validate points earned
      if (pointsEarned < 0) {
        throw new Error("Points earned cannot be negative");
      }

      const [updatedResponse] = await db("quiz_responses")
        .where("id", id)
        .update({
          is_correct: Boolean(isCorrect),
          points_earned: pointsEarned
        })
        .returning("*");

      return updatedResponse;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete response
   * @param {number} id - Response ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    try {
      // Check if response exists
      const response = await db("quiz_responses").where("id", id).first();
      if (!response) {
        throw new Error("Response not found");
      }

      await db("quiz_responses").where("id", id).del();
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete responses by attempt
   * @param {number} attemptId - Attempt ID
   * @returns {boolean} Success status
   */
  static async deleteByAttempt(attemptId) {
    try {
      await db("quiz_responses")
        .where("attempt_id", attemptId)
        .del();

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get response statistics for a question
   * @param {number} questionId - Question ID
   * @returns {Object} Response statistics
   */
  static async getQuestionStats(questionId) {
    try {
      const totalResponses = await db("quiz_responses")
        .where("question_id", questionId)
        .count("id as count")
        .first();

      const correctResponses = await db("quiz_responses")
        .where("question_id", questionId)
        .where("is_correct", true)
        .count("id as count")
        .first();

      const avgTimeSpent = await db("quiz_responses")
        .where("question_id", questionId)
        .whereNotNull("time_spent_seconds")
        .avg("time_spent_seconds as avg_time")
        .first();

      const total = parseInt(totalResponses.count);
      const correct = parseInt(correctResponses.count);
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      const avgTime = Math.round(parseFloat(avgTimeSpent.avg_time) || 0);

      return {
        totalResponses: total,
        correctResponses: correct,
        incorrectResponses: total - correct,
        accuracy,
        averageTimeSpent: avgTime
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get response statistics for an attempt
   * @param {number} attemptId - Attempt ID
   * @returns {Object} Attempt response statistics
   */
  static async getAttemptStats(attemptId) {
    try {
      const totalResponses = await db("quiz_responses")
        .where("attempt_id", attemptId)
        .count("id as count")
        .first();

      const correctResponses = await db("quiz_responses")
        .where("attempt_id", attemptId)
        .where("is_correct", true)
        .count("id as count")
        .first();

      const totalPoints = await db("quiz_responses")
        .where("attempt_id", attemptId)
        .sum("points_earned as total_points")
        .first();

      const totalTimeSpent = await db("quiz_responses")
        .where("attempt_id", attemptId)
        .whereNotNull("time_spent_seconds")
        .sum("time_spent_seconds as total_time")
        .first();

      const total = parseInt(totalResponses.count);
      const correct = parseInt(correctResponses.count);
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      const points = parseInt(totalPoints.total_points) || 0;
      const timeSpent = parseInt(totalTimeSpent.total_time) || 0;

      return {
        totalResponses: total,
        correctResponses: correct,
        incorrectResponses: total - correct,
        accuracy,
        totalPoints: points,
        totalTimeSpent: timeSpent
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get common wrong answers for a question
   * @param {number} questionId - Question ID
   * @param {number} limit - Number of answers to return
   * @returns {Array} Common wrong answers
   */
  static async getCommonWrongAnswers(questionId, limit = 5) {
    try {
      const responses = await db("quiz_responses")
        .select("text_response", "selected_options")
        .where("question_id", questionId)
        .where("is_correct", false)
        .whereNotNull("text_response")
        .groupBy("text_response", "selected_options")
        .count("id as frequency")
        .orderBy("frequency", "desc")
        .limit(limit);
      return responses.map(QuizResponseModel.sanitizeResponse);
    } catch (error) {
      throw error;
    }
  }

  static sanitizeResponse(response) {
    if (!response) return null;
    const {
      id, attempt_id, question_id, selected_options, text_response, is_correct, points_earned, time_spent_seconds, answered_at
    } = response;
    return { id, attempt_id, question_id, selected_options, text_response, is_correct, points_earned, time_spent_seconds, answered_at };
  }
}

export default QuizResponseModel; 