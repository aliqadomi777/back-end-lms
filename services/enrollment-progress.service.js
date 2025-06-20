/**
 * Enrollment Progress Service
 *
 * This service handles all enrollment progress related operations,
 * including lesson completion tracking, view tracking, and progress calculation.
 */

import LessonCompletionModel from '../models/LessonCompletion.model.js';
import LessonViewModel from '../models/LessonView.model.js';
import EnrollmentModel from '../models/Enrollment.model.js';
import LessonModel from '../models/Lesson.model.js';
import ModuleModel from '../models/Module.model.js';

class EnrollmentProgressService {
  /**
   * Get course progress for a student
   * @param {number} courseId - Course ID
   * @param {number} studentId - Student ID
   * @returns {Object} Progress information
   */
  static async getCourseProgress(courseId, studentId) {
    // Use model method for course progress
    return await EnrollmentModel.getCourseProgress(courseId, studentId);
  }

  /**
   * Mark lesson as completed
   * @param {Object} completionData - Completion data
   * @returns {Object} Created completion record
   */
  static async markLessonCompleted(completionData) {
    // Use model method for marking lesson completed
    return await LessonCompletionModel.markCompleted(completionData.user_id, completionData.lesson_id, completionData.completed_at);
  }

  /**
   * Track lesson view
   * @param {Object} viewData - View data
   * @returns {Object} Created view record
   */
  static async trackLessonView(viewData) {
    // Use model method for tracking lesson view
    return await LessonViewModel.recordView(viewData.user_id, viewData.lesson_id, viewData.duration_seconds, viewData.viewed_at);
  }
}

export default EnrollmentProgressService;
