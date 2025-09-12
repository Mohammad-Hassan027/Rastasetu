const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    maxlength: [1000, 'Content cannot exceed 1000 characters'],
    trim: true
  },
  images: [{
    type: String, // URLs to uploaded images
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  }],
  location: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Location name cannot exceed 100 characters']
    },
    coordinates: {
      latitude: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      }
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters']
    }
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  visibility: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  engagement: {
    views: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
postSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

postSchema.virtual('commentsCount').get(function() {
  return this.comments.length;
});

// Calculate engagement score for trending
postSchema.virtual('engagementScore').get(function() {
  const hoursOld = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  const baseScore = this.likesCount * 2 + this.commentsCount * 3 + this.engagement.views * 0.1;
  
  // Decay engagement score over time
  const decayFactor = Math.max(0.1, 1 - (hoursOld / 168)); // Decay over 1 week
  return baseScore * decayFactor;
});

// Indexes for better performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial index
postSchema.index({ tags: 1 });
postSchema.index({ visibility: 1 });
postSchema.index({ isActive: 1 });

// Compound index for feed queries
postSchema.index({ 
  isActive: 1, 
  visibility: 1, 
  createdAt: -1 
});

// Method to check if user has liked the post
postSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to add like
postSchema.methods.addLike = async function(userId) {
  // Check if already liked
  if (this.isLikedBy(userId)) {
    throw new Error('Post already liked by this user');
  }
  
  // Add like
  this.likes.push({
    user: userId,
    createdAt: new Date()
  });
  
  await this.save();
  
  // Award points to post author (but not to self)
  if (this.author.toString() !== userId.toString()) {
    const User = mongoose.model('User');
    const author = await User.findById(this.author);
    if (author) {
      await author.addPoints(2, 'Post liked');
    }
  }
  
  return this;
};

// Method to remove like
postSchema.methods.removeLike = async function(userId) {
  const initialLength = this.likes.length;
  this.likes = this.likes.filter(like => 
    like.user.toString() !== userId.toString()
  );
  
  if (this.likes.length === initialLength) {
    throw new Error('Like not found');
  }
  
  await this.save();
  
  // Deduct points from post author (but not from self)
  if (this.author.toString() !== userId.toString()) {
    const User = mongoose.model('User');
    const author = await User.findById(this.author);
    if (author && author.points >= 2) {
      await author.deductPoints(2, 'Post unlike');
    }
  }
  
  return this;
};

// Method to add comment
postSchema.methods.addComment = async function(commentId) {
  this.comments.push(commentId);
  await this.save();
  
  // Award points to post author
  const User = mongoose.model('User');
  const author = await User.findById(this.author);
  if (author) {
    await author.addPoints(3, 'Post commented');
  }
  
  return this;
};

// Method to increment view count
postSchema.methods.incrementViews = async function() {
  this.engagement.views += 1;
  await this.save({ validateBeforeSave: false });
  return this;
};

// Static method to get trending posts
postSchema.statics.getTrendingPosts = function(limit = 10, timeframe = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - timeframe);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        isActive: true,
        visibility: 'public'
      }
    },
    {
      $addFields: {
        likesCount: { $size: '$likes' },
        commentsCount: { $size: '$comments' },
        hoursOld: {
          $divide: [
            { $subtract: [new Date(), '$createdAt'] },
            3600000 // Convert to hours
          ]
        }
      }
    },
    {
      $addFields: {
        engagementScore: {
          $multiply: [
            {
              $add: [
                { $multiply: ['$likesCount', 2] },
                { $multiply: ['$commentsCount', 3] },
                { $multiply: ['$engagement.views', 0.1] }
              ]
            },
            {
              $max: [
                0.1,
                { $subtract: [1, { $divide: ['$hoursOld', 168] }] }
              ]
            }
          ]
        }
      }
    },
    { $sort: { engagementScore: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'author',
        pipeline: [
          { $project: { password: 0, email: 0 } }
        ]
      }
    },
    { $unwind: '$author' }
  ]);
};

// Static method to get posts by location
postSchema.statics.getPostsByLocation = function(latitude, longitude, radius = 10000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: radius
      }
    },
    isActive: true,
    visibility: 'public'
  })
  .populate('author', '-password -email')
  .sort({ createdAt: -1 });
};

// Pre-save middleware
postSchema.pre('save', function(next) {
  // Auto-generate tags from content
  if (this.isModified('content')) {
    const hashtags = this.content.match(/#[\w]+/g);
    if (hashtags) {
      this.tags = hashtags.map(tag => tag.slice(1).toLowerCase());
    }
  }
  next();
});

module.exports = mongoose.model('Post', postSchema);