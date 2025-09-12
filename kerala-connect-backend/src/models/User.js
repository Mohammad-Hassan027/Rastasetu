const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  profilePicture: {
    type: String,
    default: null
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  points: {
    type: Number,
    default: 0,
    min: [0, 'Points cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
userSchema.virtual('followersCount').get(function() {
  return this.followers.length;
});

userSchema.virtual('followingCount').get(function() {
  return this.following.length;
});

userSchema.virtual('postsCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'author',
  count: true
});

// Indexes for better performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ points: -1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to add points
userSchema.methods.addPoints = async function(points, reason = 'Activity') {
  this.points += points;
  await this.save();
  
  // Log the points transaction
  const PointsTransaction = mongoose.model('PointsTransaction');
  await PointsTransaction.create({
    user: this._id,
    points,
    type: 'earned',
    reason,
    timestamp: new Date()
  });
  
  return this.points;
};

// Method to deduct points
userSchema.methods.deductPoints = async function(points, reason = 'Redemption') {
  if (this.points < points) {
    throw new Error('Insufficient points');
  }
  
  this.points -= points;
  await this.save();
  
  // Log the points transaction
  const PointsTransaction = mongoose.model('PointsTransaction');
  await PointsTransaction.create({
    user: this._id,
    points,
    type: 'spent',
    reason,
    timestamp: new Date()
  });
  
  return this.points;
};

// Method to get user profile data (exclude sensitive info)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.email;
  return userObject;
};

// Method to get user's own profile data
userSchema.methods.getPrivateProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Static method to find users by search query
userSchema.statics.searchUsers = function(query, limit = 20) {
  return this.find({
    $or: [
      { username: new RegExp(query, 'i') },
      { fullName: new RegExp(query, 'i') }
    ],
    isActive: true
  })
  .select('-password -email')
  .limit(limit);
};

module.exports = mongoose.model('User', userSchema);