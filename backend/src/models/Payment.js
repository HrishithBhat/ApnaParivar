const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  // Transaction Information
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  razorpayOrderId: {
    type: String,
    required: true,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    index: true
  },
  razorpaySignature: String,
  
  // Family and User Information
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Payment Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  description: {
    type: String,
    required: true
  },
  
  // Subscription Information
  subscriptionType: {
    type: String,
    enum: ['annual', 'monthly', 'lifetime'],
    default: 'annual'
  },
  subscriptionPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  
  // Payment Status
  status: {
    type: String,
    enum: ['created', 'attempted', 'paid', 'failed', 'cancelled', 'refunded'],
    default: 'created',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'netbanking', 'wallet', 'upi', 'bank_transfer']
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  paidAt: Date,
  failedAt: Date,
  refundedAt: Date,
  
  // Failure Information
  failureReason: String,
  errorCode: String,
  errorDescription: String,
  
  // Refund Information
  refund: {
    refundId: String,
    refundAmount: Number,
    refundReason: String,
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed']
    }
  },
  
  // Invoice Information
  invoice: {
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    invoiceDate: Date,
    dueDate: Date,
    taxAmount: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    totalAmount: Number,
    downloadUrl: String,
    emailSent: {
      type: Boolean,
      default: false
    }
  },
  
  // Customer Information (for invoice)
  billingDetails: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    phone: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    },
    gstNumber: String // For Indian businesses
  },
  
  // Razorpay Webhook Data
  webhookData: {
    eventId: String,
    eventType: String,
    receivedAt: Date,
    rawData: mongoose.Schema.Types.Mixed
  },
  
  // Notes and Metadata
  notes: mongoose.Schema.Types.Mixed, // Razorpay notes
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile_app', 'admin_panel'],
      default: 'web'
    },
    promotionCode: String,
    referralCode: String
  },
  
  // Retry Information
  retryAttempts: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  nextRetryAt: Date,
  
  // Administrative
  isActive: {
    type: Boolean,
    default: true
  },
  remarks: String, // For admin use
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
PaymentSchema.index({ familyId: 1, status: 1 });
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ 'subscriptionPeriod.endDate': 1 });
PaymentSchema.index({ razorpayOrderId: 1, razorpayPaymentId: 1 });

// Virtual for checking if payment is successful
PaymentSchema.virtual('isSuccessful').get(function() {
  return this.status === 'paid';
});

// Virtual for checking if payment is pending
PaymentSchema.virtual('isPending').get(function() {
  return ['created', 'attempted'].includes(this.status);
});

// Virtual for formatted amount
PaymentSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount / 100); // Razorpay amounts are in paise
});

// Virtual for subscription duration in days
PaymentSchema.virtual('subscriptionDurationDays').get(function() {
  if (!this.subscriptionPeriod.startDate || !this.subscriptionPeriod.endDate) return 0;
  
  const diffTime = this.subscriptionPeriod.endDate - this.subscriptionPeriod.startDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Methods
PaymentSchema.methods.markAsPaid = function(paymentData) {
  this.status = 'paid';
  this.paidAt = new Date();
  this.razorpayPaymentId = paymentData.razorpay_payment_id;
  this.razorpaySignature = paymentData.razorpay_signature;
  this.paymentMethod = paymentData.method;
  
  // Generate invoice
  this.generateInvoice();
  
  return this.save();
};

PaymentSchema.methods.markAsFailed = function(errorData) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = errorData.reason;
  this.errorCode = errorData.code;
  this.errorDescription = errorData.description;
  
  // Schedule retry if attempts are remaining
  if (this.retryAttempts < this.maxRetries) {
    this.nextRetryAt = new Date(Date.now() + (this.retryAttempts + 1) * 24 * 60 * 60 * 1000); // Next day
  }
  
  return this.save();
};

PaymentSchema.methods.generateInvoice = function() {
  if (!this.invoice.invoiceNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const sequence = String(Date.now()).slice(-6); // Last 6 digits of timestamp
    
    this.invoice.invoiceNumber = `AP-${year}${month}-${sequence}`;
    this.invoice.invoiceDate = new Date();
    this.invoice.totalAmount = this.amount;
    
    // Calculate tax (18% GST for India)
    if (this.currency === 'INR') {
      const baseAmount = Math.round(this.amount / 1.18);
      this.invoice.taxAmount = this.amount - baseAmount;
    }
  }
  
  return this;
};

PaymentSchema.methods.processRefund = function(refundData, refundedBy) {
  this.status = 'refunded';
  this.refundedAt = new Date();
  
  this.refund = {
    refundId: refundData.refund_id,
    refundAmount: refundData.amount,
    refundReason: refundData.reason,
    refundedBy,
    refundStatus: 'processed'
  };
  
  return this.save();
};

PaymentSchema.methods.canRetry = function() {
  return this.status === 'failed' && 
         this.retryAttempts < this.maxRetries && 
         (!this.nextRetryAt || this.nextRetryAt <= new Date());
};

// Static methods
PaymentSchema.statics.findByFamily = function(familyId, options = {}) {
  const query = { familyId, isActive: true };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .populate('userId', 'name email')
    .populate('familyId', 'familyName familyId');
};

PaymentSchema.statics.findSuccessfulPayments = function(familyId) {
  return this.find({
    familyId,
    status: 'paid',
    isActive: true
  }).sort({ paidAt: -1 });
};

PaymentSchema.statics.findPendingPayments = function() {
  return this.find({
    status: { $in: ['created', 'attempted'] },
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    isActive: true
  });
};

PaymentSchema.statics.findExpiringSubscriptions = function(daysAhead = 7) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysAhead);
  
  return this.find({
    status: 'paid',
    'subscriptionPeriod.endDate': { $lte: expiryDate },
    isActive: true
  }).populate('familyId userId');
};

PaymentSchema.statics.getRevenueStats = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        status: 'paid',
        paidAt: { $gte: startDate, $lte: endDate },
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        avgTransactionValue: { $avg: '$amount' }
      }
    }
  ]);
};

// Pre-save middleware
PaymentSchema.pre('save', function(next) {
  // Generate transaction ID if not provided
  if (!this.transactionId) {
    this.transactionId = 'TXN_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  // Auto-generate invoice for successful payments
  if (this.status === 'paid' && !this.invoice.invoiceNumber) {
    this.generateInvoice();
  }
  
  next();
});

// Post-save middleware to update family subscription
PaymentSchema.post('save', async function(doc) {
  if (doc.status === 'paid') {
    const Family = mongoose.model('Family');
    const User = mongoose.model('User');
    
    // Update family subscription
    await Family.findByIdAndUpdate(
      doc.familyId,
      {
        'subscription.status': 'active',
        'subscription.subscriptionEndsAt': doc.subscriptionPeriod.endDate,
        'subscription.autoRenew': true
      }
    );
    
    // Update user payment info
    await User.findByIdAndUpdate(
      doc.userId,
      {
        'paymentInfo.subscriptionStatus': 'active',
        'paymentInfo.subscriptionEndsAt': doc.subscriptionPeriod.endDate,
        'paymentInfo.lastPaymentDate': doc.paidAt,
        'paymentInfo.nextPaymentDate': doc.subscriptionPeriod.endDate
      }
    );
  }
});

module.exports = mongoose.model('Payment', PaymentSchema);