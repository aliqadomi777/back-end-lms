import CourseModel from '../models/Course.model.js';
import EnrollmentModel from '../models/Enrollment.model.js';
import ModuleModel from '../models/Module.model.js';

export class CoursesService {
  static async createCourse(courseData, instructorId) {
    const {
      title,
      description,
      category_id,
      thumbnail_url,
      thumbnail_file_id,
      tags,
      is_published,
      is_approved
    } = courseData;
    const newCourse = await CourseModel.create({
      title,
      description,
      category_id,
      thumbnail_url,
      thumbnail_file_id,
      tags,
      is_published: !!is_published,
      is_approved: !!is_approved,
      instructor_id: instructorId,
      created_by: instructorId
    });
    return CoursesService.sanitizeCourse(newCourse);
  }

  static async getAllCourses({ page = 1, limit = 10, sort = 'created_at', order = 'desc', search = '', filters = {} }) {
    const { data: courses, pagination } = await CourseModel.getAll({
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order,
      search,
      filters: { ...filters, is_published: true }
    });
    return {
      data: courses.map(CoursesService.sanitizeCourse),
      meta: pagination
    };
  }

  static async getCourseById(id, userId = null) {
    const course = await CourseModel.findById(id, { includeModules: true });
    if (!course) throw new Error('Course not found');
    // Check if user is enrolled (if userId provided)
    let isEnrolled = false;
    let enrollmentData = null;
    if (userId) {
      enrollmentData = await EnrollmentModel.findByUserAndCourse(userId, id);
      isEnrolled = !!enrollmentData;
    }
    return {
      ...CoursesService.sanitizeCourse(course),
      modules: course.modules,
      isEnrolled,
      enrollmentData
    };
  }

  static async updateCourse(id, instructorId, updateData) {
    const course = await CourseModel.findById(id);
    if (!course) throw new Error('Course not found');
    if (course.instructor_id !== instructorId) throw new Error('Unauthorized');
    const allowedFields = [
      'title', 'description', 'category_id', 'thumbnail_url', 'thumbnail_file_id',
      'tags', 'is_published', 'is_approved'
    ];
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) filteredData[key] = updateData[key];
    });
    if (Object.keys(filteredData).length === 0) throw new Error('No valid fields to update');
    const updatedCourse = await CourseModel.update(id, filteredData, instructorId);
    return CoursesService.sanitizeCourse(updatedCourse);
  }

  static async deleteCourse(id, instructorId) {
    const course = await CourseModel.findById(id);
    if (!course) throw new Error('Course not found');
    if (course.instructor_id !== instructorId) throw new Error('Unauthorized');
    await CourseModel.delete(id);
    return true;
  }

  static async publishCourse(id, instructorId) {
    const course = await CourseModel.findById(id);
    if (!course) throw new Error('Course not found');
    if (course.instructor_id !== instructorId) throw new Error('Unauthorized');
    if (course.is_published) throw new Error('Course is already published');
    // Validate course has required content
    const { data: modules } = await ModuleModel.getByCourse(id);
    if (!modules || modules.length === 0) throw new Error('Course must have at least one module before publishing');
    const updatedCourse = await CourseModel.update(id, { is_published: true }, instructorId);
    return CoursesService.sanitizeCourse(updatedCourse);
  }

  static async unpublishCourse(id, instructorId) {
    const course = await CourseModel.findById(id);
    if (!course) throw new Error('Course not found');
    if (course.instructor_id !== instructorId) throw new Error('Unauthorized');
    if (!course.is_published) throw new Error('Course is not published');
    const updatedCourse = await CourseModel.update(id, { is_published: false }, instructorId);
    return CoursesService.sanitizeCourse(updatedCourse);
  }

  static async getInstructorCourses(instructorId, { page = 1, limit = 10, sort = 'created_at', order = 'desc', search = '', filters = {} }) {
    const { data: courses, pagination } = await CourseModel.getByInstructor(instructorId, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order,
      search,
      filters
    });
    return {
      data: courses.map(CoursesService.sanitizeCourse),
      meta: pagination
    };
  }

  static async getCourseAnalytics(id, instructorId) {
    const course = await CourseModel.findById(id);
    if (!course) throw new Error('Course not found');
    if (course.instructor_id !== instructorId) throw new Error('Unauthorized');
    const analytics = await CourseModel.getCourseAnalytics(id);
    return analytics;
  }

  static async approveCourse(id, adminId) {
    const course = await CourseModel.findById(id);
    if (!course) throw new Error('Course not found');
    const updatedCourse = await CourseModel.update(id, { is_approved: true }, adminId);
    return CoursesService.sanitizeCourse(updatedCourse);
  }

  static async rejectCourse(id, adminId) {
    const course = await CourseModel.findById(id);
    if (!course) throw new Error('Course not found');
    const updatedCourse = await CourseModel.update(id, { is_approved: false }, adminId);
    return CoursesService.sanitizeCourse(updatedCourse);
  }

  static async getFeaturedCourses(limit = 6) {
    const { data: courses } = await CourseModel.getAll({
      page: 1,
      limit,
      filters: { is_published: true },
      sort: 'created_at',
      order: 'desc'
    });
    return courses.map(CoursesService.sanitizeCourse);
  }

  static sanitizeCourse(course) {
    if (!course) return null;
    const {
      id, title, description, category_id, thumbnail_url, thumbnail_file_id, tags,
      is_published, is_approved, instructor_id, created_by, updated_by, created_at, updated_at
    } = course;
    return {
      id, title, description, category_id, thumbnail_url, thumbnail_file_id, tags,
      is_published, is_approved, instructor_id, created_by, updated_by, created_at, updated_at
    };
  }
}

export default CoursesService;