const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true
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
  eventType: {
    type: String,
    enum: [
      'birthday', 'anniversary', 'wedding', 'birth', 'death', 'graduation',
      'achievement', 'reunion', 'holiday', 'vacation', 'milestone', 'other'
    ],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  location: {
    type: String,
    trim: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember'
  }],
  participantNames: [String], // For non-family member participants
  photos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo'
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: String,
    enum: ['yearly', 'monthly', 'weekly', 'daily'],
    required: function() { return this.isRecurring; }
  },
  significance: {
    type: String,
    enum: ['low', 'medium', 'high', 'milestone'],
    default: 'medium'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [String],
  metadata: {
    originalDate: Date, // If date was estimated
    source: String, // How this information was obtained
    verified: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes
EventSchema.index({ familyId: 1, date: -1 });
EventSchema.index({ eventType: 1 });
EventSchema.index({ date: 1 });
EventSchema.index({ participants: 1 });
EventSchema.index({ tags: 1 });

// Virtual for formatted date
EventSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString();
});

module.exports = mongoose.model('Event', EventSchema);