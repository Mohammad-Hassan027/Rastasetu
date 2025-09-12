const express = require('express');
const router = express.Router();

// Controllers
const {
  signup,
  login,
  logout,
  getCurrentUser,
  refreshToken,
  requestPasswordReset,
  verifyEmail
} = require('../controllers/authController');

// Middlewares
const { authenticateToken, authRateLimit } = require('../middlewares/auth');
const {
  validateSignup,
  validateLogin
} = require('../middlewares/validation');

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', authRateLimit(5, 15), validateSignup, signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authRateLimit(10, 15), validateLogin, login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateToken, getCurrentUser);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh-token', authenticateToken, refreshToken);

/**
 * @route   POST /api/auth/request-password-reset
 * @desc    Request password reset
 * @access  Public
 */
router.post('/request-password-reset', authRateLimit(3, 60), requestPasswordReset);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get('/verify-email/:token', verifyEmail);

module.exports = router;