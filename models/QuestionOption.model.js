/**
 * QuestionOption Model
 *
 * Manages question options and answers for quiz questions.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { sanitizeString } from '../utils/validation.js';

class QuestionOptionModel {
  /**
   * Get option by ID
   * @param {number} id - Option ID
   * @returns {Object|null} Option or null
   */
  static async findById(id) {
    try {
      const option = await db("question_options")
        .select(
          "question_options.*",
          "quiz_questions.question_text",
          "quiz_questions.question_type"
        )
        .leftJoin("quiz_questions", "question_options.question_id", "quiz_questions.id")
        .where("question_options.id", id)
        .first();
      return QuestionOptionModel.sanitizeOption(option);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get options by question
   * @param {number} questionId - Question ID
   * @returns {Array} Question options
   */
  static async getByQuestion(questionId) {
    try {
      return await db("question_options")
        .select("*")
        .where("question_id", questionId)
        .orderBy("position", "asc");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get correct options for a question
   * @param {number} questionId - Question ID
   * @returns {Array} Correct options
   */
  static async getCorrectOptions(questionId) {
    try {
      return await db("question_options")
        .select("*")
        .where("question_id", questionId)
        .where("is_correct", true)
        .orderBy("position", "asc");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new option
   * @param {Object} data - Option data
   * @returns {Object} Created option
   */
  static async create(data) {
    try {
      let {
        question_id,
        option_text,
        is_correct = false,
        position
      } = data;
      option_text = sanitizeString(option_text, { trim: true, maxLength: 1000, allowEmpty: false });
      if (!question_id || !option_text || position === undefined) {
        throw AppError.badRequest("Question ID, option text, and position are required");
      }
      const question = await db("quiz_questions").where("id", question_id).first();
      if (!question) {
        throw AppError.notFound("Question not found");
      }
      if (position < 0) {
        throw AppError.badRequest("Position cannot be negative");
      }
      const [option] = await db("question_options")
        .insert({
          question_id,
          option_text,
          is_correct: Boolean(is_correct),
          position: parseFloat(position),
          created_at: db.fn.now()
        })
        .returning("*");
      return QuestionOptionModel.sanitizeOption(option);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Create multiple options for a question
   * @param {number} questionId - Question ID
   * @param {Array} options - Array of option data
   * @returns {Array} Created options
   */
  static async createMultiple(questionId, options) {
    try {
      const question = await db("quiz_questions").where("id", questionId).first();
      if (!question) {
        throw AppError.notFound("Question not found");
      }
      if (!Array.isArray(options) || options.length === 0) {
        throw AppError.badRequest("Options array is required and cannot be empty");
      }
      const createdOptions = [];
      for (let i = 0; i < options.length; i++) {
        let optionData = options[i];
        optionData.option_text = sanitizeString(optionData.option_text, { trim: true, maxLength: 1000, allowEmpty: false });
        if (!optionData.option_text) {
          throw AppError.badRequest(`Option text is required for option ${i + 1}`);
        }
        const option = await this.create({
          question_id: questionId,
          option_text: optionData.option_text,
          is_correct: optionData.is_correct || false,
          position: optionData.position !== undefined ? optionData.position : i + 1
        });
        createdOptions.push(option);
      }
      return createdOptions;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update option
   * @param {number} id - Option ID
   * @param {Object} data - Update data
   * @returns {Object} Updated option
   */
  static async update(id, data) {
    try {
      const option = await db("question_options").where("id", id).first();
      if (!option) {
        throw AppError.notFound("Option not found");
      }
      const allowedFields = ["option_text", "is_correct", "position"];
      const updateData = {};
      Object.keys(data).forEach(key => {
        if (allowedFields.includes(key)) {
          updateData[key] = data[key];
        }
      });
      if (Object.keys(updateData).length === 0) {
        throw AppError.badRequest("No valid fields to update");
      }
      if (updateData.position !== undefined && updateData.position < 0) {
        throw AppError.badRequest("Position cannot be negative");
      }
      if (updateData.option_text) {
        updateData.option_text = sanitizeString(updateData.option_text, { trim: true, maxLength: 1000, allowEmpty: false });
      }
      if (updateData.is_correct !== undefined) {
        updateData.is_correct = Boolean(updateData.is_correct);
      }
      if (updateData.position !== undefined) {
        updateData.position = parseFloat(updateData.position);
      }
      const [updatedOption] = await db("question_options")
        .where("id", id)
        .update(updateData)
        .returning("*");
      return QuestionOptionModel.sanitizeOption(updatedOption);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete option
   * @param {number} id - Option ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    try {
      const option = await db("question_options").where("id", id).first();
      if (!option) {
        throw AppError.notFound("Option not found");
      }
      await db("question_options").where("id", id).del();
      return true;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete all options for a question
   * @param {number} questionId - Question ID
   * @returns {boolean} Success status
   */
  static async deleteByQuestion(questionId) {
    try {
      await db("question_options")
        .where("question_id", questionId)
        .del();

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reorder options for a question
   * @param {number} questionId - Question ID
   * @param {Array} optionOrder - Array of option IDs in new order
   * @returns {boolean} Success status
   */
  static async reorderOptions(questionId, optionOrder) {
    try {
      // Validate question exists
      const question = await db("quiz_questions").where("id", questionId).first();
      if (!question) {
        throw new Error("Question not found");
      }

      // Update positions
      for (let i = 0; i < optionOrder.length; i++) {
        await db("question_options")
          .where("id", optionOrder[i])
          .where("question_id", questionId)
          .update({
            position: i + 1
          });
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get option statistics
   * @param {number} optionId - Option ID
   * @returns {Object} Option statistics
   */
  static async getOptionStats(optionId) {
    try {
      // Get total selections for this option
      const totalSelections = await db("quiz_responses")
        .whereRaw("? = ANY(selected_options)", [optionId])
        .count("id as count")
        .first();

      // Get correct responses where this option was selected
      const correctSelections = await db("quiz_responses")
        .whereRaw("? = ANY(selected_options)", [optionId])
        .where("is_correct", true)
        .count("id as count")
        .first();

      const total = parseInt(totalSelections.count);
      const correct = parseInt(correctSelections.count);
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      return {
        totalSelections: total,
        correctSelections: correct,
        incorrectSelections: total - correct,
        accuracy
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate question options
   * @param {number} questionId - Question ID
   * @returns {Object} Validation result
   */
  static async validateQuestionOptions(questionId) {
    try {
      const question = await db("quiz_questions").where("id", questionId).first();
      if (!question) {
        throw new Error("Question not found");
      }

      const options = await this.getByQuestion(questionId);
      const correctOptions = options.filter(opt => opt.is_correct);

      let isValid = true;
      let errors = [];

      // Check minimum options
      if (options.length < 2) {
        isValid = false;
        errors.push("Question must have at least 2 options");
      }

      // Check for correct options based on question type
      switch (question.question_type) {
        case "multiple_choice":
          if (correctOptions.length !== 1) {
            isValid = false;
            errors.push("Multiple choice questions must have exactly 1 correct option");
          }
          break;
        case "multiple_select":
          if (correctOptions.length < 1) {
            isValid = false;
            errors.push("Multiple select questions must have at least 1 correct option");
          }
          break;
        case "true_false":
          if (options.length !== 2 || correctOptions.length !== 1) {
            isValid = false;
            errors.push("True/false questions must have exactly 2 options with 1 correct");
          }
          break;
        case "short_answer":
        case "essay":
        case "fill_blank":
        case "matching":
          // These question types don't use options
          break;
      }

      return {
        isValid,
        errors,
        optionsCount: options.length,
        correctOptionsCount: correctOptions.length
      };
    } catch (error) {
      throw error;
    }
  }

  static sanitizeOption(option) {
    if (!option) return null;
    const {
      id, question_id, option_text, is_correct, position, created_at
    } = option;
    return { id, question_id, option_text, is_correct, position, created_at };
  }
}

export default QuestionOptionModel; 