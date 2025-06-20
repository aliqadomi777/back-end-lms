/**
 * Progress Service
 *
 * This service handles all progress tracking functionality for the LMS,
 * including lesson completions, views, and module progress.
 */

import LessonCompletionModel from '../models/LessonCompletion.model.js';
import LessonViewModel from '../models/LessonView.model.js';
import ModuleModel from '../models/Module.model.js';
import { AppError } from '../utils/AppError.js';
import { paginate } from '../utils/pagination.js';

class ProgressService {
  /**
   * Get module progress for a student
   * @param {number} moduleId - Module ID
   * @param {number} studentId - Student ID
   * @returns {Object} Module progress
   */
  static async getModuleProgress(moduleId, studentId) {
    const progress = await ModuleModel.getModuleProgress(moduleId, studentId);
    if (!progress) throw AppError.notFound('Module progress not found');
    return progress; // Should be sanitized in model
  }

  /**
   * Get lesson progress for a student
   * @param {number} lessonId - Lesson ID
   * @param {number} studentId - Student ID
   * @returns {Object} Lesson progress
   */
  static async getLessonProgress(lessonId, studentId) {
    const progress = await LessonCompletionModel.getLessonProgress(lessonId, studentId);
    if (!progress) throw AppError.notFound('Lesson progress not found');
    return progress; // Should be sanitized in model
  }

  /**
   * Mark lesson as completed
   * @param {number} lessonId - Lesson ID
   * @param {number} studentId - Student ID
   * @returns {Object} Completion record
   */
  static async completeLesson(lessonId, studentId) {
    const completion = await LessonCompletionModel.markCompleted(studentId, lessonId);
    return completion; // Should be sanitized in model
  }

  /**
   * Record lesson view
   * @param {number} lessonId - Lesson ID
   * @param {number} studentId - Student ID
   * @param {number} durationSeconds - View duration in seconds
   * @returns {Object} View record
   */
  static async recordLessonView(lessonId, studentId, durationSeconds) {
    const view = await LessonViewModel.recordView(studentId, lessonId, durationSeconds);
    return view; // Should be sanitized in model
  }

  /**
   * Get course progress for a student
   * @param {number} courseId - Course ID
   * @param {number} studentId - Student ID
   * @returns {Object} Course progress
   */
  static async getCourseProgress(courseId, studentId) {
    const progress = await ModuleModel.getCourseProgress(courseId, studentId);
    if (!progress) throw AppError.notFound('Course progress not found');
    return progress; // Should be sanitized in model
  }
}

export default ProgressService;
