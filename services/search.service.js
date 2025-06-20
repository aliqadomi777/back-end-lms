/**
 * Search Service
 *
 * This service handles all search-related functionality for the LMS,
 * including course search and filtering.
 */

import CourseModel from "../models/Course.model.js";
import CategoryModel from "../models/Category.model.js";
import EnrollmentModel from "../models/Enrollment.model.js";
import { AppError } from "../utils/AppError.js";
import { paginate } from "../utils/pagination.js";

export class SearchService {
  /**
   * Search courses with full-text search
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  static async searchCourses(searchTerm, options = {}) {
    const { page = 1, limit = 10, ...rest } = options;
    const { data, pagination } = await CourseModel.searchCourses(searchTerm, {
      page,
      limit,
      ...rest,
    });
    return {
      data: data.map(CourseModel.sanitize),
      pagination,
    };
  }

  /**
   * Get popular courses
   * @param {number} limit - Number of courses to return
   * @returns {Array} Popular courses
   */
  static async getPopularCourses(limit = 10) {
    const courses = await CourseModel.getPopularCourses(limit);
    return courses.map(CourseModel.sanitize);
  }
}
