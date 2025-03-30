// src/middleware/multer.config.ts
import multer from 'multer';

// Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

// Set up file filter for images
const imageFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error('Only image files are allowed!'));
  }
  cb(null, true);
};

// Configure multer for vessel image uploads - changed to array for multiple files
export const uploadVesselImages = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: imageFilter,
}).array('image', 5); // 'image' is the field name, allow up to 5 files

// Error handling middleware for multer
export const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large, maximum file size is 10MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  } else if (err) {
    // A non-multer error occurred
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};