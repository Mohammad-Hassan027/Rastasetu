const User = require('../models/User');
const Post = require('../models/Post');
const PointsTransaction = require('../models/PointsTransaction');

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password -refreshToken')
      .populate('followers', 'username fullName profilePicture')
      .populate('following', 'username fullName profilePicture');

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
};

// Get current user profile
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -refreshToken')
      .populate('followers', 'username fullName profilePicture')
      .populate('following', 'username fullName profilePicture');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fullName, bio, profilePicture, website, location } = req.body;

    const user = await User.findById(userId);

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update fields
    if (fullName !== undefined) user.fullName = fullName;
    if (bio !== undefined) user.bio = bio;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (website !== undefined) user.website = website;
    if (location !== undefined) user.location = location;

    await user.save();

    // Return updated user without sensitive fields
    const updatedUser = await User.findById(userId)
      .select('-password -refreshToken');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};

// Follow user
const followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot follow yourself'
      });
    }

    const userToFollow = await User.findById(userId);
    if (!userToFollow || !userToFollow.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const currentUser = await User.findById(currentUserId);

    // Check if already following
    if (currentUser.following.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Already following this user'
      });
    }

    // Add to following and followers arrays
    currentUser.following.push(userId);
    userToFollow.followers.push(currentUserId);

    await currentUser.save();
    await userToFollow.save();

    // Award points for following
    await currentUser.addPoints(5, 'follow');
    await userToFollow.addPoints(10, 'followed');

    // Log points transactions
    await PointsTransaction.create({
      user: currentUserId,
      amount: 5,
      type: 'earned',
      reason: 'follow',
      description: `Followed ${userToFollow.fullName || userToFollow.username}`
    });

    await PointsTransaction.create({
      user: userId,
      amount: 10,
      type: 'earned',
      reason: 'followed',
      description: `Followed by ${currentUser.fullName || currentUser.username}`
    });

    res.json({
      success: true,
      message: 'User followed successfully',
      data: {
        isFollowing: true,
        followersCount: userToFollow.followers.length
      }
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to follow user'
    });
  }
};

// Unfollow user
const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot unfollow yourself'
      });
    }

    const userToUnfollow = await User.findById(userId);
    if (!userToUnfollow || !userToUnfollow.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const currentUser = await User.findById(currentUserId);

    // Check if following
    if (!currentUser.following.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Not following this user'
      });
    }

    // Remove from following and followers arrays
    currentUser.following.pull(userId);
    userToUnfollow.followers.pull(currentUserId);

    await currentUser.save();
    await userToUnfollow.save();

    res.json({
      success: true,
      message: 'User unfollowed successfully',
      data: {
        isFollowing: false,
        followersCount: userToUnfollow.followers.length
      }
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unfollow user'
    });
  }
};

// Get user followers
const getUserFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId)
      .populate({
        path: 'followers',
        select: 'username fullName profilePicture bio',
        options: {
          skip,
          limit: parseInt(limit)
        }
      });

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Add isFollowing status if current user is authenticated
    let followers = user.followers;
    if (req.user) {
      followers = user.followers.map(follower => {
        const followerObj = follower.toObject();
        followerObj.isFollowing = req.user.following.includes(follower._id);
        return followerObj;
      });
    }

    res.json({
      success: true,
      data: followers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: followers.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user followers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get followers'
    });
  }
};

// Get user following
const getUserFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId)
      .populate({
        path: 'following',
        select: 'username fullName profilePicture bio',
        options: {
          skip,
          limit: parseInt(limit)
        }
      });

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Add isFollowing status if current user is authenticated
    let following = user.following;
    if (req.user) {
      following = user.following.map(followedUser => {
        const followedUserObj = followedUser.toObject();
        followedUserObj.isFollowing = req.user.following.includes(followedUser._id);
        return followedUserObj;
      });
    }

    res.json({
      success: true,
      data: following,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: following.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user following error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get following'
    });
  }
};

// Get user posts
const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const posts = await Post.find({
      author: userId,
      isActive: true
    })
    .populate('author', 'username fullName profilePicture')
    .populate('location', 'name coordinates')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Add isLiked field if current user is authenticated
    let postsWithLikeStatus = posts;
    if (req.user) {
      postsWithLikeStatus = posts.map(post => {
        const postObj = post.toObject();
        postObj.isLiked = post.isLikedBy(req.user._id);
        return postObj;
      });
    }

    res.json({
      success: true,
      data: postsWithLikeStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: posts.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user posts'
    });
  }
};

// Search users
const searchUsers = async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }

    const searchRegex = new RegExp(query.trim(), 'i');

    const users = await User.find({
      isActive: true,
      $or: [
        { username: searchRegex },
        { fullName: searchRegex },
        { bio: searchRegex }
      ]
    })
    .select('username fullName profilePicture bio followers following')
    .sort({ followers: -1, fullName: 1 }) // Sort by follower count, then name
    .skip(skip)
    .limit(parseInt(limit));

    // Add isFollowing status if current user is authenticated
    let usersWithFollowStatus = users;
    if (req.user) {
      usersWithFollowStatus = users.map(user => {
        const userObj = user.toObject();
        userObj.isFollowing = req.user.following.includes(user._id);
        userObj.followersCount = user.followers.length;
        userObj.followingCount = user.following.length;
        // Remove followers/following arrays for cleaner response
        delete userObj.followers;
        delete userObj.following;
        return userObj;
      });
    }

    res.json({
      success: true,
      data: usersWithFollowStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: users.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
};

// Get user points and transactions
const getUserPoints = async (req, res) => {
  try {
    const userId = req.user._id; // Only allow users to see their own points
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).select('points');

    const transactions = await PointsTransaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        totalPoints: user.points,
        transactions: transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: transactions.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user points error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get points'
    });
  }
};

// Get leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const { timeframe = 'all', limit = 20 } = req.query;

    let leaderboard;

    if (timeframe === 'all') {
      // All-time leaderboard based on total points
      leaderboard = await User.find({ isActive: true })
        .select('username fullName profilePicture points')
        .sort({ points: -1 })
        .limit(parseInt(limit));
    } else {
      // Weekly/monthly leaderboard based on points transactions
      const now = new Date();
      let startDate;
      
      if (timeframe === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeframe === 'month') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid timeframe. Use: all, week, or month'
        });
      }

      leaderboard = await PointsTransaction.getLeaderboard(startDate, parseInt(limit));
    }

    res.json({
      success: true,
      data: leaderboard,
      timeframe
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    });
  }
};

module.exports = {
  getUserProfile,
  getMyProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing,
  getUserPosts,
  searchUsers,
  getUserPoints,
  getLeaderboard
};