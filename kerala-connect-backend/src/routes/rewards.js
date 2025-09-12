const express = require('express');
const router = express.Router();

// Controllers
const {
  getAvailableCoupons,
  getFeaturedCoupons,
  getCoupon,
  redeemCoupon,
  getMyRedemptions,
  getRedemptionByCode,
  markRedemptionAsUsed,
  getCouponCategories,
  getPointsOpportunities
} = require('../controllers/rewardsController');

// Middlewares
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const {
  validateObjectId,
  validatePagination,
  validateRedemptionUsage
} = require('../middlewares/validation');

/**
 * @route   GET /api/rewards/coupons
 * @desc    Get available coupons for user
 * @access  Private
 */
router.get('/coupons', authenticateToken, getAvailableCoupons);

/**
 * @route   GET /api/rewards/coupons/featured
 * @desc    Get featured coupons
 * @access  Public
 */
router.get('/coupons/featured', getFeaturedCoupons);

/**
 * @route   GET /api/rewards/coupons/categories
 * @desc    Get coupon categories with count
 * @access  Public
 */
router.get('/coupons/categories', getCouponCategories);

/**
 * @route   GET /api/rewards/coupons/:id
 * @desc    Get specific coupon by ID
 * @access  Private
 */
router.get('/coupons/:id', authenticateToken, validateObjectId('id'), getCoupon);

/**
 * @route   POST /api/rewards/coupons/:id/redeem
 * @desc    Redeem a coupon
 * @access  Private
 */
router.post('/coupons/:id/redeem', authenticateToken, validateObjectId('id'), redeemCoupon);

/**
 * @route   GET /api/rewards/my-redemptions
 * @desc    Get user's redeemed coupons
 * @access  Private
 */
router.get('/my-redemptions', authenticateToken, validatePagination, getMyRedemptions);

/**
 * @route   GET /api/rewards/redemptions/:code
 * @desc    Get redemption by code
 * @access  Private
 */
router.get('/redemptions/:code', authenticateToken, getRedemptionByCode);

/**
 * @route   PATCH /api/rewards/redemptions/:code/use
 * @desc    Mark redemption as used (for partners)
 * @access  Private
 */
router.patch('/redemptions/:code/use', authenticateToken, validateRedemptionUsage, markRedemptionAsUsed);

/**
 * @route   GET /api/rewards/points/opportunities
 * @desc    Get ways to earn points
 * @access  Public
 */
router.get('/points/opportunities', getPointsOpportunities);

module.exports = router;