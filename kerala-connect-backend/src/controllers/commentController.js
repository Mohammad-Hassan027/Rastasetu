const Comment = require('../models/Comment');
const Post = require('../models/Post');

// Get comments for a post
const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Get top-level comments (no parent)
    const comments = await Comment.find({
      post: postId,
      parentComment: null,
      isActive: true
    })
    .populate('author', 'username fullName profilePicture')
    .populate({
      path: 'replies',
      populate: {
        path: 'author',
        select: 'username fullName profilePicture'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Add isLiked field if user is authenticated
    let commentsWithLikeStatus = comments;
    if (req.user) {
      commentsWithLikeStatus = comments.map(comment => {
        const commentObj = comment.toObject();
        commentObj.isLiked = comment.isLikedBy(req.user._id);
        
        // Also check likes for replies
        if (commentObj.replies) {
          commentObj.replies = commentObj.replies.map(reply => {
            reply.isLiked = reply.isLikedBy ? reply.isLikedBy(req.user._id) : false;
            return reply;
          });
        }
        
        return commentObj;
      });
    }

    res.json({
      success: true,
      data: commentsWithLikeStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: comments.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get post comments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comments'
    });
  }
};

// Add comment to post
const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentComment } = req.body;
    const userId = req.user._id;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // If replying to a comment, check if parent comment exists
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent || !parent.isActive) {
        return res.status(404).json({
          success: false,
          error: 'Parent comment not found'
        });
      }
    }

    // Create comment
    const comment = await Comment.create({
      content,
      author: userId,
      post: postId,
      parentComment: parentComment || null
    });

    // If it's a reply, add to parent's replies array
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      await parent.addReply(comment._id);
    }

    // Populate author info
    await comment.populate('author', 'username fullName profilePicture');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: comment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    
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
      error: 'Failed to add comment'
    });
  }
};

// Update comment
const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const comment = await Comment.findById(id);

    if (!comment || !comment.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check if user owns the comment
    if (comment.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this comment'
      });
    }

    // Update content
    comment.content = content;
    await comment.save();

    await comment.populate('author', 'username fullName profilePicture');

    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update comment'
    });
  }
};

// Delete comment
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check if user owns the comment
    if (comment.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this comment'
      });
    }

    // Soft delete - set isActive to false
    comment.isActive = false;
    await comment.save();

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete comment'
    });
  }
};

// Like comment
const likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(id);

    if (!comment || !comment.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    await comment.addLike(userId);

    res.json({
      success: true,
      message: 'Comment liked successfully',
      data: {
        likesCount: comment.likesCount,
        isLiked: true
      }
    });
  } catch (error) {
    console.error('Like comment error:', error);
    
    if (error.message === 'Comment already liked by this user') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to like comment'
    });
  }
};

// Unlike comment
const unlikeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(id);

    if (!comment || !comment.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    await comment.removeLike(userId);

    res.json({
      success: true,
      message: 'Comment unliked successfully',
      data: {
        likesCount: comment.likesCount,
        isLiked: false
      }
    });
  } catch (error) {
    console.error('Unlike comment error:', error);
    
    if (error.message === 'Like not found') {
      return res.status(400).json({
        success: false,
        error: 'Comment not liked by user'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to unlike comment'
    });
  }
};

// Get comment replies
const getCommentReplies = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Check if parent comment exists
    const parentComment = await Comment.findById(id);
    if (!parentComment || !parentComment.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Get replies
    const replies = await Comment.find({
      parentComment: id,
      isActive: true
    })
    .populate('author', 'username fullName profilePicture')
    .sort({ createdAt: 1 }) // Oldest first for replies
    .skip(skip)
    .limit(parseInt(limit));

    // Add isLiked field if user is authenticated
    let repliesWithLikeStatus = replies;
    if (req.user) {
      repliesWithLikeStatus = replies.map(reply => {
        const replyObj = reply.toObject();
        replyObj.isLiked = reply.isLikedBy(req.user._id);
        return replyObj;
      });
    }

    res.json({
      success: true,
      data: repliesWithLikeStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: replies.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get comment replies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get replies'
    });
  }
};

module.exports = {
  getPostComments,
  addComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  getCommentReplies
};