import { v2 as cloudinary } from 'cloudinary';
import { AppError } from './AppError.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Path to the file or base64 string
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with secure_url
 */
export const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const {
      folder = 'lms',
      resource_type = 'auto',
      public_id,
      transformation,
      tags = [],
      overwrite = false,
      unique_filename = true,
      use_filename = false
    } = options;

    const uploadOptions = {
      folder,
      resource_type,
      overwrite,
      unique_filename,
      use_filename,
      tags: Array.isArray(tags) ? tags : [tags]
    };

    // Add public_id if provided
    if (public_id) {
      uploadOptions.public_id = public_id;
    }

    // Add transformation if provided
    if (transformation) {
      uploadOptions.transformation = transformation;
    }

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      created_at: result.created_at
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new AppError(`File upload failed: ${error.message}`, 500);
  }
};

/**
 * Upload image with optimizations
 * @param {string} filePath - Path to the image file
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadImage = async (filePath, options = {}) => {
  const {
    folder = 'lms/images',
    width,
    height,
    crop = 'limit',
    quality = 'auto',
    format = 'auto',
    ...otherOptions
  } = options;

  const transformation = [];

  // Add resize transformation if dimensions provided
  if (width || height) {
    transformation.push({
      width,
      height,
      crop,
      quality,
      format
    });
  }

  return await uploadToCloudinary(filePath, {
    folder,
    resource_type: 'image',
    transformation: transformation.length > 0 ? transformation : undefined,
    ...otherOptions
  });
};

/**
 * Upload video with optimizations
 * @param {string} filePath - Path to the video file
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadVideo = async (filePath, options = {}) => {
  const {
    folder = 'lms/videos',
    quality = 'auto',
    format = 'mp4',
    ...otherOptions
  } = options;

  return await uploadToCloudinary(filePath, {
    folder,
    resource_type: 'video',
    transformation: [
      {
        quality,
        format
      }
    ],
    ...otherOptions
  });
};

/**
 * Upload document/file
 * @param {string} filePath - Path to the document file
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadDocument = async (filePath, options = {}) => {
  const {
    folder = 'lms/documents',
    ...otherOptions
  } = options;

  return await uploadToCloudinary(filePath, {
    folder,
    resource_type: 'raw',
    ...otherOptions
  });
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the file to delete
 * @param {string} resourceType - Type of resource (image, video, raw)
 * @returns {Promise<Object>} Deletion result
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });

    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new AppError(`File deletion failed: ${error.message}`, 500);
  }
};

/**
 * Get file details from Cloudinary
 * @param {string} publicId - Public ID of the file
 * @param {string} resourceType - Type of resource
 * @returns {Promise<Object>} File details
 */
export const getFileDetails = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      created_at: result.created_at,
      tags: result.tags
    };
  } catch (error) {
    console.error('Cloudinary get details error:', error);
    throw new AppError(`Failed to get file details: ${error.message}`, 500);
  }
};

/**
 * Generate signed upload URL for direct uploads
 * @param {Object} options - Upload options
 * @returns {Object} Signed upload data
 */
export const generateSignedUploadUrl = (options = {}) => {
  const {
    folder = 'lms',
    resource_type = 'auto',
    tags = [],
    transformation
  } = options;

  const timestamp = Math.round(new Date().getTime() / 1000);
  
  const params = {
    timestamp,
    folder,
    resource_type,
    tags: Array.isArray(tags) ? tags.join(',') : tags
  };

  if (transformation) {
    params.transformation = transformation;
  }

  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

  return {
    url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resource_type}/upload`,
    params: {
      ...params,
      signature,
      api_key: process.env.CLOUDINARY_API_KEY
    }
  };
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} Public ID
 */
export const extractPublicId = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    // Extract public ID from Cloudinary URL
    const matches = url.match(/\/v\d+\/(.+)\.[^.]+$/);
    if (matches && matches[1]) {
      return matches[1];
    }

    // Alternative pattern for URLs without version
    const altMatches = url.match(/\/([^/]+)\.[^.]+$/);
    if (altMatches && altMatches[1]) {
      return altMatches[1];
    }

    return null;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

/**
 * Generate optimized image URL
 * @param {string} publicId - Public ID of the image
 * @param {Object} options - Transformation options
 * @returns {string} Optimized image URL
 */
export const generateOptimizedImageUrl = (publicId, options = {}) => {
  const {
    width,
    height,
    crop = 'limit',
    quality = 'auto',
    format = 'auto',
    gravity = 'auto'
  } = options;

  const transformation = {
    quality,
    format
  };

  if (width || height) {
    transformation.width = width;
    transformation.height = height;
    transformation.crop = crop;
    transformation.gravity = gravity;
  }

  return cloudinary.url(publicId, {
    transformation,
    secure: true
  });
};

/**
 * Validate file type and size
 * @param {Object} file - File object
 * @param {Object} options - Validation options
 * @returns {boolean} Is valid
 */
export const validateFile = (file, options = {}) => {
  const {
    allowedTypes = [],
    maxSize = 10 * 1024 * 1024, // 10MB default
    minSize = 0
  } = options;

  // Check file size
  if (file.size > maxSize) {
    throw new AppError(`File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`, 400);
  }

  if (file.size < minSize) {
    throw new AppError(`File size is below minimum limit of ${minSize} bytes`, 400);
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    throw new AppError(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`, 400);
  }

  return true;
};

export default {
  uploadToCloudinary,
  uploadImage,
  uploadVideo,
  uploadDocument,
  deleteFromCloudinary,
  getFileDetails,
  generateSignedUploadUrl,
  extractPublicId,
  generateOptimizedImageUrl,
  validateFile
};