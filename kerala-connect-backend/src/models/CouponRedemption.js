const mongoose = require('mongoose');

const couponRedemptionSchema = new mongoose.Schema({
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: [true, 'Coupon reference is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  pointsSpent: {
    type: Number,
    required: [true, 'Points spent is required'],
    min: [1, 'Points spent must be at least 1']
  },
  redeemedAt: {
    type: Date,
    required: [true, 'Redeemed date is required'],
    default: Date.now
  },
  usedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired'],
    default: 'active'
  },
  redemptionCode: {
    type: String,
    unique: true,
    required: [true, 'Redemption code is required']
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required']
  },
  usageDetails: {
    location: String,
    partner: String,
    transactionId: String,
    notes: String
  }
}, {
  timestamps: true
});

// Indexes
couponRedemptionSchema.index({ user: 1, redeemedAt: -1 });
couponRedemptionSchema.index({ coupon: 1, user: 1 });
couponRedemptionSchema.index({ redemptionCode: 1 });
couponRedemptionSchema.index({ status: 1, expiresAt: 1 });

// Generate unique redemption code
couponRedemptionSchema.pre('save', function(next) {
  if (this.isNew && !this.redemptionCode) {
    this.redemptionCode = generateRedemptionCode();
  }
  next();
});

// Method to mark as used
couponRedemptionSchema.methods.markAsUsed = async function(usageDetails = {}) {
  this.status = 'used';
  this.usedAt = new Date();
  this.usageDetails = { ...this.usageDetails, ...usageDetails };
  await this.save();
  return this;
};

// Method to check if expired
couponRedemptionSchema.methods.checkExpiration = function() {
  if (this.status === 'active' && new Date() > this.expiresAt) {
    this.status = 'expired';
    this.save();
  }
  return this.status;
};

// Generate unique redemption code
function generateRedemptionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports = mongoose.model('CouponRedemption', couponRedemptionSchema);