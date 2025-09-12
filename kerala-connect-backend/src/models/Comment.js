const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Comment author is required']
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Post reference is required']
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null // null for top-level comments
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
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
  isActive: {
    type: Boolean,
    default: true
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
commentSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

commentSchema.virtual('repliesCount').get(function() {
  return this.replies.length;
});

// Indexes
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });

// Method to check if user has liked the comment
commentSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to add like to comment
commentSchema.methods.addLike = async function(userId) {
  if (this.isLikedBy(userId)) {
    throw new Error('Comment already liked by this user');
  }
  
  this.likes.push({
    user: userId,
    createdAt: new Date()
  });
  
  await this.save();
  
  // Award points to comment author (but not to self)
  if (this.author.toString() !== userId.toString()) {
    const User = mongoose.model('User');
    const author = await User.findById(this.author);
    if (author) {
      await author.addPoints(1, 'Comment liked');
    }
  }
  
  return this;
};

// Method to remove like from comment
commentSchema.methods.removeLike = async function(userId) {
  const initialLength = this.likes.length;
  this.likes = this.likes.filter(like => 
    like.user.toString() !== userId.toString()
  );
  
  if (this.likes.length === initialLength) {
    throw new Error('Like not found');
  }
  
  await this.save();
  return this;
};

// Method to add reply
commentSchema.methods.addReply = async function(replyId) {
  this.replies.push(replyId);
  await this.save();
  return this;
};

// Pre-save middleware
commentSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

// Post-save middleware to award points and update post
commentSchema.post('save', async function(doc) {
  if (doc.isNew && !doc.parentComment) {
    // Award points to comment author for new top-level comment
    const User = mongoose.model('User');
    const author = await User.findById(doc.author);
    if (author) {
      await author.addPoints(1, 'Comment posted');
    }
    
    // Add comment reference to post
    const Post = mongoose.model('Post');
    await Post.findByIdAndUpdate(
      doc.post,
      { $push: { comments: doc._id } }
    );
  }
});

module.exports = mongoose.model('Comment', commentSchema);