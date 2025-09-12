const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Coupon title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Coupon description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9]+$/, 'Coupon code can only contain uppercase letters and numbers']
  },
  discount: {
    type: String,
    required: [true, 'Discount information is required'],
    trim: true,
    maxlength: [50, 'Discount info cannot exceed 50 characters']
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed', 'freebie'],
    required: [true, 'Discount type is required']
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  pointsCost: {
    type: Number,
    required: [true, 'Points cost is required'],
    min: [1, 'Points cost must be at least 1']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'accommodation',
      'dining',
      'transportation',
      'activities',
      'shopping',
      'tours',
      'general'
    ]
  },
  partner: {
    name: {
      type: String,
      required: [true, 'Partner name is required'],
      trim: true
    },
    logo: String,
    contact: {
      phone: String,
      email: String,
      website: String
    }
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required']
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required'],
    validate: {
      validator: function(value) {
        return value > this.validFrom;
      },
      message: 'Valid until date must be after valid from date'
    }
  },
  termsAndConditions: [{
    type: String,
    trim: true,
    maxlength: [200, 'Each term cannot exceed 200 characters']
  }],
  usageLimit: {
    total: {
      type: Number,
      default: null // null means unlimited
    },
    perUser: {
      type: Number,
      default: 1
    }
  },
  location: {
    applicableStates: [{
      type: String,
      default: ['Kerala']
    }],
    specificLocations: [String],
    isOnlineOnly: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  stats: {
    totalRedemptions: {
      type: Number,
      default: 0
    },
    uniqueUsers: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
couponSchema.index({ code: 1 });
couponSchema.index({ category: 1, isActive: 1 });
couponSchema.index({ pointsCost: 1, isActive: 1 });
couponSchema.index({ validUntil: 1, isActive: 1 });
couponSchema.index({ isFeatured: 1, isActive: 1 });

// Virtual for checking if coupon is currently valid
couponSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  return this.isActive && 
         now >= this.validFrom && 
         now <= this.validUntil &&
         (this.usageLimit.total === null || this.stats.totalRedemptions < this.usageLimit.total);
});

// Virtual for days remaining
couponSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const timeDiff = this.validUntil - now;
  return Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
});

// Virtual for usage percentage
couponSchema.virtual('usagePercentage').get(function() {
  if (this.usageLimit.total === null) return 0;
  return Math.round((this.stats.totalRedemptions / this.usageLimit.total) * 100);
});

// Method to check if user can redeem coupon
couponSchema.methods.canBeRedeemedBy = async function(userId) {
  // Check if coupon is currently valid
  if (!this.isCurrentlyValid) {
    return { canRedeem: false, reason: 'Coupon is not currently valid' };
  }
  
  // Check user's redemption count for this coupon
  const CouponRedemption = mongoose.model('CouponRedemption');
  const userRedemptions = await CouponRedemption.countDocuments({
    coupon: this._id,
    user: userId
  });
  
  if (userRedemptions >= this.usageLimit.perUser) {
    return { 
      canRedeem: false, 
      reason: `You have already redeemed this coupon ${this.usageLimit.perUser} time(s)` 
    };
  }
  
  return { canRedeem: true };
};

// Method to redeem coupon
couponSchema.methods.redeemBy = async function(userId, userPoints) {
  // Check if user can redeem
  const redemptionCheck = await this.canBeRedeemedBy(userId);
  if (!redemptionCheck.canRedeem) {
    throw new Error(redemptionCheck.reason);
  }
  
  // Check if user has enough points
  if (userPoints < this.pointsCost) {
    throw new Error('Insufficient points to redeem this coupon');
  }
  
  // Create redemption record
  const CouponRedemption = mongoose.model('CouponRedemption');
  const redemption = await CouponRedemption.create({
    coupon: this._id,
    user: userId,
    pointsSpent: this.pointsCost,
    redeemedAt: new Date(),
    status: 'active'
  });
  
  // Update coupon stats
  const isFirstRedemption = await CouponRedemption.countDocuments({
    coupon: this._id,
    user: userId
  }) === 1;
  
  this.stats.totalRedemptions += 1;
  if (isFirstRedemption) {
    this.stats.uniqueUsers += 1;
  }
  
  await this.save();
  
  return redemption;
};

// Static method to get available coupons for user
couponSchema.statics.getAvailableForUser = async function(userId, userPoints) {
  const now = new Date();
  
  // Get user's redemption counts
  const CouponRedemption = mongoose.model('CouponRedemption');
  const userRedemptions = await CouponRedemption.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$coupon', count: { $sum: 1 } } }
  ]);
  
  const redemptionMap = {};
  userRedemptions.forEach(r => {
    redemptionMap[r._id.toString()] = r.count;
  });
  
  // Find available coupons
  const coupons = await this.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    pointsCost: { $lte: userPoints }
  }).sort({ isFeatured: -1, pointsCost: 1 });
  
  // Filter out coupons that user has already redeemed max times
  return coupons.filter(coupon => {
    const userCount = redemptionMap[coupon._id.toString()] || 0;
    return userCount < coupon.usageLimit.perUser &&
           (coupon.usageLimit.total === null || coupon.stats.totalRedemptions < coupon.usageLimit.total);
  });
};

// Static method to get featured coupons
couponSchema.statics.getFeatured = function(limit = 5) {
  const now = new Date();
  
  return this.find({
    isActive: true,
    isFeatured: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  })
  .sort({ pointsCost: 1 })
  .limit(limit);
};

module.exports = mongoose.model('Coupon', couponSchema);