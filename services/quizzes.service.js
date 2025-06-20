import QuizModel from '../models/Quiz.model.js';
import CourseModel from '../models/Course.model.js';
import EnrollmentModel from '../models/Enrollment.model.js';
import { AppError } from '../utils/AppError.js';
import { paginate } from '../utils/pagination.js';
import pkg from 'json2csv';
const { json2csv } = pkg;
import ExcelJS from 'exceljs';

export class QuizzesService {
  static async createQuiz(quizData, instructorId) {
    const course = await CourseModel.findById(quizData.course_id);
    if (!course) throw AppError.notFound('Course not found');
    if (course.instructor_id !== instructorId) throw AppError.forbidden('Unauthorized');
    const newQuiz = await QuizModel.create({ ...quizData, created_by: instructorId });
    return QuizModel.sanitize(newQuiz);
  }

  static async getCourseQuizzes(courseId, userId = null, options = {}) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw AppError.notFound('Course not found');
    if (!course.is_published && userId !== course.instructor_id) {
      if (userId) {
        const enrollment = await EnrollmentModel.findByUserAndCourse(userId, courseId);
        if (!enrollment) throw AppError.forbidden('Access denied');
      } else {
        throw AppError.forbidden('Course is not accessible');
      }
    }
    const { data, pagination } = await QuizModel.getByCourse(courseId, options);
    return {
      data: data.map(QuizModel.sanitize),
      pagination
    };
  }

  static async getQuizById(id, userId = null) {
    const quiz = await QuizModel.findById(id);
    if (!quiz) throw AppError.notFound('Quiz not found');
    const course = await CourseModel.findById(quiz.course_id);
    if (!course) throw AppError.notFound('Course not found');
    if (!course.is_published && userId !== course.instructor_id) {
      if (userId) {
        const enrollment = await EnrollmentModel.findByUserAndCourse(userId, quiz.course_id);
        if (!enrollment) throw AppError.forbidden('Access denied');
      } else {
        throw AppError.forbidden('Quiz is not accessible');
      }
    }
    return QuizModel.sanitize(quiz);
  }

  static async updateQuiz(id, instructorId, updateData) {
    const quiz = await QuizModel.findById(id);
    if (!quiz) throw AppError.notFound('Quiz not found');
    const course = await CourseModel.findById(quiz.course_id);
    if (!course) throw AppError.notFound('Course not found');
    if (course.instructor_id !== instructorId) throw AppError.forbidden('Unauthorized');
    const allowedFields = [
      'title', 'description', 'time_limit_minutes', 'attempt_limit',
      'passing_score', 'shuffle_questions', 'show_correct_answers', 'allow_review', 'is_active'
    ];
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) filteredData[key] = updateData[key];
    });
    if (Object.keys(filteredData).length === 0) throw AppError.badRequest('No valid fields to update');
    const updatedQuiz = await QuizModel.update(id, filteredData);
    return QuizModel.sanitize(updatedQuiz);
  }

  static async deleteQuiz(id, instructorId) {
    const quiz = await QuizModel.findById(id);
    if (!quiz) throw AppError.notFound('Quiz not found');
    const course = await CourseModel.findById(quiz.course_id);
    if (!course) throw AppError.notFound('Course not found');
    if (course.instructor_id !== instructorId) throw AppError.forbidden('Unauthorized');
    await QuizModel.delete(id);
    return true;
  }

  static async addQuestion(quizId, instructorId, questionData) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw AppError.notFound('Quiz not found');
    const course = await CourseModel.findById(quiz.course_id);
    if (!course) throw AppError.notFound('Course not found');
    if (course.instructor_id !== instructorId) throw AppError.forbidden('Unauthorized to add questions to this quiz');
    const { question_text, question_type, points, options } = questionData;
    const question = await QuizModel.addQuestion(quizId, {
      question_text,
      question_type,
      points: points || 1,
      options: options || []
    });
    return question; // Should be sanitized in model
  }

  static async updateQuestion(quizId, questionId, instructorId, updateData) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw AppError.notFound('Quiz not found');
    const course = await CourseModel.findById(quiz.course_id);
    if (!course) throw AppError.notFound('Course not found');
    if (course.instructor_id !== instructorId) throw AppError.forbidden('Unauthorized to update questions in this quiz');
    const allowedFields = ['question_text', 'question_type', 'points', 'options'];
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });
    if (Object.keys(filteredData).length === 0) {
      throw AppError.badRequest('No valid fields to update');
    }
    const updatedQuestion = await QuizModel.updateQuestion(questionId, filteredData);
    return updatedQuestion; // Should be sanitized in model
  }

  static async deleteQuestion(quizId, questionId, instructorId) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw AppError.notFound('Quiz not found');
    const course = await CourseModel.findById(quiz.course_id);
    if (!course) throw AppError.notFound('Course not found');
    if (course.instructor_id !== instructorId) throw AppError.forbidden('Unauthorized to delete questions from this quiz');
    await QuizModel.deleteQuestion(questionId);
    return true;
  }

  static async startQuizAttempt(quizId, userId) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw AppError.notFound('Quiz not found');
    const enrollment = await EnrollmentModel.findByUserAndCourse(userId, quiz.course_id);
    if (!enrollment) throw AppError.forbidden('User is not enrolled in this course');
    if (enrollment.status !== 'active') throw AppError.forbidden('Enrollment is not active');
    if (quiz.attempt_limit) {
      const attempts = await QuizModel.getUserAttempts(quizId, userId);
      if (attempts.length >= quiz.attempt_limit) {
        throw AppError.forbidden('Maximum attempts reached for this quiz');
      }
    }
    const ongoingAttempt = await QuizModel.getOngoingAttempt(quizId, userId);
    if (ongoingAttempt) {
      return ongoingAttempt; // Should be sanitized in model
    }
    const attempt = await QuizModel.startAttempt(quizId, userId);
    return attempt; // Should be sanitized in model
  }

  static async submitQuizAttempt(quizId, userId, responses) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw AppError.notFound('Quiz not found');
    const attempt = await QuizModel.getOngoingAttempt(quizId, userId);
    if (!attempt) throw AppError.badRequest('No ongoing attempt found');
    if (quiz.time_limit_minutes) {
      const timeElapsed = (new Date() - new Date(attempt.started_at)) / 1000 / 60;
      if (timeElapsed > quiz.time_limit_minutes) {
        throw AppError.forbidden('Time limit exceeded');
      }
    }
    const result = await QuizModel.submitAttempt(attempt.id, responses);
    return result; // Should be sanitized in model
  }

  static async getQuizAttempts(quizId, userId, options = {}) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw AppError.notFound('Quiz not found');
    const enrollment = await EnrollmentModel.findByUserAndCourse(userId, quiz.course_id);
    if (!enrollment) throw AppError.forbidden('User is not enrolled in this course');
    const { page = 1, limit = 10 } = options;
    const { data, pagination } = await QuizModel.getUserAttempts(quizId, userId, { page, limit });
    return {
      data,
      pagination
    };
  }

  static async getQuizResults(quizId, instructorId, options = {}) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw AppError.notFound('Quiz not found');
    const course = await CourseModel.findById(quiz.course_id);
    if (!course) throw AppError.notFound('Course not found');
    if (course.instructor_id !== instructorId) throw AppError.forbidden('Unauthorized to view results for this quiz');
    const { page = 1, limit = 10 } = options;
    const { data, pagination } = await QuizModel.getQuizResults(quizId, { page, limit });
    return {
      data,
      pagination
    };
  }

  static async getQuizAnalytics(quizId, instructorId) {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw AppError.notFound('Quiz not found');
    const course = await CourseModel.findById(quiz.course_id);
    if (!course) throw AppError.notFound('Course not found');
    if (course.instructor_id !== instructorId) throw AppError.forbidden('Unauthorized to view analytics for this quiz');
    return await QuizModel.getQuizAnalytics(quizId);
  }

  static async exportQuizResults(quizId, instructorId, format = 'csv') {
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) throw AppError.notFound('Quiz not found');
    const course = await CourseModel.findById(quiz.course_id);
    if (!course) throw AppError.notFound('Course not found');
    if (course.instructor_id !== instructorId) throw AppError.forbidden('Unauthorized to export results for this quiz');
    const results = await QuizModel.getQuizResultsForExport(quizId);
    if (format === 'csv') {
      const fields = Object.keys(results[0] || {});
      return json2csv.parse(results, { fields });
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Quiz Results');
      worksheet.columns = fields.map(field => ({ header: field, key: field, width: 20 }));
      results.forEach(row => worksheet.addRow(row));
      return await workbook.xlsx.writeBuffer();
    }
    throw AppError.badRequest('Unsupported export format');
  }
}

export default QuizzesService;