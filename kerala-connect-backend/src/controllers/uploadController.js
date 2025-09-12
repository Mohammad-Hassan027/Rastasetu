const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create subdirectories
const subdirs = ['profiles', 'posts', 'places', 'temp'];
subdirs.forEach(subdir => {
  const subdirPath = path.join(uploadsDir, subdir);
  if (!fs.existsSync(subdirPath)) {
    fs.mkdirSync(subdirPath, { recursive: true });
  }
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { type } = req.params;
    let uploadPath;
    
    switch (type) {
      case 'profile':
        uploadPath = path.join(uploadsDir, 'profiles');
        break;
      case 'post':
        uploadPath = path.join(uploadsDir, 'posts');
        break;
      case 'place':
        uploadPath = path.join(uploadsDir, 'places');
        break;
      default:
        uploadPath = path.join(uploadsDir, 'temp');
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: fileFilter
});

// Upload single image
const uploadSingle = (req, res) => {
  const uploadSingleFile = upload.single('image');
  
  uploadSingleFile(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 5MB.'
        });
      }
      
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          error: 'Unexpected field name. Use "image" as the field name.'
        });
      }
      
      return res.status(400).json({
        success: false,
        error: err.message || 'Upload failed'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.params.type}s/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path
      }
    });
  });
};

// Upload multiple images
const uploadMultiple = (req, res) => {
  const uploadMultipleFiles = upload.array('images', 5);
  
  uploadMultipleFiles(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'One or more files are too large. Maximum size is 5MB per file.'
        });
      }
      
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          error: 'Too many files or unexpected field name. Use "images" and max 5 files.'
        });
      }
      
      return res.status(400).json({
        success: false,
        error: err.message || 'Upload failed'
      });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `${baseUrl}/uploads/${req.params.type}s/${file.filename}`,
      path: file.path
    }));
    
    res.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      data: uploadedFiles
    });
  });
};

// Delete uploaded file
const deleteFile = async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
    }
    
    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }
    
    const filePath = path.join(uploadsDir, `${type}s`, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Delete file
    const unlinkAsync = promisify(fs.unlink);
    await unlinkAsync(filePath);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    });
  }
};

// Get file info
const getFileInfo = (req, res) => {
  try {
    const { type, filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
    }
    
    // Validate filename
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }
    
    const filePath = path.join(uploadsDir, `${type}s`, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    const stats = fs.statSync(filePath);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.json({
      success: true,
      data: {
        filename: filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `${baseUrl}/uploads/${type}s/${filename}`,
        path: filePath
      }
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file info'
    });
  }
};

// Clean up temporary files (older than 24 hours)
const cleanupTempFiles = async (req, res) => {
  try {
    const tempDir = path.join(uploadsDir, 'temp');
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.birthtime.getTime() > oneDayMs) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} temporary file(s)`
    });
  } catch (error) {
    console.error('Cleanup temp files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup temporary files'
    });
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  deleteFile,
  getFileInfo,
  cleanupTempFiles
};