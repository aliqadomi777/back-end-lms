import AssignmentModel from '../models/Assignment.model.js';
import LessonModel from '../models/Lesson.model.js';
import CourseModel from '../models/Course.model.js';
import { AppError } from '../utils/AppError.js';
import { paginate } from '../utils/pagination.js';

export class AssignmentService {
  /**
   * Create a new assignment
   */
  static async createAssignment(assignmentData, instructorId) {
    const lesson = await LessonModel.findById(assignmentData.lesson_id);
    if (!lesson) throw AppError.notFound('Lesson not found');
    const existing = await AssignmentModel.getByLesson(assignmentData.lesson_id);
    if (existing && existing.length > 0) throw AppError.conflict('Assignment already exists for this lesson');
    const newAssignment = await AssignmentModel.create({ ...assignmentData, created_by: instructorId });
    return AssignmentService.sanitizeAssignment(newAssignment);
  }

  /**
   * Update an assignment
   */
  static async updateAssignment(assignmentId, updateData, instructorId) {
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) throw AppError.notFound('Assignment not found');
    const updatedAssignment = await AssignmentModel.update(assignmentId, updateData, instructorId);
    return AssignmentService.sanitizeAssignment(updatedAssignment);
  }

  /**
   * Delete an assignment
   */
  static async deleteAssignment(assignmentId, instructorId) {
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) throw AppError.notFound('Assignment not found');
    await AssignmentModel.delete(assignmentId);
    return true;
  }

  /**
   * Get assignment by ID
   */
  static async getAssignmentById(assignmentId) {
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) throw AppError.notFound('Assignment not found');
    return AssignmentService.sanitizeAssignment(assignment);
  }

  /**
   * Get assignment by lesson ID
   */
  static async getAssignmentsByLesson(lessonId) {
    return (await AssignmentModel.getByLesson(lessonId)).map(AssignmentService.sanitizeAssignment);
  }

  /**
   * Get assignment by course ID
   */
  static async getAssignmentsByCourse(courseId) {
    return (await AssignmentModel.getByCourse(courseId)).map(AssignmentService.sanitizeAssignment);
  }

  static sanitizeAssignment(assignment) {
    if (!assignment) return null;
    const {
      id, lesson_id, title, description, deadline, max_score, instructions, allow_late_submission, created_by, updated_by, created_at, updated_at
    } = assignment;
    return {
      id, lesson_id, title, description, deadline, max_score, instructions, allow_late_submission, created_by, updated_by, created_at, updated_at
    };
  }

  /**
   * List assignments with filtering and pagination
   */
  static async listAssignments(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort = 'created_at', order = 'desc' } = options;
    const { data, pagination } = await AssignmentModel.findMany(filters, { page, limit, sort, order });
    return {
      data: data.map(AssignmentService.sanitizeAssignment),
      pagination
    };
  }

  /**
   * Get assignment statistics
   */
  static async getAssignmentStats(assignmentId) {
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) {
      throw AppError.notFound('Assignment not found');
    }
    return await AssignmentModel.getStatistics(assignmentId);
  }

  /**
   * Get assignments for instructor
   */
  static async getAssignmentsForInstructor(instructorId, options = {}) {
    const { data, pagination } = await AssignmentModel.findByInstructor(instructorId, options);
    return {
      data: data.map(AssignmentService.sanitizeAssignment),
      pagination
    };
  }

  /**
   * Get assignments for course
   */
  static async getAssignmentsForCourse(courseId, options = {}) {
    const { data, pagination } = await AssignmentModel.findByCourse(courseId, options);
    return {
      data: data.map(AssignmentService.sanitizeAssignment),
      pagination
    };
  }

  /**
   * Check if assignment deadline has passed
   */
  static async isAssignmentOverdue(assignmentId) {
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment || !assignment.deadline) {
      return false;
    }
    return new Date() > new Date(assignment.deadline);
  }

  /**
   * Get upcoming assignment deadlines
   */
  static async getUpcomingDeadlines(userId, days = 7) {
    const { data, pagination } = await AssignmentModel.getUpcomingDeadlines(userId, days);
    return {
      data: data.map(AssignmentService.sanitizeAssignment),
      pagination
    };
  }
}