const express = require('express');
const router = express.Router();

// Controllers
const {
  getPostComments,
  addComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  getCommentReplies
} = require('../controllers/commentController');

// Middlewares
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const {
  validateCreateComment,
  validateUpdateComment,
  validateObjectId,
  validatePagination
} = require('../middlewares/validation');

/**
 * @route   GET /api/comments/post/:postId
 * @desc    Get comments for a specific post
 * @access  Public (but enhanced with auth)
 */
router.get('/post/:postId', optionalAuth, validateObjectId('postId'), validatePagination, getPostComments);

/**
 * @route   POST /api/comments/post/:postId
 * @desc    Add comment to a post
 * @access  Private
 */
router.post('/post/:postId', authenticateToken, validateObjectId('postId'), validateCreateComment, addComment);

/**
 * @route   GET /api/comments/:id/replies
 * @desc    Get replies for a specific comment
 * @access  Public (but enhanced with auth)
 */
router.get('/:id/replies', optionalAuth, validateObjectId('id'), validatePagination, getCommentReplies);

/**
 * @route   PUT /api/comments/:id
 * @desc    Update comment
 * @access  Private (Owner only)
 */
router.put('/:id', authenticateToken, validateObjectId('id'), validateUpdateComment, updateComment);

/**
 * @route   DELETE /api/comments/:id
 * @desc    Delete comment
 * @access  Private (Owner only)
 */
router.delete('/:id', authenticateToken, validateObjectId('id'), deleteComment);

/**
 * @route   POST /api/comments/:id/like
 * @desc    Like a comment
 * @access  Private
 */
router.post('/:id/like', authenticateToken, validateObjectId('id'), likeComment);

/**
 * @route   DELETE /api/comments/:id/like
 * @desc    Unlike a comment
 * @access  Private
 */
router.delete('/:id/like', authenticateToken, validateObjectId('id'), unlikeComment);

module.exports = router;