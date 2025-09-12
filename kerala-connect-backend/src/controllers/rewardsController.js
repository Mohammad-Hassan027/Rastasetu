const Coupon = require('../models/Coupon');
const CouponRedemption = require('../models/CouponRedemption');
const User = require('../models/User');
const PointsTransaction = require('../models/PointsTransaction');

// Get available coupons for user
const getAvailableCoupons = async (req, res) => {
  try {
    const { category, minPoints, maxPoints, featured } = req.query;
    const userId = req.user._id;
    const user = await User.findById(userId);

    let query = {
      isActive: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() }
    };

    // Apply filters
    if (category) query.category = category;
    if (minPoints) query.pointsCost = { ...query.pointsCost, $gte: parseInt(minPoints) };
    if (maxPoints) query.pointsCost = { ...query.pointsCost, $lte: parseInt(maxPoints) };
    if (featured === 'true') query.isFeatured = true;

    const coupons = await Coupon.getAvailableForUser(userId, user.points);

    res.json({
      success: true,
      data: {
        coupons,
        userPoints: user.points
      }
    });
  } catch (error) {
    console.error('Get available coupons error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available coupons'
    });
  }
};

// Get featured coupons
const getFeaturedCoupons = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const coupons = await Coupon.getFeatured(parseInt(limit));

    res.json({
      success: true,
      data: coupons
    });
  } catch (error) {
    console.error('Get featured coupons error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get featured coupons'
    });
  }
};

// Get coupon by ID
const getCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const user = await User.findById(userId);

    const coupon = await Coupon.findById(id);

    if (!coupon || !coupon.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    // Check if user can redeem
    const redemptionCheck = await coupon.canBeRedeemedBy(userId);

    // Add user-specific info
    const couponObj = coupon.toObject();
    couponObj.canRedeem = redemptionCheck.canRedeem;
    couponObj.redemptionReason = redemptionCheck.reason;
    couponObj.userHasPoints = user.points >= coupon.pointsCost;

    res.json({
      success: true,
      data: couponObj
    });
  } catch (error) {
    console.error('Get coupon error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get coupon'
    });
  }
};

// Redeem coupon
const redeemCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const user = await User.findById(userId);

    const coupon = await Coupon.findById(id);

    if (!coupon || !coupon.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    // Redeem coupon (this will handle all validations)
    const redemption = await coupon.redeemBy(userId, user.points);

    // Deduct points from user
    await user.deductPoints(coupon.pointsCost, `Redeemed coupon: ${coupon.title}`);

    // Set expiration date for redemption (30 days from redemption)
    redemption.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await redemption.save();

    // Populate coupon details
    await redemption.populate('coupon', 'title description discount partner');

    res.json({
      success: true,
      message: 'Coupon redeemed successfully',
      data: redemption
    });
  } catch (error) {
    console.error('Redeem coupon error:', error);
    
    if (error.message.includes('insufficient') || 
        error.message.includes('already redeemed') || 
        error.message.includes('not currently valid')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to redeem coupon'
    });
  }
};

// Get user's redeemed coupons
const getMyRedemptions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { user: userId };
    if (status && ['active', 'used', 'expired'].includes(status)) {
      query.status = status;
    }

    const redemptions = await CouponRedemption.find(query)
      .populate('coupon', 'title description discount partner validUntil')
      .sort({ redeemedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Check and update expired redemptions
    const updatedRedemptions = await Promise.all(
      redemptions.map(async (redemption) => {
        redemption.checkExpiration();
        return redemption;
      })
    );

    res.json({
      success: true,
      data: updatedRedemptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: redemptions.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get my redemptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get redemptions'
    });
  }
};

// Get redemption by code
const getRedemptionByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user._id;

    const redemption = await CouponRedemption.findOne({
      redemptionCode: code,
      user: userId
    }).populate('coupon', 'title description discount partner termsAndConditions');

    if (!redemption) {
      return res.status(404).json({
        success: false,
        error: 'Redemption not found'
      });
    }

    // Check expiration
    redemption.checkExpiration();

    res.json({
      success: true,
      data: redemption
    });
  } catch (error) {
    console.error('Get redemption by code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get redemption'
    });
  }
};

// Mark redemption as used (for partners)
const markRedemptionAsUsed = async (req, res) => {
  try {
    const { code } = req.params;
    const { location, transactionId, notes } = req.body;

    const redemption = await CouponRedemption.findOne({
      redemptionCode: code,
      status: 'active'
    }).populate('coupon');

    if (!redemption) {
      return res.status(404).json({
        success: false,
        error: 'Active redemption not found'
      });
    }

    // Check if still valid
    if (new Date() > redemption.expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'Redemption has expired'
      });
    }

    await redemption.markAsUsed({
      location,
      transactionId,
      notes,
      partner: redemption.coupon.partner.name
    });

    res.json({
      success: true,
      message: 'Redemption marked as used successfully',
      data: redemption
    });
  } catch (error) {
    console.error('Mark redemption as used error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark redemption as used'
    });
  }
};

// Get coupon categories
const getCouponCategories = async (req, res) => {
  try {
    const categories = await Coupon.distinct('category', { 
      isActive: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() }
    });

    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await Coupon.countDocuments({
          category,
          isActive: true,
          validFrom: { $lte: new Date() },
          validUntil: { $gte: new Date() }
        });
        return { name: category, count };
      })
    );

    res.json({
      success: true,
      data: categoriesWithCount
    });
  } catch (error) {
    console.error('Get coupon categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories'
    });
  }
};

// Get points earning opportunities
const getPointsOpportunities = async (req, res) => {
  try {
    const opportunities = [
      { action: 'Sign up', points: 100, description: 'Welcome bonus for new users' },
      { action: 'Create post', points: 5, description: 'Share your travel experiences' },
      { action: 'Like post', points: 1, description: 'Engage with community content' },
      { action: 'Comment on post', points: 2, description: 'Join the conversation' },
      { action: 'Follow user', points: 5, description: 'Connect with other travelers' },
      { action: 'Get followed', points: 10, description: 'Build your travel network' },
      { action: 'Post gets 10 likes', points: 20, description: 'Create popular content' },
      { action: 'Post gets 50 likes', points: 50, description: 'Viral content bonus' },
      { action: 'Visit new place', points: 15, description: 'Explore Kerala destinations' },
      { action: 'Check-in at location', points: 10, description: 'Share your travel location' }
    ];

    res.json({
      success: true,
      data: opportunities
    });
  } catch (error) {
    console.error('Get points opportunities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get points opportunities'
    });
  }
};

module.exports = {
  getAvailableCoupons,
  getFeaturedCoupons,
  getCoupon,
  redeemCoupon,
  getMyRedemptions,
  getRedemptionByCode,
  markRedemptionAsUsed,
  getCouponCategories,
  getPointsOpportunities
};