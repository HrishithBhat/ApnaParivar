const mongoose = require('mongoose');

const PhotoSchema = new mongoose.Schema({
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: false // Photos can be general family photos or member-specific
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  url: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: [
      'family', 'event', 'portrait', 'portraits', 'document', 'documents',
      'wedding', 'celebration', 'historical', 'other'
    ],
    default: 'family'
  },
  tags: [String],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  metadata: {
    dateTaken: Date,
    location: String,
    camera: String,
    resolution: {
      width: Number,
      height: Number
    }
  }
}, {
  timestamps: true
});

// Indexes
PhotoSchema.index({ familyId: 1, uploadedAt: -1 });
PhotoSchema.index({ memberId: 1 });
PhotoSchema.index({ category: 1 });
PhotoSchema.index({ tags: 1 });

module.exports = mongoose.model('Photo', PhotoSchema);