import LessonModel from "../models/Lesson.model.js";
import ModuleModel from "../models/Module.model.js";
import CourseModel from "../models/Course.model.js";
import EnrollmentModel from "../models/Enrollment.model.js";
import LessonCompletionModel from "../models/LessonCompletion.model.js";
import LessonViewModel from "../models/LessonView.model.js";

export class LessonsService {
  static async createLesson(lessonData, instructorId) {
    const {
      module_id,
      title,
      content_type,
      content_url,
      content_file_id,
      duration_minutes,
      position,
      is_preview,
      is_published,
      created_by,
    } = lessonData;

    // Verify instructor owns the course through module
    const module = await ModuleModel.findById(module_id);
    if (!module) throw new Error("Module not found");
    const course = await CourseModel.findById(module.course_id);
    if (!course) throw new Error("Course not found");
    if (course.instructor_id !== instructorId) throw new Error("Unauthorized");

    // Use model to create lesson (model will normalize position)
    const newLesson = await LessonModel.create({
      module_id,
      title,
      content_type,
      content_url,
      content_file_id,
      duration_minutes,
      position,
      is_preview,
      is_published,
      created_by: instructorId,
    });
    return LessonsService.sanitizeLesson(newLesson);
  }

  static async getModuleLessons(moduleId, userId = null) {
    const module = await ModuleModel.findById(moduleId);
    if (!module) throw new Error("Module not found");
    const course = await CourseModel.findById(module.course_id);
    if (!course) throw new Error("Course not found");
    // Only instructor or enrolled students can access unpublished modules
    if (!module.is_published && userId !== course.instructor_id) {
      if (userId) {
        const enrollment = await EnrollmentModel.findByUserAndCourse(
          userId,
          module.course_id
        );
        if (!enrollment) throw new Error("Access denied");
      } else {
        throw new Error("Module is not accessible");
      }
    }
    const { data: lessons } = await LessonModel.findByModuleId(moduleId);
    if (userId && userId !== course.instructor_id) {
      // Add completion and view info
      return await Promise.all(
        lessons.map(async (lesson) => {
          const completion = await LessonCompletionModel.findByUserAndLesson(
            userId,
            lesson.id
          );
          const views = await LessonViewModel.getByUserAndLesson(
            userId,
            lesson.id
          );
          return {
            ...LessonsService.sanitizeLesson(lesson),
            is_completed: !!completion,
            completion_date: completion?.completed_at || null,
            total_views: views.length,
            total_watch_time: views.reduce(
              (sum, v) => sum + (v.duration_seconds || 0),
              0
            ),
          };
        })
      );
    }
    return lessons.map(LessonsService.sanitizeLesson);
  }

  static async getLessonById(id, userId = null) {
    const lesson = await LessonModel.findById(id);
    if (!lesson) throw new Error("Lesson not found");
    const module = await ModuleModel.findById(lesson.module_id);
    if (!module) throw new Error("Module not found");
    const course = await CourseModel.findById(module.course_id);
    if (!course) throw new Error("Course not found");
    // Only instructor or enrolled students can access unpublished lessons
    if (!lesson.is_published && userId !== course.instructor_id) {
      if (userId) {
        const enrollment = await EnrollmentModel.findByUserAndCourse(
          userId,
          module.course_id
        );
        if (!enrollment && !lesson.is_preview) throw new Error("Access denied");
      } else if (!lesson.is_preview) {
        throw new Error("Lesson is not accessible");
      }
    }
    if (userId && userId !== course.instructor_id) {
      const completion = await LessonCompletionModel.findByUserAndLesson(
        userId,
        lesson.id
      );
      const views = await LessonViewModel.getByUserAndLesson(userId, lesson.id);
      return {
        ...LessonsService.sanitizeLesson(lesson),
        is_completed: !!completion,
        completion_date: completion?.completed_at || null,
        total_views: views.length,
        total_watch_time: views.reduce(
          (sum, v) => sum + (v.duration_seconds || 0),
          0
        ),
      };
    }
    return LessonsService.sanitizeLesson(lesson);
  }

  static async updateLesson(id, instructorId, updateData) {
    const lesson = await LessonModel.findById(id);
    if (!lesson) throw new Error("Lesson not found");
    const module = await ModuleModel.findById(lesson.module_id);
    if (!module) throw new Error("Module not found");
    const course = await CourseModel.findById(module.course_id);
    if (!course) throw new Error("Course not found");
    if (course.instructor_id !== instructorId) throw new Error("Unauthorized");
    // Only allow schema fields
    const allowedFields = [
      "title",
      "content_type",
      "content_url",
      "content_file_id",
      "duration_minutes",
      "position",
      "is_preview",
      "is_published",
    ];
    const filteredData = {};
    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) filteredData[key] = updateData[key];
    });
    if (Object.keys(filteredData).length === 0)
      throw new Error("No valid fields to update");
    const updatedLesson = await LessonModel.update(
      id,
      filteredData,
      instructorId
    );
    return LessonsService.sanitizeLesson(updatedLesson);
  }

  static async deleteLesson(id, instructorId) {
    const lesson = await LessonModel.findById(id);
    if (!lesson) throw new Error("Lesson not found");
    const module = await ModuleModel.findById(lesson.module_id);
    if (!module) throw new Error("Module not found");
    const course = await CourseModel.findById(module.course_id);
    if (!course) throw new Error("Course not found");
    if (course.instructor_id !== instructorId) throw new Error("Unauthorized");
    await LessonModel.delete(id);
    return true;
  }

  static async reorderLessons(moduleId, instructorId, lessonOrder) {
    const module = await ModuleModel.findById(moduleId);
    if (!module) throw new Error("Module not found");
    const course = await CourseModel.findById(module.course_id);
    if (!course) throw new Error("Course not found");
    if (course.instructor_id !== instructorId) throw new Error("Unauthorized");
    // lessonOrder: [{lesson_id, position}, ...]
    await LessonModel.updateOrder(moduleId, lessonOrder);
    const { data: updatedLessons } = await LessonModel.findByModuleId(moduleId);
    return updatedLessons.map(LessonsService.sanitizeLesson);
  }

  static async completeLessonForUser(lessonId, userId) {
    // Prevent duplicate completions
    const already = await LessonCompletionModel.findByUserAndLesson(
      userId,
      lessonId
    );
    if (already) return already;
    return await LessonCompletionModel.markCompleted(userId, lessonId);
  }

  static async uncompleteLessonForUser(lessonId, userId) {
    return await LessonCompletionModel.removeCompletion(userId, lessonId);
  }

  static async logLessonView(lessonId, userId, durationSeconds = 0) {
    return await LessonViewModel.recordView(userId, lessonId, durationSeconds);
  }

  static sanitizeLesson(lesson) {
    // Remove sensitive/internal fields
    if (!lesson) return null;
    const {
      id,
      module_id,
      title,
      content_type,
      content_url,
      content_file_id,
      duration_minutes,
      position,
      is_preview,
      is_published,
      created_by,
      updated_by,
      created_at,
      updated_at,
    } = lesson;
    return {
      id,
      module_id,
      title,
      content_type,
      content_url,
      content_file_id,
      duration_minutes,
      position,
      is_preview,
      is_published,
      created_by,
      updated_by,
      created_at,
      updated_at,
    };
  }
}
