import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { AppError } from './AppError.js';
import { validateFile } from './cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// File type configurations
const fileTypes = {
  image: {
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  },
  video: {
    mimeTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'],
    maxSize: 100 * 1024 * 1024, // 100MB
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.webm']
  },
  document: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt']
  },
  audio: {
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
    maxSize: 20 * 1024 * 1024, // 20MB
    extensions: ['.mp3', '.wav', '.ogg']
  },
  archive: {
    mimeTypes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
    maxSize: 50 * 1024 * 1024, // 50MB
    extensions: ['.zip', '.rar', '.7z']
  }
};

/**
 * Generate unique filename
 * @param {Object} file - Multer file object
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (file) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = path.extname(file.originalname).toLowerCase();
  const baseName = path.basename(file.originalname, extension)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50);
  
  return `${timestamp}_${randomString}_${baseName}${extension}`;
};

/**
 * Sanitize filename
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
const sanitizeFilename = (filename) => {
  // Remove dangerous characters and normalize
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
};

/**
 * Create file filter function
 * @param {Array} allowedTypes - Array of allowed file type categories
 * @returns {Function} Multer file filter function
 */
const createFileFilter = (allowedTypes = ['image', 'document']) => {
  return (req, file, cb) => {
    try {
      const allowedMimeTypes = [];
      const allowedExtensions = [];

      // Collect allowed mime types and extensions
      allowedTypes.forEach(type => {
        if (fileTypes[type]) {
          allowedMimeTypes.push(...fileTypes[type].mimeTypes);
          allowedExtensions.push(...fileTypes[type].extensions);
        }
      });

      const fileExtension = path.extname(file.originalname).toLowerCase();
      
      // Check mime type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new AppError(`File type ${file.mimetype} is not allowed`, 400), false);
      }

      // Check file extension
      if (!allowedExtensions.includes(fileExtension)) {
        return cb(new AppError(`File extension ${fileExtension} is not allowed`, 400), false);
      }

      // Additional security checks
      if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
        return cb(new AppError('Invalid filename', 400), false);
      }

      cb(null, true);
    } catch (error) {
      cb(new AppError(`File validation error: ${error.message}`, 400), false);
    }
  };
};

/**
 * Create storage configuration
 * @param {string} destination - Upload destination folder
 * @returns {Object} Multer storage configuration
 */
const createStorage = (destination = 'general') => {
  const destPath = path.join(uploadsDir, destination);
  
  // Ensure destination directory exists
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destPath);
    },
    filename: (req, file, cb) => {
      try {
        const uniqueFilename = generateUniqueFilename(file);
        cb(null, uniqueFilename);
      } catch (error) {
        cb(new AppError(`Filename generation error: ${error.message}`, 500));
      }
    }
  });
};

/**
 * Create memory storage (for direct cloud upload)
 * @returns {Object} Multer memory storage configuration
 */
const createMemoryStorage = () => {
  return multer.memoryStorage();
};

/**
 * Get file size limit for file types
 * @param {Array} allowedTypes - Array of allowed file type categories
 * @returns {number} Maximum file size in bytes
 */
const getFileSizeLimit = (allowedTypes) => {
  let maxSize = 0;
  allowedTypes.forEach(type => {
    if (fileTypes[type] && fileTypes[type].maxSize > maxSize) {
      maxSize = fileTypes[type].maxSize;
    }
  });
  return maxSize || 5 * 1024 * 1024; // Default 5MB
};

/**
 * Create multer upload middleware
 * @param {Object} options - Upload options
 * @returns {Object} Multer upload middleware
 */
export const createUploadMiddleware = (options = {}) => {
  const {
    destination = 'general',
    allowedTypes = ['image', 'document'],
    maxFiles = 1,
    useMemoryStorage = false,
    customSizeLimit = null
  } = options;

  const storage = useMemoryStorage ? createMemoryStorage() : createStorage(destination);
  const fileFilter = createFileFilter(allowedTypes);
  const sizeLimit = customSizeLimit || getFileSizeLimit(allowedTypes);

  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: sizeLimit,
      files: maxFiles
    }
  });

  return {
    single: (fieldName) => upload.single(fieldName),
    array: (fieldName, maxCount = maxFiles) => upload.array(fieldName, maxCount),
    fields: (fields) => upload.fields(fields),
    any: () => upload.any(),
    none: () => upload.none()
  };
};

/**
 * Image upload middleware
 */
export const imageUpload = createUploadMiddleware({
  destination: 'images',
  allowedTypes: ['image'],
  maxFiles: 5,
  useMemoryStorage: true
});

/**
 * Video upload middleware
 */
export const videoUpload = createUploadMiddleware({
  destination: 'videos',
  allowedTypes: ['video'],
  maxFiles: 1,
  useMemoryStorage: true
});

