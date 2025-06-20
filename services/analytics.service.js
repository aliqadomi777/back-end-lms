import AnalyticsModel from "../models/Analytics.model.js";
import CourseModel from "../models/Course.model.js";
import { AppError } from "../utils/AppError.js";
import { paginate } from "../utils/pagination.js";

/**
 * Analytics Service
 *
 * This service exposes all analytics and statistics functionality for the LMS,
 * strictly as a pass-through to the AnalyticsModel (and CourseModel where needed).
 */

export class AnalyticsService {
  /**
   * Get instructor dashboard analytics
   */
  static async getInstructorDashboard(instructorId, options = {}) {
    const { data, pagination } = await AnalyticsModel.getInstructorAnalytics(
      instructorId,
      options
    );
    return { data, pagination };
  }

  /**
   * Get student dashboard analytics
   */
  static async getStudentDashboard(studentId, options = {}) {
    const { data, pagination } = await AnalyticsModel.getStudentAnalytics(
      studentId,
      options
    );
    return { data, pagination };
  }

  /**
   * Get course analytics
   */
  static async getCourseAnalytics(courseId, options = {}) {
    const { data, pagination } = await AnalyticsModel.getCourseAnalytics(
      courseId,
      options
    );
    return { data, pagination };
  }

  /**
   * Get system-wide analytics
   */
  static async getSystemAnalytics(options = {}) {
    const { data, pagination } =
      await AnalyticsModel.getSystemAnalytics(options);
    return { data, pagination };
  }

  /**
   * Export analytics data to CSV
   */
  static async exportToCsv(type, options = {}) {
    return await AnalyticsModel.exportToCsv(type, options);
  }

  /**
   * Get dashboard metrics (real-time)
   */
  static async getDashboardMetrics() {
    return await AnalyticsModel.getDashboardMetrics();
  }

  /**
   * Get top courses
   */
  static async getTopCourses(options = {}) {
    return await AnalyticsModel.getTopCourses(options);
  }

  // --- Additional analytics features matching service API ---

  static async getInstructorStats(instructorId, options = {}) {
    return await AnalyticsModel.getInstructorStats(instructorId, options);
  }

  static async getInstructorRecentActivity(instructorId, options = {}) {
    return await AnalyticsModel.getInstructorRecentActivity(
      instructorId,
      options
    );
  }

  static async getUserStatistics(options = {}) {
    return await AnalyticsModel.getUserStatistics(options);
  }

  static async getCourseStatistics(options = {}) {
    return await AnalyticsModel.getCourseStatistics(options);
  }

  static async getEnrollmentTrends(options = {}) {
    return await AnalyticsModel.getEnrollmentTrends(options);
  }

  static async getPopularCourses(options = {}) {
    return await AnalyticsModel.getPopularCourses(options);
  }

  static async getInstructorPerformance(options = {}) {
    return await AnalyticsModel.getInstructorPerformance(options);
  }

  static async getSystemHealthMetrics() {
    return await AnalyticsModel.getSystemHealthMetrics();
  }

  static async getTopStudents(options = {}) {
    return await AnalyticsModel.getTopStudents(options);
  }

  static async getEngagementTrends(options = {}) {
    return await AnalyticsModel.getEngagementTrends(options);
  }

  static async getStudentOverallStats(studentId, options = {}) {
    return await AnalyticsModel.getStudentOverallStats(studentId, options);
  }

  static async getStudentCourseProgress(studentId, options = {}) {
    return await AnalyticsModel.getStudentCourseProgress(studentId, options);
  }

  static async getStudentQuizPerformance(studentId, options = {}) {
    return await AnalyticsModel.getStudentQuizPerformance(studentId, options);
  }

  static async getStudentAssignmentPerformance(studentId, options = {}) {
    return await AnalyticsModel.getStudentAssignmentPerformance(
      studentId,
      options
    );
  }

  static async getLessonCompletionHeatmap(courseId, options = {}) {
    return await AnalyticsModel.getLessonCompletionHeatmap(courseId, options);
  }

  static async getAssessmentStatistics(options = {}) {
    return await AnalyticsModel.getAssessmentStatistics(options);
  }

  static async getUserActivitySummary(userId, options = {}) {
    return await AnalyticsModel.getUserActivitySummary(userId, options);
  }

  static async exportAnalytics(options = {}) {
    return await AnalyticsModel.exportAnalytics(options);
  }

  static async getRealtimeDashboard(options = {}) {
    return await AnalyticsModel.getRealtimeDashboard(options);
  }
}
