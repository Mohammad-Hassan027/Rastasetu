const Post = require('../models/Post');
const User = require('../models/User');
const Place = require('../models/Place');

// Get user feed
const getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    // Get posts from users that current user follows + own posts
    const user = await User.findById(userId);
    const followingIds = user.following;
    followingIds.push(userId); // Include own posts

    const posts = await Post.find({
      author: { $in: followingIds },
      isActive: true,
      visibility: { $in: ['public', 'followers'] }
    })
    .populate('author', 'username fullName profilePicture')
    .populate('comments', 'content author createdAt')
    .populate('comments.author', 'username fullName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Add isLiked field for current user
    const postsWithLikeStatus = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLiked = post.isLikedBy(userId);
      return postObj;
    });

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
    console.error('Get feed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feed'
    });
  }
};

// Get trending posts
const getTrendingPosts = async (req, res) => {
  try {
    const { limit = 10, timeframe = 24 } = req.query;
    
    const trendingPosts = await Post.getTrendingPosts(parseInt(limit), parseInt(timeframe));
    
    // Add isLiked field if user is authenticated
    let postsWithLikeStatus = trendingPosts;
    if (req.user) {
      postsWithLikeStatus = trendingPosts.map(post => {
        const postObj = { ...post };
        postObj.isLiked = post.likes.some(like => 
          like.user.toString() === req.user._id.toString()
        );
        return postObj;
      });
    }

    res.json({
      success: true,
      data: postsWithLikeStatus
    });
  } catch (error) {
    console.error('Get trending posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending posts'
    });
  }
};

// Get posts by location
const getPostsByLocation = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10000 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const posts = await Post.getPostsByLocation(
      parseFloat(latitude), 
      parseFloat(longitude), 
      parseInt(radius)
    );

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Get posts by location error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get posts by location'
    });
  }
};

// Get single post
const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await Post.findById(id)
      .populate('author', 'username fullName profilePicture')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username fullName profilePicture'
        }
      });

    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Increment view count
    await post.incrementViews();

    // Add isLiked field if user is authenticated
    const postObj = post.toObject();
    if (req.user) {
      postObj.isLiked = post.isLikedBy(req.user._id);
    }

    res.json({
      success: true,
      data: postObj
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get post'
    });
  }
};

// Create new post
const createPost = async (req, res) => {
  try {
    const { content, images = [], location } = req.body;
    const userId = req.user._id;

    // Create post
    const post = await Post.create({
      author: userId,
      content,
      images,
      location
    });

    // Award points to user for creating post
    await req.user.addPoints(5, 'Post created');

    // If post has location, increment place's post count
    if (location && location.name) {
      // Try to find existing place by name and coordinates
      const place = await Place.findOne({
        name: new RegExp(location.name, 'i'),
        'location.coordinates.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [location.coordinates.longitude, location.coordinates.latitude]
            },
            $maxDistance: 1000 // Within 1km
          }
        }
      });

      if (place) {
        await place.incrementPostsCount();
      }
    }

    // Populate author info
    await post.populate('author', 'username fullName profilePicture');

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: post
    });
  } catch (error) {
    console.error('Create post error:', error);
    
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
      error: 'Failed to create post'
    });
  }
};

// Update post
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, visibility } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(id);

    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check if user owns the post
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this post'
      });
    }

    // Update fields
    if (content !== undefined) post.content = content;
    if (visibility !== undefined) post.visibility = visibility;

    await post.save();

    await post.populate('author', 'username fullName profilePicture');

    res.json({
      success: true,
      message: 'Post updated successfully',
      data: post
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update post'
    });
  }
};

// Delete post
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check if user owns the post
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this post'
      });
    }

    // Soft delete - set isActive to false
    post.isActive = false;
    await post.save();

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete post'
    });
  }
};

// Like post
const likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);

    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    await post.addLike(userId);

    res.json({
      success: true,
      message: 'Post liked successfully',
      data: {
        likesCount: post.likesCount,
        isLiked: true
      }
    });
  } catch (error) {
    console.error('Like post error:', error);
    
    if (error.message === 'Post already liked by this user') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to like post'
    });
  }
};

// Unlike post
const unlikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);

    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    await post.removeLike(userId);

    res.json({
      success: true,
      message: 'Post unliked successfully',
      data: {
        likesCount: post.likesCount,
        isLiked: false
      }
    });
  } catch (error) {
    console.error('Unlike post error:', error);
    
    if (error.message === 'Like not found') {
      return res.status(400).json({
        success: false,
        error: 'Post not liked by user'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to unlike post'
    });
  }
};

// Get user's posts
const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const posts = await Post.find({
      author: userId,
      isActive: true,
      visibility: { $ne: 'private' } // Don't show private posts to others
    })
    .populate('author', 'username fullName profilePicture')
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

module.exports = {
  getFeed,
  getTrendingPosts,
  getPostsByLocation,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getUserPosts
};