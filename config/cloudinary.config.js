/**
 * Cloudinary Configuration
 *
 * Configuration for Cloudinary file upload service
 */

import { v2 as cloudinary } from "cloudinary";

const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: process.env.NODE_ENV === "production",
};

// Initialize Cloudinary
cloudinary.config(cloudinaryConfig);

// Upload configuration
const uploadConfig = {
  // Maximum file size (10MB)
  maxFileSize: 10 * 1024 * 1024,

  // Allowed file types
  allowedTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
  ],

  // Upload options
  uploadOptions: {
    resource_type: "auto",
    folder:
      process.env.NODE_ENV === "production"
        ? "lms/production"
        : "lms/development",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  },
};

export { cloudinary, uploadConfig };
