const mongoose = require('mongoose');

const pointsTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  points: {
    type: Number,
    required: [true, 'Points amount is required'],
    validate: {
      validator: function(value) {
        return value !== 0;
      },
      message: 'Points amount cannot be zero'
    }
  },
  type: {
    type: String,
    enum: ['earned', 'spent', 'bonus', 'penalty'],
    required: [true, 'Transaction type is required']
  },
  reason: {
    type: String,
    required: [true, 'Transaction reason is required'],
    trim: true,
    maxlength: [100, 'Reason cannot exceed 100 characters']
  },
  category: {
    type: String,
    enum: [
      'post_creation',
      'post_liked',
      'comment_posted',
      'comment_liked',
      'daily_login',
      'profile_completion',
      'coupon_redemption',
      'admin_bonus',
      'referral',
      'achievement',
      'other'
    ],
    default: 'other'
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['Post', 'Comment', 'Coupon', 'User'],
      default: null
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  balanceAfter: {
    type: Number,
    required: [true, 'Balance after transaction is required'],
    min: [0, 'Balance cannot be negative']
  },
  metadata: {
    source: String,
    ipAddress: String,
    userAgent: String,
    adminNote: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: [true, 'Timestamp is required']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
pointsTransactionSchema.index({ user: 1, timestamp: -1 });
pointsTransactionSchema.index({ type: 1, timestamp: -1 });
pointsTransactionSchema.index({ category: 1, timestamp: -1 });
pointsTransactionSchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 });

// Virtual for absolute points value
pointsTransactionSchema.virtual('absolutePoints').get(function() {
  return Math.abs(this.points);
});

// Virtual for transaction description
pointsTransactionSchema.virtual('description').get(function() {
  const pointsText = this.points > 0 ? `+${this.points}` : `${this.points}`;
  return `${pointsText} points - ${this.reason}`;
});

// Static method to get user's transaction history
pointsTransactionSchema.statics.getUserHistory = function(userId, options = {}) {
  const {
    type,
    category,
    limit = 50,
    skip = 0,
    startDate,
    endDate
  } = options;
  
  const query = { user: userId, isActive: true };
  
  if (type) query.type = type;
  if (category) query.category = category;
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('relatedEntity.entityId');
};

// Static method to get user's points summary
pointsTransactionSchema.statics.getUserPointsSummary = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const summary = await this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate },
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        totalEarned: {
          $sum: {
            $cond: [{ $gt: ['$points', 0] }, '$points', 0]
          }
        },
        totalSpent: {
          $sum: {
            $cond: [{ $lt: ['$points', 0] }, { $abs: '$points' }, 0]
          }
        },
        transactionCount: { $sum: 1 },
        categories: {
          $push: {
            category: '$category',
            points: '$points'
          }
        }
      }
    }
  ]);
  
  return summary[0] || {
    totalEarned: 0,
    totalSpent: 0,
    transactionCount: 0,
    categories: []
  };
};

// Static method to get points leaderboard
pointsTransactionSchema.statics.getLeaderboard = function(limit = 10, timeframe = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        type: 'earned',
        isActive: true
      }
    },
    {
      $group: {
        _id: '$user',
        totalEarned: { $sum: '$points' }
      }
    },
    { $sort: { totalEarned: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              profilePicture: 1,
              points: 1
            }
          }
        ]
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        user: '$user',
        earnedInPeriod: '$totalEarned'
      }
    }
  ]);
};

// Method to create transaction with validation
pointsTransactionSchema.statics.createTransaction = async function(transactionData) {
  const {
    userId,
    points,
    type,
    reason,
    category,
    relatedEntity,
    metadata
  } = transactionData;
  
  // Get current user to validate balance
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Calculate new balance
  const newBalance = user.points + points;
  
  if (newBalance < 0) {
    throw new Error('Insufficient points for this transaction');
  }
  
  // Create transaction
  const transaction = await this.create({
    user: userId,
    points,
    type,
    reason,
    category: category || 'other',
    relatedEntity,
    balanceAfter: newBalance,
    metadata,
    timestamp: new Date()
  });
  
  return transaction;
};

module.exports = mongoose.model('PointsTransaction', pointsTransactionSchema);