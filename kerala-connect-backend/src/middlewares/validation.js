const { body, param, query, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: formattedErrors
    });
  }
  
  next();
};

// User validation rules
const validateSignup = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),
  
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

const validateUpdateProfile = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  
  handleValidationErrors
];

// Post validation rules
const validateCreatePost = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Content must be between 1 and 1000 characters'),
  
  body('images')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 images allowed'),
  
  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL'),
  
  body('location.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location name cannot exceed 100 characters'),
  
  body('location.coordinates.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('location.coordinates.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  handleValidationErrors
];

const validateUpdatePost = [
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Content must be between 1 and 1000 characters'),
  
  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Visibility must be public, followers, or private'),
  
  handleValidationErrors
];

// Comment validation rules
const validateCreateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters'),
  
  body('parentComment')
    .optional()
    .isMongoId()
    .withMessage('Parent comment must be a valid ID'),
  
  handleValidationErrors
];

const validateUpdateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters'),
  
  handleValidationErrors
];

// Place validation rules
const validateCreatePlace = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Place name must be between 2 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('category')
    .isIn(['Beach', 'Mountains', 'Backwaters', 'Wildlife', 'Heritage', 'Adventure', 'Religious', 'Cultural', 'Nature', 'Urban'])
    .withMessage('Invalid category'),
  
  body('location.coordinates.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be [longitude, latitude]'),
  
  body('location.coordinates.coordinates.0')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('location.coordinates.coordinates.1')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('location.address')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  
  body('location.district')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('District must be between 2 and 50 characters'),
  
  handleValidationErrors
];

// Coupon validation rules
const validateCreateCoupon = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('code')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Code can only contain uppercase letters and numbers'),
  
  body('discount')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Discount info must be between 1 and 50 characters'),
  
  body('discountType')
    .isIn(['percentage', 'fixed', 'freebie'])
    .withMessage('Discount type must be percentage, fixed, or freebie'),
  
  body('discountValue')
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a positive number'),
  
  body('pointsCost')
    .isInt({ min: 1 })
    .withMessage('Points cost must be at least 1'),
  
  body('category')
    .isIn(['accommodation', 'dining', 'transportation', 'activities', 'shopping', 'tours', 'general'])
    .withMessage('Invalid category'),
  
  body('partner.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Partner name must be between 2 and 100 characters'),
  
  body('validFrom')
    .isISO8601()
    .withMessage('Valid from must be a valid date'),
  
  body('validUntil')
    .isISO8601()
    .withMessage('Valid until must be a valid date'),
  
  handleValidationErrors
];

// Parameter validation
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`${paramName} must be a valid ID`),
  
  handleValidationErrors
];

// Query validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

const validateLocationQuery = [
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  query('radius')
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage('Radius must be between 1 and 100000 meters'),
  
  handleValidationErrors
];

const validateSearchQuery = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('category')
    .optional()
    .isIn(['Beach', 'Mountains', 'Backwaters', 'Wildlife', 'Heritage', 'Adventure', 'Religious', 'Cultural', 'Nature', 'Urban'])
    .withMessage('Invalid category'),
  
  handleValidationErrors
];

const validateRating = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('review')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Review cannot exceed 500 characters'),
  
  handleValidationErrors
];

const validateRedemptionUsage = [
  body('usedBy')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Used by field must be between 2 and 100 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Notes cannot exceed 200 characters'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateSignup,
  validateLogin,
  validateUpdateProfile,
  validateCreatePost,
  validateUpdatePost,
  validateCreateComment,
  validateUpdateComment,
  validateCreatePlace,
  validateCreateCoupon,
  validateObjectId,
  validatePagination,
  validateLocationQuery,
  validateSearchQuery,
  validateRating,
  validateRedemptionUsage
};
