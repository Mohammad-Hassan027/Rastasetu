const express = require('express');
const router = express.Router();

// Controllers
const {
  getFeed,
  getTrendingPosts,
  getPostsByLocation,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getUserPosts
} = require('../controllers/postController');

// Middlewares
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const {
  validateCreatePost,
  validateUpdatePost,
  validateObjectId,
  validatePagination,
  validateLocationQuery
} = require('../middlewares/validation');

/**
 * @route   GET /api/posts/feed
 * @desc    Get user's personalized feed
 * @access  Private
 */
router.get('/feed', authenticateToken, validatePagination, getFeed);

/**
 * @route   GET /api/posts/trending
 * @desc    Get trending posts
 * @access  Public (but enhanced with auth)
 */
router.get('/trending', optionalAuth, getTrendingPosts);

/**
 * @route   GET /api/posts/location
 * @desc    Get posts by location
 * @access  Public
 */
router.get('/location', validateLocationQuery, getPostsByLocation);

/**
 * @route   POST /api/posts
 * @desc    Create a new post
 * @access  Private
 */
router.post('/', authenticateToken, validateCreatePost, createPost);

/**
 * @route   GET /api/posts/:id
 * @desc    Get single post by ID
 * @access  Public (but enhanced with auth)
 */
router.get('/:id', optionalAuth, validateObjectId('id'), getPost);

/**
 * @route   PUT /api/posts/:id
 * @desc    Update post
 * @access  Private (Owner only)
 */
router.put('/:id', authenticateToken, validateObjectId('id'), validateUpdatePost, updatePost);

/**
 * @route   DELETE /api/posts/:id
 * @desc    Delete post
 * @access  Private (Owner only)
 */
router.delete('/:id', authenticateToken, validateObjectId('id'), deletePost);

/**
 * @route   POST /api/posts/:id/like
 * @desc    Like a post
 * @access  Private
 */
router.post('/:id/like', authenticateToken, validateObjectId('id'), likePost);

/**
 * @route   DELETE /api/posts/:id/like
 * @desc    Unlike a post
 * @access  Private
 */
router.delete('/:id/like', authenticateToken, validateObjectId('id'), unlikePost);

/**
 * @route   GET /api/posts/user/:userId
 * @desc    Get posts by specific user
 * @access  Public (but enhanced with auth)
 */
router.get('/user/:userId', optionalAuth, validateObjectId('userId'), validatePagination, getUserPosts);

module.exports = router;