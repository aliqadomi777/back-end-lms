/**
 * FileUpload Model
 *
 * Handles all file uploads including course thumbnails, lesson videos,
 * lesson documents, assignment files, and user avatars.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class FileUploadModel {
  /**
   * Get file upload by ID
   * @param {number} id - File upload ID
   * @returns {Object|null} File upload or null
   */
  static async findById(id) {
    return db("file_uploads").where({ id }).first();
  }

  /**
   * Get file uploads by user
   * @param {number} uploadedBy - User ID
   * @returns {Object} File uploads by user with pagination
   */
  static async getByUser(uploadedBy, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("file_uploads")
        .select("*")
        .where("uploaded_by", uploadedBy)
        .orderBy("created_at", "desc");
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("id as count");
      const total = parseInt(count);
      const files = await query.limit(params.limit).offset(params.offset);
      return {
        data: files.map(FileUploadModel.sanitizeFile),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get file uploads by type
   * @param {string} uploadType - Upload type
   * @returns {Object} File uploads by type with pagination
   */
  static async getByType(uploadType, options = {}) {
    try {
      const allowedTypes = [
        "course_thumbnail",
        "lesson_video",
        "lesson_document",
        "assignment_file",
        "user_avatar"
      ];
      if (!allowedTypes.includes(uploadType)) {
        throw AppError.badRequest("Invalid upload type");
      }
      const params = parsePaginationParams(options);
      let query = db("file_uploads")
        .select("*")
        .where("upload_type", uploadType)
        .orderBy("created_at", "desc");
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("id as count");
      const total = parseInt(count);
      const files = await query.limit(params.limit).offset(params.offset);
      return {
        data: files.map(FileUploadModel.sanitizeFile),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Create a new file upload
   * @param {Object} data - File upload data
   * @returns {Object} Created file upload
   */
  static async create(data) {
    try {
      const {
        original_filename,
        stored_filename,
        file_path,
        file_size,
        mime_type,
        upload_type,
        uploaded_by
      } = data;
      if (!original_filename || !stored_filename || !file_path || !upload_type) {
        throw AppError.badRequest("Missing required file upload fields");
      }
      // Validate upload_type
      const allowedTypes = [
        "course_thumbnail",
        "lesson_video",
        "lesson_document",
        "assignment_file",
        "user_avatar"
      ];
      if (!allowedTypes.includes(upload_type)) {
        throw AppError.badRequest("Invalid upload_type");
      }
      // Validate user if provided
      if (uploaded_by) {
        const user = await db("users").where({ id: uploaded_by }).first();
        if (!user) throw AppError.notFound("Uploader not found");
      }
      const [file] = await db("file_uploads")
        .insert({
          original_filename,
          stored_filename,
          file_path,
          file_size: file_size || null,
          mime_type: mime_type || null,
          upload_type,
          uploaded_by: uploaded_by || null
        })
        .returning("*");
      return FileUploadModel.sanitizeFile(file);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update file upload
   * @param {number} id - File upload ID
   * @param {Object} data - Update data
   * @returns {Object} Updated file upload
   */
  static async update(id, data) {
    try {
      // Check if file upload exists
      const fileUpload = await db("file_uploads").where("id", id).first();
      if (!fileUpload) {
        throw AppError.notFound("File upload not found");
      }
      const allowedFields = [
        "original_filename",
        "stored_filename",
        "file_path",
        "file_size",
        "mime_type"
      ];
      const updateData = {};
      Object.keys(data).forEach(key => {
        if (allowedFields.includes(key)) {
          updateData[key] = data[key];
        }
      });
      if (Object.keys(updateData).length === 0) {
        throw AppError.badRequest("No valid fields to update");
      }
      // Validate file size if being updated
      if (updateData.file_size && (typeof updateData.file_size !== "number" || updateData.file_size <= 0)) {
        throw AppError.badRequest("Invalid file size");
      }
      // Trim string fields
      if (updateData.original_filename) {
        updateData.original_filename = updateData.original_filename.trim();
      }
      if (updateData.stored_filename) {
        updateData.stored_filename = updateData.stored_filename.trim();
      }
      if (updateData.file_path) {
        updateData.file_path = updateData.file_path.trim();
      }
      if (updateData.mime_type) {
        updateData.mime_type = updateData.mime_type.trim();
      }
      const [updatedFileUpload] = await db("file_uploads")
        .where("id", id)
        .update(updateData)
        .returning("*");
      return FileUploadModel.sanitizeFile(updatedFileUpload);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete file upload
   * @param {number} id - File upload ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    // Soft delete: set deleted_at (if you want to support it)
    // For now, hard delete as per schema
    return db("file_uploads").where({ id }).del();
  }

  /**
   * Get file references (where file is used)
   * @param {number} fileId - File upload ID
   * @returns {Array} References to this file
   */
  static async getFileReferences(fileId) {
    try {
      const references = [];

      // Check courses (thumbnail_file_id)
      const courseRefs = await db("courses")
        .select("id", "title")
        .where("thumbnail_file_id", fileId);
      
      if (courseRefs.length > 0) {
        references.push({
          table: "courses",
          field: "thumbnail_file_id",
          records: courseRefs
        });
      }

      // Check lessons (content_file_id)
      const lessonRefs = await db("course_lessons")
        .select("id", "title")
        .where("content_file_id", fileId);
      
      if (lessonRefs.length > 0) {
        references.push({
          table: "course_lessons",
          field: "content_file_id",
          records: lessonRefs
        });
      }

      // Check assignment submissions (submission_file_id)
      const submissionRefs = await db("assignment_submissions")
        .select("id", "assignment_id")
        .where("submission_file_id", fileId);
      
      if (submissionRefs.length > 0) {
        references.push({
          table: "assignment_submissions",
          field: "submission_file_id",
          records: submissionRefs
        });
      }

      return references;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get file uploads with pagination
   * @param {Object} options - Query options
   * @returns {Object} File uploads with pagination
   */
  static async getAll(options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("file_uploads").select("*").orderBy("created_at", "desc");
      if (params.upload_type) {
        query = query.where("upload_type", params.upload_type);
      }
      if (params.uploaded_by) {
        query = query.where("uploaded_by", params.uploaded_by);
      }
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("id as count");
      const total = parseInt(count);
      const files = await query.limit(params.limit).offset(params.offset);
      return {
        data: files.map(FileUploadModel.sanitizeFile),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get file upload statistics
   * @returns {Object} File upload statistics
   */
  static async getStats() {
    try {
      const stats = await db("file_uploads")
        .select("upload_type")
        .count("id as count")
        .sum("file_size as total_size")
        .groupBy("upload_type");

      const totalFiles = await db("file_uploads").count("id as count").first();
      const totalSize = await db("file_uploads").sum("file_size as total_size").first();

      return {
        byType: stats,
        total: {
          files: parseInt(totalFiles.count),
          size: parseInt(totalSize.total_size) || 0
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static sanitizeFile(file) {
    if (!file) return null;
    const { id, original_filename, stored_filename, file_path, file_size, mime_type, upload_type, uploaded_by, created_at } = file;
    return { id, original_filename, stored_filename, file_path, file_size, mime_type, upload_type, uploaded_by, created_at };
  }
}

export default FileUploadModel; 