/**
 * Document upload middleware
 */
export const documentUpload = createUploadMiddleware({
  destination: 'documents',
  allowedTypes: ['document'],
  maxFiles: 10,
  useMemoryStorage: true
});

/**
 * Audio upload middleware
 */
export const audioUpload = createUploadMiddleware({
  destination: 'audio',
  allowedTypes: ['audio'],
  maxFiles: 3,
  useMemoryStorage: true
});

/**
 * Mixed media upload middleware
 */
export const mixedUpload = createUploadMiddleware({
  destination: 'mixed',
  allowedTypes: ['image', 'document', 'audio'],
  maxFiles: 10,
  useMemoryStorage: true
});

/**
 * Assignment submission upload middleware
 */
export const assignmentUpload = createUploadMiddleware({
  destination: 'assignments',
  allowedTypes: ['document', 'image', 'archive'],
  maxFiles: 5,
  useMemoryStorage: true
});

/**
 * Profile picture upload middleware
 */
export const profileUpload = createUploadMiddleware({
  destination: 'profiles',
  allowedTypes: ['image'],
  maxFiles: 1,
  useMemoryStorage: true,
  customSizeLimit: 2 * 1024 * 1024 // 2MB for profile pictures
});

/**
 * Course material upload middleware
 */
export const courseMaterialUpload = createUploadMiddleware({
  destination: 'course-materials',
  allowedTypes: ['document', 'video', 'audio', 'image'],
  maxFiles: 20,
  useMemoryStorage: true
});

/**
 * Validate uploaded file
 * @param {Object} file - Uploaded file object
 * @param {Object} options - Validation options
 * @returns {boolean} Is valid
 */
export const validateUploadedFile = (file, options = {}) => {
  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  const {
    allowedTypes = ['image', 'document'],
    maxSize = null,
    required = true
  } = options;

  if (required && !file) {
    throw new AppError('File is required', 400);
  }

  if (file) {
    // Validate file type
    const allowedMimeTypes = [];
    allowedTypes.forEach(type => {
      if (fileTypes[type]) {
        allowedMimeTypes.push(...fileTypes[type].mimeTypes);
      }
    });

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError(`File type ${file.mimetype} is not allowed`, 400);
    }

    // Validate file size
    const sizeLimit = maxSize || getFileSizeLimit(allowedTypes);
    if (file.size > sizeLimit) {
      throw new AppError(`File size exceeds limit of ${sizeLimit / (1024 * 1024)}MB`, 400);
    }
  }

  return true;
};

/**
 * Clean up uploaded files
 * @param {Array|Object} files - Files to clean up
 */
export const cleanupFiles = (files) => {
  const fileArray = Array.isArray(files) ? files : [files];
  
  fileArray.forEach(file => {
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        console.log(`Cleaned up file: ${file.path}`);
      } catch (error) {
        console.error(`Failed to cleanup file ${file.path}:`, error);
      }
    }
  });
};

/**
 * Get file info
 * @param {Object} file - File object
 * @returns {Object} File information
 */
export const getFileInfo = (file) => {
  if (!file) return null;

  return {
    originalName: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    buffer: file.buffer,
    extension: path.extname(file.originalname).toLowerCase(),
    sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
  };
};

/**
 * Handle multer errors
 * @param {Error} error - Multer error
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
export const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return next(new AppError('File too large', 400));
      case 'LIMIT_FILE_COUNT':
        return next(new AppError('Too many files', 400));
      case 'LIMIT_UNEXPECTED_FILE':
        return next(new AppError('Unexpected file field', 400));
      case 'LIMIT_PART_COUNT':
        return next(new AppError('Too many parts', 400));
      case 'LIMIT_FIELD_KEY':
        return next(new AppError('Field name too long', 400));
      case 'LIMIT_FIELD_VALUE':
        return next(new AppError('Field value too long', 400));
      case 'LIMIT_FIELD_COUNT':
        return next(new AppError('Too many fields', 400));
      default:
        return next(new AppError(`Upload error: ${error.message}`, 400));
    }
  }
  next(error);
};

/**
 * Create upload middleware with error handling
 * @param {Object} uploadMiddleware - Multer upload middleware
 * @returns {Function} Express middleware with error handling
 */
export const withErrorHandling = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (error) => {
      if (error) {
        return handleMulterError(error, req, res, next);
      }
      next();
    });
  };
};

export default {
  createUploadMiddleware,
  imageUpload,
  videoUpload,
  documentUpload,
  audioUpload,
  mixedUpload,
  assignmentUpload,
  profileUpload,
  courseMaterialUpload,
  validateUploadedFile,
  cleanupFiles,
  getFileInfo,
  handleMulterError,
  withErrorHandling,
  fileTypes
};