const mongoose = require('mongoose');

const FamilyMemberSchema = new mongoose.Schema({
  // Basic Information
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  middleName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  nickname: {
    type: String,
    trim: true,
    maxlength: 30
  },
  
  // Personal Details
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(date) {
        return date <= new Date();
      },
      message: 'Date of birth cannot be in the future'
    }
  },
  dateOfDeath: {
    type: Date,
    validate: {
      validator: function(date) {
        return !this.dateOfBirth || date >= this.dateOfBirth;
      },
      message: 'Date of death cannot be before date of birth'
    }
  },
  isAlive: {
    type: Boolean,
    default: true
  },
  placeOfBirth: {
    city: String,
    state: String,
    country: String
  },
  currentAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  
  // Contact Information
  contact: {
    phoneNumbers: [{
      type: {
        type: String,
        enum: ['mobile', 'home', 'work'],
        default: 'mobile'
      },
      number: {
        type: String,
        validate: {
          validator: function(v) {
            return !v || /^[+]?[\d\s\-\(\)]{10,}$/.test(v);
          },
          message: 'Invalid phone number format'
        }
      },
      isPrimary: {
        type: Boolean,
        default: false
      }
    }],
    emails: [{
      type: {
        type: String,
        enum: ['personal', 'work'],
        default: 'personal'
      },
      email: {
        type: String,
        lowercase: true,
        validate: {
          validator: function(v) {
            return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
          },
          message: 'Invalid email format'
        }
      },
      isPrimary: {
        type: Boolean,
        default: false
      }
    }],
    socialMedia: [{
      platform: {
        type: String,
        enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'whatsapp']
      },
      username: String,
      url: String
    }]
  },
  
  // Professional Information
  profession: {
    currentJob: {
      title: String,
      company: String,
      industry: String,
      startDate: Date,
      endDate: Date,
      isCurrentJob: {
        type: Boolean,
        default: true
      }
    },
    education: [{
      degree: String,
      institution: String,
      fieldOfStudy: String,
      graduationYear: Number,
      grade: String
    }],
    achievements: [{
      title: String,
      description: String,
      date: Date,
      category: {
        type: String,
        enum: ['academic', 'professional', 'personal', 'sports', 'arts', 'other']
      }
    }]
  },
  
  // Family Relationships
  relationships: {
    // Direct relationships
    father: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember'
    },
    mother: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember'
    },
    spouse: [{
      memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyMember'
      },
      marriageDate: Date,
      divorceDate: Date,
      isCurrentSpouse: {
        type: Boolean,
        default: true
      },
      marriagePlace: {
        city: String,
        state: String,
        country: String
      }
    }],
    children: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember'
    }],
    
    // Extended relationships (automatically calculated)
    siblings: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember'
    }],
    grandparents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember'
    }],
    grandchildren: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember'
    }]
  },
  
  // Tree Position and Hierarchy
  generation: {
    type: Number,
    default: 0,
    index: true
  },
  position: {
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: 0
    }
  },
  isRootMember: {
    type: Boolean,
    default: false
  },
  
  // Media and Documents
  photos: [{
    url: {
      type: String,
      required: true
    },
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    tags: [String],
    isVisible: {
      type: Boolean,
      default: true
    }
  }],
  documents: [{
    type: {
      type: String,
      enum: ['birth_certificate', 'marriage_certificate', 'death_certificate', 'id_proof', 'other']
    },
    url: String,
    fileName: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    description: String
  }],
  
  // Custom Fields (defined by family)
  customFields: [{
    fieldName: {
      type: String,
      required: true
    },
    fieldValue: mongoose.Schema.Types.Mixed, // Can be string, number, date, array, etc.
    fieldType: {
      type: String,
      enum: ['text', 'number', 'date', 'select', 'multiselect', 'textarea']
    }
  }],
  
  // Personal Timeline/Stories
  timeline: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    date: Date,
    category: {
      type: String,
      enum: ['birth', 'education', 'career', 'marriage', 'children', 'achievement', 'travel', 'other'],
      default: 'other'
    },
    photos: [String], // URLs to photos
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    isVisible: {
      type: Boolean,
      default: true
    }
  }],
  
  // Privacy and Visibility
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'family_only', 'admins_only', 'private'],
      default: 'family_only'
    },
    contactVisibility: {
      type: String,
      enum: ['public', 'family_only', 'admins_only', 'private'],
      default: 'family_only'
    },
    photoVisibility: {
      type: String,
      enum: ['public', 'family_only', 'admins_only', 'private'],
      default: 'family_only'
    }
  },
  
  // Metadata
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [String], // For search and categorization
  notes: {
    type: String,
    maxlength: 1000
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
FamilyMemberSchema.index({ familyId: 1, isDeleted: 1 });
FamilyMemberSchema.index({ firstName: 'text', lastName: 'text', nickname: 'text' });
FamilyMemberSchema.index({ generation: 1, familyId: 1 });
FamilyMemberSchema.index({ 'relationships.father': 1 });
FamilyMemberSchema.index({ 'relationships.mother': 1 });
FamilyMemberSchema.index({ dateOfBirth: 1 });
FamilyMemberSchema.index({ gender: 1, familyId: 1 });
FamilyMemberSchema.index({ tags: 1 });

// Virtual for full name
FamilyMemberSchema.virtual('fullName').get(function() {
  const parts = [this.firstName];
  if (this.middleName) parts.push(this.middleName);
  if (this.lastName) parts.push(this.lastName);
  return parts.join(' ');
});

// Virtual for display name
FamilyMemberSchema.virtual('displayName').get(function() {
  return this.nickname || this.fullName;
});

// Virtual for age
FamilyMemberSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  
  const endDate = this.isAlive ? new Date() : this.dateOfDeath;
  if (!endDate) return null;
  
  const ageInMs = endDate - this.dateOfBirth;
  return Math.floor(ageInMs / (365.25 * 24 * 60 * 60 * 1000));
});

