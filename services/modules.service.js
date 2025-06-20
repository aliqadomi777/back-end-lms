import ModuleModel from "../models/Module.model.js";
import CourseModel from "../models/Course.model.js";
import EnrollmentModel from "../models/Enrollment.model.js";

export class ModulesService {
  static async createModule(moduleData, instructorId) {
    const {
      course_id,
      title,
      description,
      position,
      is_published,
      created_by,
    } = moduleData;
    // Verify instructor owns the course
    const course = await CourseModel.findById(course_id);
    if (!course) throw new Error("Course not found");
    if (course.instructor_id !== instructorId) throw new Error("Unauthorized");
    // Use model to create module (model will normalize position)
    const newModule = await ModuleModel.create({
      course_id,
      title,
      description,
      position,
      is_published,
      created_by: instructorId,
    });
    return ModulesService.sanitizeModule(newModule);
  }

  static async getCourseModules(courseId, userId = null) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new Error("Course not found");
    // Only instructor or enrolled students can access unpublished courses
    if (!course.is_published && userId !== course.instructor_id) {
      if (userId) {
        const enrollment = await EnrollmentModel.findByUserAndCourse(
          userId,
          courseId
        );
        if (!enrollment) throw new Error("Access denied");
      } else {
        throw new Error("Course is not published");
      }
    }
    const { data: modules } = await ModuleModel.getByCourse(courseId);
    return modules.map(ModulesService.sanitizeModule);
  }

  static async getModuleById(id, userId = null) {
    const module = await ModuleModel.findById(id, { includeLessons: true });
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
    return ModulesService.sanitizeModule(module);
  }

  static async updateModule(id, instructorId, updateData) {
    const module = await ModuleModel.findById(id);
    if (!module) throw new Error("Module not found");
    const course = await CourseModel.findById(module.course_id);
    if (!course) throw new Error("Course not found");
    if (course.instructor_id !== instructorId) throw new Error("Unauthorized");
    // Only allow schema fields
    const allowedFields = ["title", "description", "position", "is_published"];
    const filteredData = {};
    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) filteredData[key] = updateData[key];
    });
    if (Object.keys(filteredData).length === 0)
      throw new Error("No valid fields to update");
    const updatedModule = await ModuleModel.update(
      id,
      filteredData,
      instructorId
    );
    return ModulesService.sanitizeModule(updatedModule);
  }

  static async deleteModule(id, instructorId) {
    const module = await ModuleModel.findById(id);
    if (!module) throw new Error("Module not found");
    const course = await CourseModel.findById(module.course_id);
    if (!course) throw new Error("Course not found");
    if (course.instructor_id !== instructorId) throw new Error("Unauthorized");
    await ModuleModel.delete(id);
    return true;
  }

  static async reorderModules(courseId, instructorId, moduleOrder) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new Error("Course not found");
    if (course.instructor_id !== instructorId) throw new Error("Unauthorized");
    // moduleOrder: [{id, position}, ...]
    await ModuleModel.reorderModules(courseId, moduleOrder);
    const { data: updatedModules } = await ModuleModel.getByCourse(courseId);
    return updatedModules.map(ModulesService.sanitizeModule);
  }

  static sanitizeModule(module) {
    if (!module) return null;
    const {
      id,
      course_id,
      title,
      description,
      position,
      is_published,
      created_by,
      updated_by,
      created_at,
      updated_at,
      lessons,
    } = module;
    return {
      id,
      course_id,
      title,
      description,
      position,
      is_published,
      created_by,
      updated_by,
      created_at,
      updated_at,
      lessons,
    };
  }

  static async duplicateModule(id, instructorId) {
    const module = await ModuleModel.findByIdWithLessons(id);
    if (!module) {
      throw new Error("Module not found");
    }

    const course = await CourseModel.findById(module.course_id);
    if (!course) {
      throw new Error("Course not found");
    }

    if (course.instructor_id !== instructorId) {
      throw new Error("Unauthorized to duplicate this module");
    }

    // Get next order index
    const maxOrder = await ModuleModel.getMaxOrderIndex(module.course_id);
    const newOrderIndex = (maxOrder || 0) + 1;

    // Create duplicate module
    const duplicatedModule = await ModuleModel.duplicate(id, {
      title: `${module.title} (Copy)`,
      order_index: newOrderIndex,
    });

    return duplicatedModule;
  }

  static async getModuleProgress(id, userId) {
    const module = await ModuleModel.findById(id);
    if (!module) {
      throw new Error("Module not found");
    }

    // Verify user is enrolled in the course
    const enrollment = await EnrollmentModel.findByUserAndCourse(
      userId,
      module.course_id
    );
    if (!enrollment) {
      throw new Error("User is not enrolled in this course");
    }

    const progress = await ModuleModel.getModuleProgress(id, userId);
    return progress;
  }
}
