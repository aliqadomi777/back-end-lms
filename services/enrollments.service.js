import EnrollmentModel from '../models/Enrollment.model.js';
import CourseModel from '../models/Course.model.js';
import UserModel from '../models/User.model.js';
import pkg from 'json2csv';
const { json2csv } = pkg;
import ExcelJS from 'exceljs';

export class EnrollmentsService {
  static async enrollUser(userId, courseId) {
    // Check if course exists and is published/approved
    const course = await CourseModel.findById(courseId);
    if (!course) throw new Error('Course not found');
    if (!course.is_published || !course.is_approved) throw new Error('Course is not available for enrollment');
    // Check if user is already enrolled
    const existing = await EnrollmentModel.findByCourseAndStudent(courseId, userId);
    if (existing) throw new Error('User is already enrolled in this course');
    // Check if user is the instructor
    if (course.instructor_id === userId) throw new Error('Instructors cannot enroll in their own courses');
    // Only students can enroll
    const user = await UserModel.findById(userId);
    if (!user || user.role !== 'student') throw new Error('Only students can enroll');
    const enrollment = await EnrollmentModel.create({
      user_id: userId,
      course_id: courseId,
      enrollment_status: 'active'
    });
    return EnrollmentsService.sanitizeEnrollment(enrollment);
  }

  static async getUserEnrollments(userId, { status = null }) {
    const enrollments = await EnrollmentModel.getByStudent(userId, { status });
    return enrollments.map(EnrollmentsService.sanitizeEnrollment);
  }

  static async getEnrollmentProgress(userId, courseId) {
    const enrollment = await EnrollmentModel.findByCourseAndStudent(courseId, userId);
    if (!enrollment) throw new Error('Enrollment not found');
    // Optionally, add progress logic here if needed
    return EnrollmentsService.sanitizeEnrollment(enrollment);
  }

  static async unenrollUser(userId, courseId) {
    const enrollment = await EnrollmentModel.findByCourseAndStudent(courseId, userId);
    if (!enrollment) throw new Error('Enrollment not found');
    if (enrollment.enrollment_status === 'completed') throw new Error('Cannot unenroll from a completed course');
    await EnrollmentModel.updateStatus(enrollment.id, 'dropped');
    return true;
  }

  static async getCourseEnrollments(courseId, instructorId) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new Error('Course not found');
    if (course.instructor_id !== instructorId) throw new Error('Unauthorized');
    const enrollments = await EnrollmentModel.getByCourse(courseId);
    return enrollments.map(EnrollmentsService.sanitizeEnrollment);
  }

  static sanitizeEnrollment(enrollment) {
    if (!enrollment) return null;
    const {
      id, user_id, course_id, enrollment_status, enrolled_at, completed_at, created_at, updated_at
    } = enrollment;
    return {
      id, user_id, course_id, enrollment_status, enrolled_at, completed_at, created_at, updated_at
    };
  }

  static async getAllEnrollments({ page = 1, limit = 10, sort = 'enrolled_at', order = 'desc', filters = {} }) {
    const offset = (page - 1) * limit;
    const result = await EnrollmentModel.findAll({
      limit: parseInt(limit),
      offset,
      sort,
      order,
      filters
    });

    return {
      data: result.enrollments,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.total / limit),
        totalItems: result.total
      }
    };
  }

  static async generateCertificate(userId, courseId) {
    const enrollment = await EnrollmentModel.findByUserAndCourse(userId, courseId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status !== 'completed') {
      throw new Error('Course must be completed to generate certificate');
    }

    if (enrollment.certificate_url) {
      return {
        certificate_url: enrollment.certificate_url,
        issued_at: enrollment.completed_at
      };
    }

    // Generate certificate (placeholder - implement actual certificate generation)
    const certificateUrl = await this.createCertificate(userId, courseId);
    
    await EnrollmentModel.updateCertificate(userId, courseId, certificateUrl);

    return {
      certificate_url: certificateUrl,
      issued_at: new Date()
    };
  }

  static async createCertificate(userId, courseId) {
    // Placeholder for certificate generation
    // In a real implementation, this would generate a PDF certificate
    const user = await UserModel.findById(userId);
    const course = await CourseModel.findById(courseId);
    
    const certificateId = `cert_${userId}_${courseId}_${Date.now()}`;
    return `${process.env.BASE_URL}/certificates/${certificateId}.pdf`;
  }

  static async getEnrollmentStats({ course_id, start_date, end_date }) {
    const stats = await EnrollmentModel.getStats({ course_id, start_date, end_date });
    return stats;
  }

  static async exportEnrollments({ format = 'csv', course_id, start_date, end_date }) {
    const enrollments = await EnrollmentModel.getForExport({ course_id, start_date, end_date });

    if (format === 'csv') {
      const fields = [
        'enrollment_id',
        'user_name',
        'user_email',
        'course_title',
        'enrolled_at',
        'status',
        'progress_percentage',
        'completed_at'
      ];
      
      const csv = json2csv.parse(enrollments, { fields });
      return csv;
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Enrollments');
      
      worksheet.columns = [
        { header: 'Enrollment ID', key: 'enrollment_id', width: 15 },
        { header: 'User Name', key: 'user_name', width: 20 },
        { header: 'User Email', key: 'user_email', width: 25 },
        { header: 'Course Title', key: 'course_title', width: 30 },
        { header: 'Enrolled At', key: 'enrolled_at', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Progress %', key: 'progress_percentage', width: 15 },
        { header: 'Completed At', key: 'completed_at', width: 20 }
      ];
      
      enrollments.forEach(enrollment => {
        worksheet.addRow(enrollment);
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    }

    throw new Error('Unsupported export format');
  }
}

export default EnrollmentsService;