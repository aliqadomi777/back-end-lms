/**
 * QuizQuestion Model
 *
 * Manages quiz questions and their properties.
 */

import db from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { sanitizeString } from "../utils/validation.js";
import {
  parsePaginationParams,
  createPaginationMeta,
} from "../utils/pagination.js";

class QuizQuestionModel {
  /**
   * Get question by ID
   * @param {number} id - Question ID
   * @returns {Object|null} Question or null
   */
  static async findById(id) {
    try {
      return await db("quiz_questions")
        .select(
          "quiz_questions.*",
          "quizzes.title as quiz_title",
          "quizzes.lesson_id"
        )
        .leftJoin("quizzes", "quiz_questions.quiz_id", "quizzes.id")
        .where("quiz_questions.id", id)
        .first();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get questions by quiz
   * @param {number} quizId - Quiz ID
   * @param {Object} options - Query options
   * @returns {Object} Questions with pagination
   */
  static async getByQuiz(quizId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("quiz_questions")
        .select("*")
        .where("quiz_id", quizId)
        .orderBy("position", "asc");
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("id as count");
      const total = parseInt(count);
      // Apply pagination
      const questions = await query.limit(params.limit).offset(params.offset);
      return {
        data: questions.map(QuizQuestionModel.sanitizeQuestion),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get questions by quiz with options
   * @param {number} quizId - Quiz ID
   * @param {Object} options - Query options
   * @returns {Object} Questions with pagination
   */
  static async getByQuizWithOptions(quizId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("quiz_questions")
        .select("*")
        .where("quiz_id", quizId)
        .orderBy("position", "asc");
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("id as count");
      const total = parseInt(count);
      // Apply pagination
      const questions = await query.limit(params.limit).offset(params.offset);
      // Get options for each question
      for (let question of questions) {
        question.options = await db("question_options")
          .select("*")
          .where("question_id", question.id)
          .orderBy("position", "asc");
      }
      return {
        data: questions.map(QuizQuestionModel.sanitizeQuestion),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Create a new question
   * @param {Object} data - Question data
   * @returns {Object} Created question
   */
  static async create(data) {
    try {
      let {
        quiz_id,
        question_type,
        question_text,
        explanation,
        points = 1,
        position,
        is_required = true,
        created_by,
      } = data;
      // Validate required fields
      question_text = sanitizeString(question_text, {
        trim: true,
        maxLength: 2000,
        allowEmpty: false,
      });
      if (!quiz_id || !question_type || !question_text || !position) {
        throw AppError.badRequest(
          "Quiz ID, question type, question text, and position are required"
        );
      }
      // Validate question type
      const allowedTypes = ["multiple_choice", "multiple_select", "true_false"];
      if (!allowedTypes.includes(question_type)) {
        throw AppError.badRequest("Invalid question type");
      }
      // Validate quiz exists
      const quiz = await db("quizzes").where("id", quiz_id).first();
      if (!quiz) {
        throw AppError.notFound("Quiz not found");
      }
      // Validate points
      if (points < 1) {
        throw AppError.badRequest("Points must be at least 1");
      }
      const [question] = await db("quiz_questions")
        .insert({
          quiz_id,
          question_type,
          question_text,
          explanation: explanation
            ? sanitizeString(explanation, { trim: true, maxLength: 2000 })
            : null,
          points: parseInt(points),
          position: parseFloat(position),
          is_required: Boolean(is_required),
          created_by: created_by || null,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("*");
      return QuizQuestionModel.sanitizeQuestion(question);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update question
   * @param {number} id - Question ID
   * @param {Object} data - Update data
   * @returns {Object} Updated question
   */
  static async update(id, data) {
    try {
      // Check if question exists
      const question = await db("quiz_questions").where("id", id).first();
      if (!question) {
        throw AppError.notFound("Question not found");
      }
      const allowedFields = [
        "question_type",
        "question_text",
        "explanation",
        "points",
        "position",
        "is_required",
      ];
      const updateData = {};
      Object.keys(data).forEach((key) => {
        if (allowedFields.includes(key)) {
          updateData[key] = data[key];
        }
      });
      if (Object.keys(updateData).length === 0) {
        throw AppError.badRequest("No valid fields to update");
      }
      // Validate question type if being updated
      const allowedTypes = ["multiple_choice", "multiple_select", "true_false"];
      if (
        updateData.question_type &&
        !allowedTypes.includes(updateData.question_type)
      ) {
        throw AppError.badRequest("Invalid question type");
      }
      // Validate points if being updated
      if (updateData.points && updateData.points < 1) {
        throw AppError.badRequest("Points must be at least 1");
      }
      // Trim and sanitize text fields
      if (updateData.question_text) {
        updateData.question_text = sanitizeString(updateData.question_text, {
          trim: true,
          maxLength: 2000,
          allowEmpty: false,
        });
      }
      if (updateData.explanation) {
        updateData.explanation = sanitizeString(updateData.explanation, {
          trim: true,
          maxLength: 2000,
        });
      }
      // Convert types
      if (updateData.points) {
        updateData.points = parseInt(updateData.points);
      }
      if (updateData.position) {
        updateData.position = parseFloat(updateData.position);
      }
      if (updateData.is_required !== undefined) {
        updateData.is_required = Boolean(updateData.is_required);
      }
      const [updatedQuestion] = await db("quiz_questions")
        .where("id", id)
        .update(updateData)
        .returning("*");
      return QuizQuestionModel.sanitizeQuestion(updatedQuestion);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete question
   * @param {number} id - Question ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    try {
      // Check if question exists
      const question = await db("quiz_questions").where("id", id).first();
      if (!question) {
        throw AppError.notFound("Question not found");
      }
      // Delete associated options first
      await db("question_options").where("question_id", id).del();
      // Delete question
      await db("quiz_questions").where("id", id).del();
      return true;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Reorder questions in a quiz
   * @param {number} quizId - Quiz ID
   * @param {Array} questionOrder - Array of question IDs in new order
   * @returns {boolean} Success status
   */
  static async reorderQuestions(quizId, questionOrder) {
    try {
      // Validate quiz exists
      const quiz = await db("quizzes").where("id", quizId).first();
      if (!quiz) {
        throw AppError.notFound("Quiz not found");
      }
      // Update positions
      for (let i = 0; i < questionOrder.length; i++) {
        await db("quiz_questions")
          .where("id", questionOrder[i])
          .where("quiz_id", quizId)
          .update({
            position: i + 1,
            updated_at: db.fn.now(),
          });
      }
      return true;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get question statistics
   * @param {number} questionId - Question ID
   * @returns {Object} Question statistics
   */
  static async getQuestionStats(questionId) {
    try {
      // Get total attempts for this question
      const totalAttempts = await db("quiz_responses")
        .where("question_id", questionId)
        .count("id as count")
        .first();
      // Get correct responses
      const correctResponses = await db("quiz_responses")
        .where("question_id", questionId)
        .where("is_correct", true)
        .count("id as count")
        .first();
      const total = parseInt(totalAttempts.count);
      const correct = parseInt(correctResponses.count);
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      return {
        totalAttempts: total,
        correctResponses: correct,
        incorrectResponses: total - correct,
        accuracy,
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get questions by type
   * @param {string} questionType - Question type
   * @returns {Array} Questions of specified type
   */
  static async getByType(questionType) {
    try {
      const allowedTypes = ["multiple_choice", "multiple_select", "true_false"];
      if (!allowedTypes.includes(questionType)) {
        throw AppError.badRequest("Invalid question type");
      }
      const questions = await db("quiz_questions")
        .select("quiz_questions.*", "quizzes.title as quiz_title")
        .leftJoin("quizzes", "quiz_questions.quiz_id", "quizzes.id")
        .where("quiz_questions.question_type", questionType)
        .orderBy("quiz_questions.created_at", "desc");
      return questions.map(QuizQuestionModel.sanitizeQuestion);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get questions with pagination
   * @param {Object} options - Query options
   * @returns {Object} Questions with pagination
   */
  static async getAll(options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("quiz_questions")
        .select("quiz_questions.*", "quizzes.title as quiz_title")
        .leftJoin("quizzes", "quiz_questions.quiz_id", "quizzes.id")
        .orderBy("quiz_questions.created_at", "desc");
      // Apply filters
      if (params.quiz_id) {
        query = query.where("quiz_questions.quiz_id", params.quiz_id);
      }
      if (params.question_type) {
        query = query.where(
          "quiz_questions.question_type",
          params.question_type
        );
      }
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("quiz_questions.id as count");
      const total = parseInt(count);
      // Apply pagination
      const questions = await query.limit(params.limit).offset(params.offset);
      return {
        data: questions.map(QuizQuestionModel.sanitizeQuestion),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  static sanitizeQuestion(question) {
    if (!question) return null;
    const {
      id,
      quiz_id,
      question_type,
      question_text,
      explanation,
      points,
      position,
      is_required,
      created_by,
      updated_by,
      created_at,
      updated_at,
      options,
    } = question;
    return {
      id,
      quiz_id,
      question_type,
      question_text,
      explanation,
      points,
      position,
      is_required,
      created_by,
      updated_by,
      created_at,
      updated_at,
      options,
    };
  }
}

export default QuizQuestionModel;
