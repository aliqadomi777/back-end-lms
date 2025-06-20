import { QuizzesService } from '../services/quizzes.service.js';

export class QuizzesController {
  static async createQuiz(req, res, next) {
    try {
      const instructorId = req.user.id;
      const { course_id } = req.params;
      const quizData = { ...req.body, course_id };
      const result = await QuizzesService.createQuiz(quizData, instructorId);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Quiz created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCourseQuizzes(req, res, next) {
    try {
      const { course_id } = req.params;
      const userId = req.user?.id;
      const result = await QuizzesService.getCourseQuizzes(course_id, userId);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Course quizzes retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getQuizById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await QuizzesService.getQuizById(id, userId);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Quiz retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateQuiz(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      const updateData = req.body;
      const result = await QuizzesService.updateQuiz(id, instructorId, updateData);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Quiz updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteQuiz(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      await QuizzesService.deleteQuiz(id, instructorId);
      
      res.status(200).json({
        success: true,
        data: null,
        message: 'Quiz deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async addQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      const questionData = req.body;
      const result = await QuizzesService.addQuestion(id, instructorId, questionData);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Question added successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateQuestion(req, res, next) {
    try {
      const { quiz_id, question_id } = req.params;
      const instructorId = req.user.id;
      const updateData = req.body;
      const result = await QuizzesService.updateQuestion(quiz_id, question_id, instructorId, updateData);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Question updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteQuestion(req, res, next) {
    try {
      const { quiz_id, question_id } = req.params;
      const instructorId = req.user.id;
      await QuizzesService.deleteQuestion(quiz_id, question_id, instructorId);
      
      res.status(200).json({
        success: true,
        data: null,
        message: 'Question deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async startQuizAttempt(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const result = await QuizzesService.startQuizAttempt(id, userId);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Quiz attempt started successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async submitQuizAttempt(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { responses } = req.body;
      const result = await QuizzesService.submitQuizAttempt(id, userId, responses);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Quiz submitted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getQuizAttempts(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      const result = await QuizzesService.getQuizAttempts(id, userId, { page, limit });
      
      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
        message: 'Quiz attempts retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getQuizResults(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      const result = await QuizzesService.getQuizResults(id, instructorId, { page, limit });
      
      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
        message: 'Quiz results retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getQuizAnalytics(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      const result = await QuizzesService.getQuizAnalytics(id, instructorId);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Quiz analytics retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async exportQuizResults(req, res, next) {
    try {
      const { id } = req.params;
      const instructorId = req.user.id;
      const { format = 'csv' } = req.query;
      const result = await QuizzesService.exportQuizResults(id, instructorId, format);
      
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=quiz-results.${format}`);
      res.send(result);
    } catch (error) {
      next(error);
    }
  }
}