const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  // Basic Information
  googleId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  profilePicture: {
    type: String, // URL to profile picture
    default: null
  },
  
  // User Role and Status
  userType: {
    type: String,
    enum: ['superadmin', 'family_creator', 'family_member'],
    default: 'family_member'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Primary Family Association (simplified - one user, one family)
  primaryFamily: {
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      default: null
    },
    role: {
      type: String,
      enum: ['creator', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended'],
      default: 'pending'
    }
  },
  
  // Payment Information (for family admins)
  paymentInfo: {
    customerId: String, // Razorpay customer ID
    subscriptionId: String, // Razorpay subscription ID
    subscriptionStatus: {
      type: String,
      enum: ['trial', 'active', 'expired', 'cancelled'],
      default: 'trial'
    },
    trialEndsAt: {
      type: Date,
      default: function() {
        // 1 year trial from account creation
        return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }
    },
    subscriptionEndsAt: Date,
    lastPaymentDate: Date,
    nextPaymentDate: Date
  },
  
  // Security and Activity
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Preferences
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      familyUpdates: {
        type: Boolean,
        default: true
      },
      paymentReminders: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'family_only', 'private'],
        default: 'family_only'
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
UserSchema.index({ email: 1, googleId: 1 });
UserSchema.index({ 'familyMemberships.familyId': 1 });
UserSchema.index({ userType: 1, isActive: 1 });
UserSchema.index({ 'paymentInfo.subscriptionStatus': 1 });

// Virtual for checking if user has a family
UserSchema.virtual('hasFamily').get(function() {
  return this.primaryFamily && this.primaryFamily.familyId;
});

// Virtual for checking if user is family creator
UserSchema.virtual('isFamilyCreator').get(function() {
  return this.primaryFamily && this.primaryFamily.role === 'creator';
});

// Virtual for checking if subscription is active
UserSchema.virtual('hasActiveSubscription').get(function() {
  if (this.userType !== 'family_admin') return false;
  
  const now = new Date();
  return (
    this.paymentInfo.subscriptionStatus === 'trial' && this.paymentInfo.trialEndsAt > now
  ) || (
    this.paymentInfo.subscriptionStatus === 'active' && this.paymentInfo.subscriptionEndsAt > now
  );
});

// Methods
UserSchema.methods.addToFamily = function(familyId, role, invitedBy) {
  const existingMembership = this.familyMemberships.find(
    membership => membership.familyId.toString() === familyId.toString()
  );
  
  if (existingMembership) {
    throw new Error('User is already a member of this family');
  }
  
  this.familyMemberships.push({
    familyId,
    role,
    invitedBy,
    status: 'active'
  });
  
  return this.save();
};

UserSchema.methods.removeFromFamily = function(familyId) {
  this.familyMemberships = this.familyMemberships.filter(
    membership => membership.familyId.toString() !== familyId.toString()
  );
  
  return this.save();
};

UserSchema.methods.updateFamilyRole = function(familyId, newRole) {
  const membership = this.familyMemberships.find(
    membership => membership.familyId.toString() === familyId.toString()
  );
  
  if (!membership) {
    throw new Error('User is not a member of this family');
  }
  
  membership.role = newRole;
  return this.save();
};

// Static methods
UserSchema.statics.findByGoogleId = function(googleId) {
  return this.findOne({ googleId, isActive: true });
};

UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

UserSchema.statics.findFamilyAdmins = function(familyId) {
  return this.find({
    'familyMemberships.familyId': familyId,
    'familyMemberships.role': { $in: ['admin1', 'admin2', 'admin3'] },
    isActive: true
  });
};

// Pre-save middleware
UserSchema.pre('save', function(next) {
  // Update login count and last login
  if (this.isModified('lastLoginAt')) {
    this.loginCount += 1;
  }
  
  next();
});

// Pre-save middleware for email normalization
UserSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase().trim();
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);