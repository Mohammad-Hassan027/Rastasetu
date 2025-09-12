const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Place name is required'],
    trim: true,
    maxlength: [100, 'Place name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Place description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Beach',
      'Mountains', 
      'Backwaters',
      'Wildlife',
      'Heritage',
      'Adventure',
      'Religious',
      'Cultural',
      'Nature',
      'Urban'
    ]
  },
  location: {
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Coordinates are required'],
        validate: {
          validator: function(coords) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 && // longitude
                   coords[1] >= -90 && coords[1] <= 90;     // latitude
          },
          message: 'Invalid coordinates format'
        }
      }
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters']
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true
    },
    state: {
      type: String,
      default: 'Kerala'
    },
    country: {
      type: String,
      default: 'India'
    }
  },
  images: [{
    url: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: 'Invalid image URL format'
      }
    },
    caption: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    breakdown: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    }
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  features: [{
    type: String,
    enum: [
      'parking',
      'restaurant',
      'accommodation',
      'guided_tours',
      'wheelchair_accessible',
      'family_friendly',
      'adventure_sports',
      'photography',
      'trekking',
      'boating',
      'swimming',
      'wildlife_viewing'
    ]
  }],
  bestTimeToVisit: [{
    month: {
      type: String,
      enum: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]
    },
    description: String
  }],
  entryFee: {
    indian: {
      adult: Number,
      child: Number
    },
    foreign: {
      adult: Number,
      child: Number
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  timings: {
    openTime: String,
    closeTime: String,
    isOpen24Hours: {
      type: Boolean,
      default: false
    },
    weeklyOff: [String]
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  nearbyPlaces: [{
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place'
    },
    distance: Number // in kilometers
  }],
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  stats: {
    views: {
      type: Number,
      default: 0
    },
    postsCount: {
      type: Number,
      default: 0
    },
    checkIns: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Geospatial index for location-based queries
placeSchema.index({ 'location.coordinates': '2dsphere' });
placeSchema.index({ category: 1, 'rating.average': -1 });
placeSchema.index({ district: 1 });
placeSchema.index({ tags: 1 });
placeSchema.index({ isActive: 1, isVerified: 1 });

// Text index for search
placeSchema.index({
  name: 'text',
  description: 'text',
  'location.address': 'text',
  tags: 'text'
});

// Virtual for trending score
placeSchema.virtual('trendingScore').get(function() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const ageInDays = (now - this.updatedAt) / dayMs;
  
  // Base score from ratings and activity
  const baseScore = (this.rating.average * this.rating.count) + 
                   (this.stats.postsCount * 5) + 
                   (this.stats.views * 0.1);
  
  // Decay factor based on recency
  const decayFactor = Math.max(0.1, 1 - (ageInDays / 30)); // Decay over 30 days
  
  return baseScore * decayFactor;
});

// Method to add rating
placeSchema.methods.addRating = async function(rating, userId) {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }
  
  // Check if user already rated this place
  const Review = mongoose.model('Review');
  const existingReview = await Review.findOne({ place: this._id, author: userId });
  
  if (existingReview) {
    // Update existing rating
    const oldRating = existingReview.rating;
    this.rating.breakdown[oldRating] -= 1;
    this.rating.breakdown[rating] += 1;
    
    existingReview.rating = rating;
    await existingReview.save();
  } else {
    // Add new rating
    this.rating.count += 1;
    this.rating.breakdown[rating] += 1;
  }
  
  // Recalculate average
  this.rating.average = this.calculateAverageRating();
  await this.save();
  
  return this.rating;
};

// Method to calculate average rating
placeSchema.methods.calculateAverageRating = function() {
  const breakdown = this.rating.breakdown;
  const totalRatings = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
  
  if (totalRatings === 0) return 0;
  
  const weightedSum = Object.entries(breakdown)
    .reduce((sum, [rating, count]) => sum + (parseInt(rating) * count), 0);
  
  return Math.round((weightedSum / totalRatings) * 10) / 10; // Round to 1 decimal place
};

// Method to increment views
placeSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  await this.save({ validateBeforeSave: false });
  return this;
};

// Method to increment posts count
placeSchema.methods.incrementPostsCount = async function() {
  this.stats.postsCount += 1;
  await this.save({ validateBeforeSave: false });
  return this;
};

// Static method to get places near location
placeSchema.statics.findNearby = function(longitude, latitude, maxDistance = 50000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true
  });
};

// Static method to get trending places
placeSchema.statics.getTrending = function(limit = 10) {
  return this.aggregate([
    {
      $match: {
        isActive: true,
        'rating.count': { $gte: 1 }
      }
    },
    {
      $addFields: {
        daysSinceUpdate: {
          $divide: [
            { $subtract: [new Date(), '$updatedAt'] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $addFields: {
        trendingScore: {
          $multiply: [
            {
              $add: [
                { $multiply: ['$rating.average', '$rating.count'] },
                { $multiply: ['$stats.postsCount', 5] },
                { $multiply: ['$stats.views', 0.1] }
              ]
            },
            {
              $max: [
                0.1,
                { $subtract: [1, { $divide: ['$daysSinceUpdate', 30] }] }
              ]
            }
          ]
        }
      }
    },
    { $sort: { trendingScore: -1 } },
    { $limit: limit },
    {
      $project: {
        daysSinceUpdate: 0,
        trendingScore: 0
      }
    }
  ]);
};

// Static method for text search
placeSchema.statics.searchPlaces = function(query, options = {}) {
  const {
    category,
    district,
    minRating = 0,
    limit = 20,
    skip = 0
  } = options;
  
  const searchQuery = {
    isActive: true,
    'rating.average': { $gte: minRating }
  };
  
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  if (category) {
    searchQuery.category = category;
  }
  
  if (district) {
    searchQuery['location.district'] = new RegExp(district, 'i');
  }
  
  return this.find(searchQuery)
    .sort(query ? { score: { $meta: 'textScore' } } : { 'rating.average': -1 })
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.model('Place', placeSchema);