// Virtual for primary photo
FamilyMemberSchema.virtual('primaryPhoto').get(function() {
  const photos = Array.isArray(this.photos) ? this.photos : [];
  return photos.find(photo => photo && photo.isPrimary) || photos[0] || null;
});

// Virtual for primary contact
FamilyMemberSchema.virtual('primaryContact').get(function() {
  const phones = (this.contact && Array.isArray(this.contact.phoneNumbers)) ? this.contact.phoneNumbers : [];
  const emails = (this.contact && Array.isArray(this.contact.emails)) ? this.contact.emails : [];

  const primaryPhone = phones.find(p => p && p.isPrimary) || phones[0];
  const primaryEmail = emails.find(e => e && e.isPrimary) || emails[0];
  
  return {
    phone: primaryPhone?.number || null,
    email: primaryEmail?.email || null
  };
});

// Methods
FamilyMemberSchema.methods.addChild = function(childId) {
  if (!this.relationships.children.includes(childId)) {
    this.relationships.children.push(childId);
  }
  return this.save();
};

FamilyMemberSchema.methods.addSpouse = function(spouseId, marriageDate, marriagePlace) {
  const existingSpouse = this.relationships.spouse.find(s => 
    s.memberId.toString() === spouseId.toString() && s.isCurrentSpouse
  );
  
  if (existingSpouse) {
    throw new Error('Member is already married to this person');
  }
  
  this.relationships.spouse.push({
    memberId: spouseId,
    marriageDate,
    marriagePlace,
    isCurrentSpouse: true
  });
  
  return this.save();
};

FamilyMemberSchema.methods.addPhoto = function(photoData, uploadedBy) {
  // If this is the first photo, make it primary
  if (this.photos.length === 0) {
    photoData.isPrimary = true;
  }
  
  // If setting as primary, unset other primary photos
  if (photoData.isPrimary) {
    this.photos.forEach(photo => {
      photo.isPrimary = false;
    });
  }
  
  this.photos.push({
    ...photoData,
    uploadedBy,
    uploadedAt: new Date()
  });
  
  return this.save();
};

FamilyMemberSchema.methods.addTimelineEvent = function(eventData, addedBy) {
  this.timeline.push({
    ...eventData,
    addedBy,
    addedAt: new Date()
  });
  
  // Sort timeline by date
  this.timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return this.save();
};

FamilyMemberSchema.methods.updateCustomFields = function(customFieldsData) {
  // Clear existing custom fields
  this.customFields = [];
  
  // Add new custom fields
  customFieldsData.forEach(field => {
    this.customFields.push(field);
  });
  
  return this.save();
};

// Static methods
FamilyMemberSchema.statics.findByFamily = function(familyId) {
  return this.find({ familyId, isDeleted: false }).sort({ generation: 1, firstName: 1 });
};

FamilyMemberSchema.statics.findByGeneration = function(familyId, generation) {
  return this.find({ familyId, generation, isDeleted: false }).sort({ firstName: 1 });
};

FamilyMemberSchema.statics.searchMembers = function(familyId, searchTerm) {
  return this.find({
    familyId,
    isDeleted: false,
    $or: [
      { firstName: { $regex: searchTerm, $options: 'i' } },
      { lastName: { $regex: searchTerm, $options: 'i' } },
      { nickname: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  }).sort({ firstName: 1 });
};

FamilyMemberSchema.statics.findRootMembers = function(familyId) {
  return this.find({ 
    familyId, 
    isDeleted: false,
    $and: [
      { 'relationships.father': { $exists: false } },
      { 'relationships.mother': { $exists: false } }
    ]
  });
};

// Pre-save middleware
FamilyMemberSchema.pre('save', function(next) {
  // Set isAlive based on dateOfDeath
  if (this.dateOfDeath) {
    this.isAlive = false;
  }
  
  // Update lastModifiedBy
  if (this.isModified() && !this.isNew) {
    this.lastModifiedBy = this.addedBy; // This should be set by the controller
  }
  
  next();
});

// Post-save middleware to update family statistics
FamilyMemberSchema.post('save', async function() {
  if (this.familyId) {
    const Family = mongoose.model('Family');
    const family = await Family.findById(this.familyId);
    if (family) {
      await family.updateStats();
    }
  }
});

// Post-remove middleware to update relationships
FamilyMemberSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    // Remove this member from all relationships
    await this.model('FamilyMember').updateMany(
      { familyId: doc.familyId },
      {
        $pull: {
          'relationships.children': doc._id,
          'relationships.siblings': doc._id,
          'relationships.grandchildren': doc._id,
          'relationships.grandparents': doc._id
        },
        $set: {
          'relationships.father': null,
          'relationships.mother': null
        }
      }
    );
    
    // Update family statistics
    const Family = mongoose.model('Family');
    const family = await Family.findById(doc.familyId);
    if (family) {
      await family.updateStats();
    }
  }
});

module.exports = mongoose.model('FamilyMember', FamilyMemberSchema);