const mongoose = require('mongoose');

const FamilySchema = new mongoose.Schema({
  // Basic Information
  familyName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  familyId: {
    type: String,
    unique: true,
    index: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  // Family Settings
  isPrivate: {
    type: Boolean,
    default: true
  },
  allowPublicView: {
    type: Boolean,
    default: false
  },
  requireApprovalForJoining: {
    type: Boolean,
    default: true
  },
  
  // Admin Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  admins: {
    admin1: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      assignedAt: {
        type: Date,
        default: Date.now
      }
    },
    admin2: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      assignedAt: Date,
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    admin3: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      assignedAt: Date,
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  },
  
  // Family Tree Settings
  rootMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember'
  },
  treeStyle: {
    layout: {
      type: String,
      enum: ['vertical', 'horizontal', 'radial'],
      default: 'vertical'
    },
    theme: {
      type: String,
      enum: ['classic', 'modern', 'elegant'],
      default: 'modern'
    },
    showPhotos: {
      type: Boolean,
      default: true
    },
    showDates: {
      type: Boolean,
      default: true
    }
  },
  
  // Custom Fields Configuration
  customFields: [{
    fieldName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    fieldType: {
      type: String,
      enum: ['text', 'number', 'date', 'select', 'multiselect', 'textarea'],
      required: true
    },
    options: [String], // For select and multiselect types
    isRequired: {
      type: Boolean,
      default: false
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Statistics
  stats: {
    totalMembers: {
      type: Number,
      default: 0
    },
    totalGenerations: {
      type: Number,
      default: 0
    },
    totalMales: {
      type: Number,
      default: 0
    },
    totalFemales: {
      type: Number,
      default: 0
    },
    oldestMember: {
      memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyMember'
      },
      age: Number
    },
    youngestMember: {
      memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyMember'
      },
      age: Number
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Access Control
  accessSettings: {
    allowedViewers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      addedAt: {
        type: Date,
        default: Date.now
      },
      permissions: {
        canViewTree: {
          type: Boolean,
          default: true
        },
        canViewDetails: {
          type: Boolean,
          default: true
        },
        canViewPhotos: {
          type: Boolean,
          default: true
        }
      }
    }],
    pendingInvitations: [{
      email: {
        type: String,
        required: true,
        lowercase: true
      },
      role: {
        type: String,
        enum: ['admin2', 'admin3', 'viewer'],
        required: true
      },
      invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      invitedAt: {
        type: Date,
        default: Date.now
      },
      expiresAt: {
        type: Date,
        default: function() {
          return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        }
      },
      invitationToken: {
        type: String,
        required: true
      }
    }]
  },
  
  // Subscription and Payment
  subscription: {
    status: {
      type: String,
      enum: ['trial', 'active', 'expired', 'cancelled'],
      default: 'trial'
    },
    trialEndsAt: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year trial
      }
    },
    subscriptionEndsAt: Date,
    autoRenew: {
      type: Boolean,
      default: true
    }
  },
  
  // Activity and Audit
  activity: {
    lastMemberAdded: Date,
    lastPhotoUploaded: Date,
    lastTreeModified: Date,
    totalLogins: {
      type: Number,
      default: 0
    },
    lastLogin: Date
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
// Note: Field-level indexes already exist for familyId (unique, index: true) and createdBy (index: true)
// Avoid duplicating those here to prevent Mongoose duplicate index warnings.
FamilySchema.index({ 'admins.admin1.userId': 1 });
FamilySchema.index({ 'admins.admin2.userId': 1 });
FamilySchema.index({ 'admins.admin3.userId': 1 });
FamilySchema.index({ isActive: 1, isDeleted: 1 });
FamilySchema.index({ 'subscription.status': 1 });

// Virtual for getting all admin user IDs
FamilySchema.virtual('allAdminIds').get(function() {
  const adminIds = [];
  if (this.admins.admin1?.userId) adminIds.push(this.admins.admin1.userId);
  if (this.admins.admin2?.userId) adminIds.push(this.admins.admin2.userId);
  if (this.admins.admin3?.userId) adminIds.push(this.admins.admin3.userId);
  return adminIds;
});

// Virtual for checking if subscription is active
FamilySchema.virtual('hasActiveSubscription').get(function() {
  const now = new Date();
  return (
    this.subscription.status === 'trial' && this.subscription.trialEndsAt > now
  ) || (
    this.subscription.status === 'active' && this.subscription.subscriptionEndsAt > now
  );
});

// Virtual for getting family URL
FamilySchema.virtual('familyUrl').get(function() {
  return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/family/${this.familyId}`;
});

// Methods
FamilySchema.methods.addAdmin = function(adminLevel, userId, assignedBy) {
  if (!['admin2', 'admin3'].includes(adminLevel)) {
    throw new Error('Can only assign admin2 or admin3 roles');
  }
  
  if (this.admins[adminLevel]?.userId) {
    throw new Error(`${adminLevel} role is already assigned`);
  }
  
  this.admins[adminLevel] = {
    userId,
    assignedAt: new Date(),
    assignedBy
  };
  
  return this.save();
};

FamilySchema.methods.removeAdmin = function(adminLevel) {
  if (adminLevel === 'admin1') {
    throw new Error('Cannot remove admin1 role');
  }
  
  if (!['admin2', 'admin3'].includes(adminLevel)) {
    throw new Error('Invalid admin level');
  }
  
  this.admins[adminLevel] = {
    userId: null,
    assignedAt: null,
    assignedBy: null
  };
  
  return this.save();
};

FamilySchema.methods.isAdmin = function(userId) {
  return this.allAdminIds.some(adminId => adminId.toString() === userId.toString());
};

FamilySchema.methods.getAdminLevel = function(userId) {
  if (this.admins.admin1?.userId?.toString() === userId.toString()) return 'admin1';
  if (this.admins.admin2?.userId?.toString() === userId.toString()) return 'admin2';
  if (this.admins.admin3?.userId?.toString() === userId.toString()) return 'admin3';
  return null;
};

FamilySchema.methods.addCustomField = function(fieldData) {
  const maxFields = 10;
  if (this.customFields.length >= maxFields) {
    throw new Error(`Cannot add more than ${maxFields} custom fields`);
  }
  
  // Check for duplicate field names
  const existingField = this.customFields.find(field => 
    field.fieldName.toLowerCase() === fieldData.fieldName.toLowerCase()
  );
  
  if (existingField) {
    throw new Error('Field name already exists');
  }
  
  const newField = {
    ...fieldData,
    displayOrder: this.customFields.length
  };
  
  this.customFields.push(newField);
  return this.save();
};

FamilySchema.methods.updateStats = async function() {
  const FamilyMember = mongoose.model('FamilyMember');
  
  const members = await FamilyMember.find({ familyId: this._id, isDeleted: false });
  
  this.stats.totalMembers = members.length;
  this.stats.totalMales = members.filter(m => m.gender === 'male').length;
  this.stats.totalFemales = members.filter(m => m.gender === 'female').length;
  
  // Calculate generations (simplified - can be enhanced)
  const generations = [...new Set(members.map(m => m.generation || 0))];
  this.stats.totalGenerations = generations.length;
  
  // Find oldest and youngest members
  const membersWithAge = members.filter(m => m.dateOfBirth);
  if (membersWithAge.length > 0) {
    const oldest = membersWithAge.reduce((prev, current) => 
      prev.dateOfBirth < current.dateOfBirth ? prev : current
    );
    const youngest = membersWithAge.reduce((prev, current) => 
      prev.dateOfBirth > current.dateOfBirth ? prev : current
    );
    
    const now = new Date();
    this.stats.oldestMember = {
      memberId: oldest._id,
      age: Math.floor((now - oldest.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000))
    };
    this.stats.youngestMember = {
      memberId: youngest._id,
      age: Math.floor((now - youngest.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000))
    };
  }
  
  this.stats.lastUpdated = new Date();
  return this.save();
};

// Static methods
FamilySchema.statics.findByFamilyId = function(familyId) {
  return this.findOne({ familyId: familyId.toLowerCase(), isActive: true, isDeleted: false });
};

FamilySchema.statics.findByAdmin = function(userId) {
  return this.find({
    $or: [
      { 'admins.admin1.userId': userId },
      { 'admins.admin2.userId': userId },
      { 'admins.admin3.userId': userId }
    ],
    isActive: true,
    isDeleted: false
  });
};

// Pre-save middleware
FamilySchema.pre('save', function(next) {
  // Generate familyId if not provided
  if (!this.familyId && this.familyName) {
    this.familyId = this.familyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20) + 
      Math.random().toString(36).substring(2, 8);
  }
  
  // Ensure familyId exists (fallback)
  if (!this.familyId) {
    this.familyId = 'family_' + Math.random().toString(36).substring(2, 15);
  }
  
  next();
});

// Post-save middleware to update user family memberships
FamilySchema.post('save', async function(doc) {
  if (this.isNew) {
    // Add creator as admin1 in User model
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(
      this.createdBy,
      {
        $push: {
          familyMemberships: {
            familyId: this._id,
            role: 'admin1',
            status: 'active'
          }
        }
      }
    );
  }
});

module.exports = mongoose.model('Family', FamilySchema);