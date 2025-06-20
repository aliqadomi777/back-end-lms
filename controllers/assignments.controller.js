import { AssignmentService } from '../services/assignments.service.js';
import AssignmentSubmissionService from '../services/assignment-submission.service.js';

export class AssignmentController {
  /**
   * Create a new assignment for a lesson
   * POST /api/assignments
   */
  static async createAssignment(req, res, next) {
    try {
      const { lesson_id, title, description, instructions, deadline, max_score, allow_late_submission } = req.body;
      const created_by = req.user.id;

      const assignment = await AssignmentService.createAssignment({
        lesson_id,
        title,
        description,
        instructions,
        deadline,
        max_score,
        allow_late_submission,
        created_by
      });

      res.status(201).json({
        success: true,
        message: 'Assignment created successfully',
        data: assignment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing assignment
   * PUT /api/assignments/:id
   */
  static async updateAssignment(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, updated_by: req.user.id };

      const assignment = await AssignmentService.updateAssignment(id, updateData);

      res.json({
        success: true,
        message: 'Assignment updated successfully',
        data: assignment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an assignment
   * DELETE /api/assignments/:id
   */
  static async deleteAssignment(req, res, next) {
    try {
      const { id } = req.params;

      await AssignmentService.deleteAssignment(id);

      res.json({
        success: true,
        message: 'Assignment deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get assignment details with submissions
   * GET /api/assignments/:id
   */
  static async getAssignmentDetails(req, res, next) {
    try {
      const { id } = req.params;
      const { include_submissions } = req.query;

      const assignment = await AssignmentService.getAssignmentById(id, {
        includeSubmissions: include_submissions === 'true'
      });

      res.json({
        success: true,
        data: assignment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get assignment for a specific lesson
   * GET /api/lessons/:lessonId/assignment
   */
  static async getAssignmentForLesson(req, res, next) {
    try {
      const { lessonId } = req.params;

      const assignment = await AssignmentService.getAssignmentByLessonId(lessonId);

      res.json({
        success: true,
        data: assignment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List assignments with filtering
   * GET /api/assignments
   */
  static async listAssignments(req, res, next) {
    try {
      const { lesson_id, course_id, instructor_id, page = 1, limit = 10, sort = 'created_at', order = 'desc' } = req.query;

      const filters = {};
      if (lesson_id) filters.lesson_id = lesson_id;
      if (course_id) filters.course_id = course_id;
      if (instructor_id) filters.instructor_id = instructor_id;

      const assignments = await AssignmentService.listAssignments(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        order
      });

      res.json({
        success: true,
        data: assignments.data,
        pagination: assignments.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit assignment
   * POST /api/assignments/:id/submit
   */
  static async submitAssignment(req, res, next) {
    try {
      const { id } = req.params;
      const { submission_text, submission_url } = req.body;
      const user_id = req.user.id;
      const submission_file_id = req.file ? req.file.id : null;

      const submission = await AssignmentSubmissionService.submitAssignment({
        assignment_id: id,
        user_id,
        submission_text,
        submission_file_id,
        submission_url
      });

      res.status(201).json({
        success: true,
        message: 'Assignment submitted successfully',
        data: submission
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Grade assignment submission
   * PUT /api/assignments/submissions/:submissionId/grade
   */
  static async gradeSubmission(req, res, next) {
    try {
      const { submissionId } = req.params;
      const { grade, feedback } = req.body;
      const graded_by = req.user.id;

      const submission = await AssignmentSubmissionService.gradeSubmission(submissionId, {
        grade,
        feedback,
        graded_by
      });

      res.json({
        success: true,
        message: 'Assignment graded successfully',
        data: submission
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get submissions for an assignment
   * GET /api/assignments/:id/submissions
   */
  static async getSubmissionsForAssignment(req, res, next) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, status, sort = 'submitted_at', order = 'desc' } = req.query;

      const filters = { assignment_id: id };
      if (status) filters.submission_status = status;

      const submissions = await AssignmentSubmissionService.getSubmissions(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        order
      });

      res.json({
        success: true,
        data: submissions.data,
        pagination: submissions.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's submission status for an assignment
   * GET /api/assignments/:id/submission-status
   */
  static async getSubmissionStatus(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const submission = await AssignmentSubmissionService.getUserSubmission(id, user_id);

      res.json({
        success: true,
        data: submission
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get assignment statistics
   * GET /api/assignments/:id/stats
   */
  static async getAssignmentStats(req, res, next) {
    try {
      const { id } = req.params;

      const stats = await AssignmentService.getAssignmentStats(id);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}