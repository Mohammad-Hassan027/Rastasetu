const express = require('express');
const router = express.Router();

// Controllers
const {
  getPlaces,
  getTrendingPlaces,
  getPlace,
  getNearbyPlaces,
  getPlaceCategories,
  getPlaceDistricts,
  getPlacePosts,
  ratePlace,
  checkInAtPlace,
  getPopularDestinations
} = require('../controllers/placesController');

// Middlewares
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const {
  validateObjectId,
  validatePagination,
  validateLocationQuery,
  validateRating
} = require('../middlewares/validation');

/**
 * @route   GET /api/places
 * @desc    Get all places with filters
 * @access  Public
 */
router.get('/', validatePagination, getPlaces);

/**
 * @route   GET /api/places/trending
 * @desc    Get trending places
 * @access  Public
 */
router.get('/trending', getTrendingPlaces);

/**
 * @route   GET /api/places/popular
 * @desc    Get popular destinations
 * @access  Public
 */
router.get('/popular', getPopularDestinations);

/**
 * @route   GET /api/places/nearby
 * @desc    Get places nearby a location
 * @access  Public
 */
router.get('/nearby', validateLocationQuery, getNearbyPlaces);

/**
 * @route   GET /api/places/categories
 * @desc    Get place categories with count
 * @access  Public
 */
router.get('/categories', getPlaceCategories);

/**
 * @route   GET /api/places/districts
 * @desc    Get place districts with count
 * @access  Public
 */
router.get('/districts', getPlaceDistricts);

/**
 * @route   GET /api/places/:id
 * @desc    Get place by ID
 * @access  Public
 */
router.get('/:id', validateObjectId('id'), getPlace);

/**
 * @route   GET /api/places/:id/posts
 * @desc    Get posts for a specific place
 * @access  Public (but enhanced with auth)
 */
router.get('/:id/posts', optionalAuth, validateObjectId('id'), validatePagination, getPlacePosts);

/**
 * @route   POST /api/places/:id/rate
 * @desc    Rate a place
 * @access  Private
 */
router.post('/:id/rate', authenticateToken, validateObjectId('id'), validateRating, ratePlace);

/**
 * @route   POST /api/places/:id/checkin
 * @desc    Check in at a place
 * @access  Private
 */
router.post('/:id/checkin', authenticateToken, validateObjectId('id'), checkInAtPlace);

module.exports = router;