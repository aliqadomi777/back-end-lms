/**
 * File Upload Middleware
 * 
 * This middleware provides file upload functionality using multer
 * with various configuration options for different file types.
 */

import fileUploadUtils from '../utils/fileUpload.js';

// Single file upload
export const uploadSingle = (fieldName, options = {}) => {
  return fileUploadUtils.createUploadMiddleware({
    ...options,
    single: fieldName
  });
};

// Multiple files upload
export const uploadMultiple = (fieldName, maxCount = 10, options = {}) => {
  return fileUploadUtils.createUploadMiddleware({
    ...options,
    array: { fieldName, maxCount }
  });
};

// Mixed fields upload
export const uploadFields = (fields, options = {}) => {
  return fileUploadUtils.createUploadMiddleware({
    ...options,
    fields
  });
};

// Any files upload
export const uploadAny = (options = {}) => {
  return fileUploadUtils.createUploadMiddleware({
    ...options,
    any: true
  });
};

// No files upload (form data only)
export const uploadNone = (options = {}) => {
  return fileUploadUtils.createUploadMiddleware({
    ...options,
    none: true
  });
};

// Specific upload configurations
export const assignmentUpload = fileUploadUtils.assignmentUpload;
export const courseMaterialUpload = fileUploadUtils.courseMaterialUpload;
export const profileImageUpload = fileUploadUtils.profileUpload;
export const courseThumbnailUpload = fileUploadUtils.imageUpload;

// Default export
export default {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadAny,
  uploadNone,
  assignmentUpload,
  courseMaterialUpload,
  profileImageUpload,
  courseThumbnailUpload
};