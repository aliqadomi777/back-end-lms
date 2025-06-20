/**
 * Quiz Model
 *
 * Manages quiz metadata and settings. Question management is delegated
 * to QuizQuestion.model.js and QuestionOption.model.js.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { sanitizeString } from '../utils/validation.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

// Fisher-Yates shuffle utility
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

class QuizModel {
  /**
   * Get quiz by ID
   * @param {number} id - Quiz ID
   * @returns {Object|null} Quiz or null
   */
  static async findById(id) {
    try {
      return await db("quizzes")
        .select(
          "quizzes.*",
          "course_lessons.title as lesson_title",
          "course_modules.title as module_title",
          "courses.title as course_title",
          "users.name as creator_name"
        )
        .leftJoin("course_lessons", "quizzes.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("courses", "course_modules.course_id", "courses.id")
        .leftJoin("users", "quizzes.created_by", "users.id")
        .where("quizzes.id", id)
        .first();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get quiz by lesson
   * @param {number} lessonId - Lesson ID
   * @returns {Object|null} Quiz or null
   */
  static async getByLesson(lessonId) {
    try {
      return await db("quizzes")
        .where("lesson_id", lessonId)
        .where("is_active", true)
        .first();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get quizzes by course
   * @param {number} courseId - Course ID
   * @returns {Array} Course quizzes
   */
  static async getByCourse(courseId) {
    try {
      return await db("quizzes")
        .select(
          "quizzes.*",
          "course_lessons.title as lesson_title",
          "course_modules.title as module_title"
        )
        .leftJoin("course_lessons", "quizzes.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .where("course_modules.course_id", courseId)
        .orderBy("course_modules.position", "asc")
        .orderBy("course_lessons.position", "asc");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all quizzes
   * @param {Object} options - Query options
   * @returns {Object} Quizzes with pagination
   */
  static async getAll(options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("quizzes")
        .select(
          "quizzes.*",
          "course_lessons.title as lesson_title",
          "course_modules.title as module_title",
          "courses.title as course_title",
          "users.name as creator_name"
        )
        .leftJoin("course_lessons", "quizzes.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("courses", "course_modules.course_id", "courses.id")
        .leftJoin("users", "quizzes.created_by", "users.id")
        .orderBy(params.sortBy || "quizzes.created_at", params.sortOrder || "DESC");
      // Apply filters
      if (options.is_active !== undefined) {
        query = query.where("quizzes.is_active", options.is_active);
      }
      if (options.lesson_id) {
        query = query.where("quizzes.lesson_id", options.lesson_id);
      }
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("quizzes.id as count");
      const total = parseInt(count);
      // Apply pagination
      const quizzes = await query.limit(params.limit).offset(params.offset);
      return {
        data: quizzes.map(QuizModel.sanitizeQuiz),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Create a new quiz
   * @param {Object} data - Quiz data
   * @returns {Object} Created quiz
   */
  static async create(data) {
    try {
      let {
        title,
        description,
        lesson_id,
        instructions,
        time_limit_minutes,
        attempt_limit = 3,
        passing_score = 70,
        shuffle_questions = false,
        show_correct_answers = true,
        allow_review = true,
        is_active = true,
        created_by
      } = data;
      // Validate and sanitize required fields
      title = sanitizeString(title, { trim: true, maxLength: 255, allowEmpty: false });
      if (!title || !lesson_id) {
        throw AppError.badRequest("Title and lesson ID are required");
      }
      // Validate lesson exists
      const lesson = await db("course_lessons").where("id", lesson_id).first();
      if (!lesson) {
        throw AppError.notFound("Lesson not found");
      }
      // Check if quiz already exists for this lesson
      const existingQuiz = await db("quizzes")
        .where("lesson_id", lesson_id)
        .first();
      if (existingQuiz) {
        throw AppError.conflict("Quiz already exists for this lesson");
      }
      // Validate numeric fields
      if (time_limit_minutes && time_limit_minutes < 1) {
        throw AppError.badRequest("Time limit must be at least 1 minute");
      }
      if (attempt_limit < 1) {
        throw AppError.badRequest("Attempt limit must be at least 1");
      }
      if (passing_score < 0 || passing_score > 100) {
        throw AppError.badRequest("Passing score must be between 0 and 100");
      }
      const [quiz] = await db("quizzes")
        .insert({
          title,
          description: description ? sanitizeString(description, { trim: true, maxLength: 1000 }) : null,
          lesson_id,
          instructions: instructions ? sanitizeString(instructions, { trim: true, maxLength: 2000 }) : null,
          time_limit_minutes: time_limit_minutes || null,
          attempt_limit: parseInt(attempt_limit),
          passing_score: parseInt(passing_score),
          shuffle_questions: Boolean(shuffle_questions),
          show_correct_answers: Boolean(show_correct_answers),
          allow_review: Boolean(allow_review),
          is_active: Boolean(is_active),
          created_by: created_by || null,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        })
        .returning("*");
      return quiz;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update quiz
   * @param {number} id - Quiz ID
   * @param {Object} data - Update data
   * @returns {Object} Updated quiz
   */
  static async update(id, data) {
    try {
      // Check if quiz exists
      const quiz = await db("quizzes").where("id", id).first();
      if (!quiz) {
        throw AppError.notFound("Quiz not found");
      }
      const allowedFields = [
        "title",
        "description",
        "instructions",
        "time_limit_minutes",
        "attempt_limit",
        "passing_score",
        "shuffle_questions",
        "show_correct_answers",
        "allow_review",
        "is_active"
      ];
      const updateData = {};
      Object.keys(data).forEach(key => {
        if (allowedFields.includes(key)) {
          updateData[key] = data[key];
        }
      });
      if (Object.keys(updateData).length === 0) {
        throw AppError.badRequest("No valid fields to update");
      }
      // Trim and sanitize text fields
      if (updateData.title) {
        updateData.title = sanitizeString(updateData.title, { trim: true, maxLength: 255, allowEmpty: false });
      }
      if (updateData.description) {
        updateData.description = sanitizeString(updateData.description, { trim: true, maxLength: 1000 });
      }
      if (updateData.instructions) {
        updateData.instructions = sanitizeString(updateData.instructions, { trim: true, maxLength: 2000 });
      }
      const [updatedQuiz] = await db("quizzes")
        .where("id", id)
        .update(updateData)
        .returning("*");
      return updatedQuiz;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete quiz
   * @param {number} id - Quiz ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    try {
      // Check if quiz exists
      const quiz = await db("quizzes").where("id", id).first();
      if (!quiz) {
        throw AppError.notFound("Quiz not found");
      }
      // Check if quiz has attempts
      const attemptCount = await db("quiz_attempts")
        .where("quiz_id", id)
        .count("id as count")
        .first();
      if (parseInt(attemptCount.count) > 0) {
        throw AppError.conflict("Cannot delete quiz with existing attempts");
      }
      // Delete associated questions and options (handled by foreign key constraints)
      await db("quizzes").where("id", id).del();
      return true;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get quiz statistics
   * @param {number} quizId - Quiz ID
   * @returns {Object} Quiz statistics
   */
  static async getStats(quizId) {
    try {
      // Get attempt statistics
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
      // Get question count
      const questionCount = await db("quiz_questions")
        .where("quiz_id", quizId)
        .count("id as count")
        .first();
      const total = parseInt(totalAttempts.count);
      const completed = parseInt(completedAttempts.count);
      const passed = parseInt(passedAttempts.count);
      const passRate = completed > 0 ? Math.round((passed / completed) * 100) : 0;
      const avgScoreValue = Math.round(parseFloat(avgScore.avg_score) || 0);
      const questions = parseInt(questionCount.count);
      return {
        totalAttempts: total,
        completedAttempts: completed,
        passedAttempts: passed,
        failedAttempts: completed - passed,
        passRate,
        averageScore: avgScoreValue,
        questionCount: questions
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get quiz with questions (for taking the quiz)
   * @param {number} quizId - Quiz ID
   * @param {boolean} includeAnswers - Whether to include correct answers
   * @returns {Object} Quiz with questions
   */
  static async getQuizWithQuestions(quizId, includeAnswers = false) {
    try {
      const quiz = await this.findById(quizId);
      if (!quiz) {
        throw AppError.notFound("Quiz not found");
      }
      if (!quiz.is_active) {
        throw AppError.badRequest("Quiz is not active");
      }
      // Import here to avoid circular dependency
      const QuizQuestionModel = (await import("./QuizQuestion.model.js")).default;
      const questions = await QuizQuestionModel.getByQuizWithOptions(quizId);
      // Remove correct answer information if not requested
      if (!includeAnswers) {
        questions.forEach(question => {
          if (question.options) {
            question.options.forEach(option => {
              delete option.is_correct;
            });
          }
        });
      }
      // Shuffle questions if needed
      let finalQuestions = questions;
      if (quiz.shuffle_questions) {
        finalQuestions = shuffleArray([...questions]);
        // If shuffling options is required, shuffle each question's options
        finalQuestions.forEach(q => {
          if (q.options && q.options.length > 1) {
            q.options = shuffleArray([...q.options]);
          }
        });
      }
      return {
        ...QuizModel.sanitizeQuiz(quiz),
        questions: finalQuestions
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  static sanitizeQuiz(quiz) {
    if (!quiz) return null;
    const {
      id, lesson_id, title, description, instructions, time_limit_minutes, attempt_limit, passing_score,
      shuffle_questions, show_correct_answers, allow_review, is_active, created_by, updated_by, created_at, updated_at
    } = quiz;
    return {
      id, lesson_id, title, description, instructions, time_limit_minutes, attempt_limit, passing_score,
      shuffle_questions, show_correct_answers, allow_review, is_active, created_by, updated_by, created_at, updated_at
    };
  }

  /**
   * Get recent quizzes
   * @param {number} limit - Number of recent quizzes to return
   * @returns {Array} Recent quizzes
   */
  static async getRecentQuizzes(limit = 10) {
    try {
      const quizzes = await db("quizzes")
        .select(
          "quizzes.*",
          "course_lessons.title as lesson_title",
          "courses.title as course_title"
        )
        .leftJoin("course_lessons", "quizzes.lesson_id", "course_lessons.id")
        .leftJoin("course_modules", "course_lessons.module_id", "course_modules.id")
        .leftJoin("courses", "course_modules.course_id", "courses.id")
        .where("quizzes.is_active", true)
        .orderBy("quizzes.created_at", "desc")
        .limit(limit);
      return quizzes.map(QuizModel.sanitizeQuiz);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Add a question to a quiz
   * @param {number} quizId
   * @param {Object} questionData
   * @returns {Object} Created question
   */
  static async addQuestion(quizId, questionData) {
    // Import here to avoid circular dependency
    const QuizQuestionModel = (await import('./QuizQuestion.model.js')).default;
    return await QuizQuestionModel.create({ ...questionData, quiz_id: quizId });
  }

  /**
   * Update a quiz question
   * @param {number} questionId
   * @param {Object} updateData
   * @returns {Object} Updated question
   */
  static async updateQuestion(questionId, updateData) {
    const QuizQuestionModel = (await import('./QuizQuestion.model.js')).default;
    return await QuizQuestionModel.update(questionId, updateData);
  }

  /**
   * Delete a quiz question
   * @param {number} questionId
   * @returns {boolean} Success
   */
  static async deleteQuestion(questionId) {
    const QuizQuestionModel = (await import('./QuizQuestion.model.js')).default;
    return await QuizQuestionModel.delete(questionId);
  }

  /**
   * Get all attempts for a user on a quiz
   * @param {number} quizId
   * @param {number} userId
   * @returns {Array} Attempts
   */
  static async getUserAttempts(quizId, userId) {
    const QuizAttemptModel = (await import('./QuizAttempt.model.js')).default;
    return await QuizAttemptModel.getByUserAndQuiz(userId, quizId);
  }

  /**
   * Get ongoing attempt for a user on a quiz
   * @param {number} quizId
   * @param {number} userId
   * @returns {Object|null} Ongoing attempt
   */
  static async getOngoingAttempt(quizId, userId) {
    const QuizAttemptModel = (await import('./QuizAttempt.model.js')).default;
    return await QuizAttemptModel.getOngoingAttempt(quizId, userId);
  }

  /**
   * Start a new quiz attempt
   * @param {number} quizId
   * @param {number} userId
   * @returns {Object} New attempt
   */
  static async startAttempt(quizId, userId) {
    const QuizAttemptModel = (await import('./QuizAttempt.model.js')).default;
    return await QuizAttemptModel.startAttempt(quizId, userId);
  }

  /**
   * Get quiz attempts (for instructor analytics)
   * @param {number} quizId
   * @param {Object} options - { page, limit }
   * @returns {Object} Attempts with pagination
   */
  static async getQuizAttempts(quizId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      const QuizAttemptModel = (await import('./QuizAttempt.model.js')).default;
      const { data, total } = await QuizAttemptModel.getByQuizPaginated(quizId, params);
      return {
        data,
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get quiz results (for instructor analytics)
   * @param {number} quizId
   * @param {Object} options - { page, limit }
   * @returns {Object} Results with pagination
   */
  static async getQuizResults(quizId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      const QuizAttemptModel = (await import('./QuizAttempt.model.js')).default;
      const { data, total } = await QuizAttemptModel.getResultsByQuizPaginated(quizId, params);
      return {
        data,
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get quiz analytics (for instructor dashboard)
   * @param {number} quizId
   * @returns {Object} Analytics
   */
  static async getQuizAnalytics(quizId) {
    try {
      const QuizAttemptModel = (await import('./QuizAttempt.model.js')).default;
      return await QuizAttemptModel.getAnalyticsForQuiz(quizId);
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
  static async exportQuizResults(quizId, format = 'csv') {
    try {
      const QuizAttemptModel = (await import('./QuizAttempt.model.js')).default;
      return await QuizAttemptModel.exportResultsForQuiz(quizId, format);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }
}

export default QuizModel;
