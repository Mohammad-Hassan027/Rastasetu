const express = require('express');
const router = express.Router();

// Controllers
const {
  getUserProfile,
  getMyProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing,
  getUserPosts,
  searchUsers,
  getUserPoints,
  getLeaderboard
} = require('../controllers/userController');

// Middlewares
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const {
  validateUpdateProfile,
  validateObjectId,
  validatePagination,
  validateSearchQuery
} = require('../middlewares/validation');

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateToken, getMyProfile);

/**
 * @route   PUT /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', authenticateToken, validateUpdateProfile, updateProfile);

/**
 * @route   GET /api/users/me/points
 * @desc    Get current user points and transactions
 * @access  Private
 */
router.get('/me/points', authenticateToken, validatePagination, getUserPoints);

/**
 * @route   GET /api/users/search
 * @desc    Search users by name or username
 * @access  Public (but enhanced with auth)
 */
router.get('/search', optionalAuth, validateSearchQuery, validatePagination, searchUsers);

/**
 * @route   GET /api/users/leaderboard
 * @desc    Get points leaderboard
 * @access  Public
 */
router.get('/leaderboard', getLeaderboard);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user profile by ID
 * @access  Public (but enhanced with auth)
 */
router.get('/:userId', optionalAuth, validateObjectId('userId'), getUserProfile);

/**
 * @route   GET /api/users/:userId/posts
 * @desc    Get posts by specific user
 * @access  Public (but enhanced with auth)
 */
router.get('/:userId/posts', optionalAuth, validateObjectId('userId'), validatePagination, getUserPosts);

/**
 * @route   GET /api/users/:userId/followers
 * @desc    Get user followers
 * @access  Public (but enhanced with auth)
 */
router.get('/:userId/followers', optionalAuth, validateObjectId('userId'), validatePagination, getUserFollowers);

/**
 * @route   GET /api/users/:userId/following
 * @desc    Get users that the user is following
 * @access  Public (but enhanced with auth)
 */
router.get('/:userId/following', optionalAuth, validateObjectId('userId'), validatePagination, getUserFollowing);

/**
 * @route   POST /api/users/:userId/follow
 * @desc    Follow a user
 * @access  Private
 */
router.post('/:userId/follow', authenticateToken, validateObjectId('userId'), followUser);

/**
 * @route   DELETE /api/users/:userId/follow
 * @desc    Unfollow a user
 * @access  Private
 */
router.delete('/:userId/follow', authenticateToken, validateObjectId('userId'), unfollowUser);

module.exports = router;