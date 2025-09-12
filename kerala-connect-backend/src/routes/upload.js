const express = require('express');
const router = express.Router();

// Controllers
const {
  uploadSingle,
  uploadMultiple,
  deleteFile,
  getFileInfo,
  cleanupTempFiles
} = require('../controllers/uploadController');

// Middlewares
const { authenticateToken } = require('../middlewares/auth');

/**
 * @route   POST /api/upload/:type/single
 * @desc    Upload a single image file
 * @access  Private
 * @param   {string} type - Type of upload (profile, post, place)
 */
router.post('/:type/single', authenticateToken, (req, res, next) => {
  const { type } = req.params;
  const allowedTypes = ['profile', 'post', 'place'];
  
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid upload type. Allowed types: profile, post, place'
    });
  }
  
  next();
}, uploadSingle);

/**
 * @route   POST /api/upload/:type/multiple
 * @desc    Upload multiple image files
 * @access  Private
 * @param   {string} type - Type of upload (profile, post, place)
 */
router.post('/:type/multiple', authenticateToken, (req, res, next) => {
  const { type } = req.params;
  const allowedTypes = ['profile', 'post', 'place'];
  
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid upload type. Allowed types: profile, post, place'
    });
  }
  
  next();
}, uploadMultiple);

/**
 * @route   GET /api/upload/:type/:filename/info
 * @desc    Get file information
 * @access  Private
 */
router.get('/:type/:filename/info', authenticateToken, getFileInfo);

/**
 * @route   DELETE /api/upload/:type/:filename
 * @desc    Delete uploaded file
 * @access  Private
 */
router.delete('/:type/:filename', authenticateToken, (req, res, next) => {
  const { type } = req.params;
  const allowedTypes = ['profile', 'post', 'place', 'temp'];
  
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type'
    });
  }
  
  next();
}, deleteFile);

/**
 * @route   POST /api/upload/cleanup
 * @desc    Clean up temporary files
 * @access  Private (admin only - could be enhanced with role check)
 */
router.post('/cleanup', authenticateToken, cleanupTempFiles);

module.exports = router;