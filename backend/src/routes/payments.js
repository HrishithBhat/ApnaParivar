const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/permissions');
const { Family, Payment, User } = require('../models');

// Feature flag to enable/disable payments end-to-end
const PAYMENTS_ENABLED = (process.env.PAYMENTS_ENABLED === 'true');

let Razorpay = null;
try {
  // Only attempt to require Razorpay if payments are enabled
  if (PAYMENTS_ENABLED) {
    Razorpay = require('razorpay');
  }
} catch (e) {
  Razorpay = null;
}

const router = express.Router();

const INR_YEARLY_AMOUNT_PAISE = 50000; // Rs 500.00

function buildRazorpay() {
  if (!PAYMENTS_ENABLED) return null;
  if (!Razorpay || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

// Helper to resolve a family from either ObjectId or slug
async function resolveFamily(input) {
  if (!input) return null;
  if (mongoose.isValidObjectId(input)) {
    return Family.findById(input);
  }
  // If the string happens to look like a 24-hex ObjectId, try findById, else fall back to slug
  const looksLikeId = /^[a-fA-F0-9]{24}$/.test(String(input));
  if (looksLikeId) {
    const byId = await Family.findById(input);
    if (byId) return byId;
  }
  return Family.findOne({ familyId: String(input).toLowerCase() });
}

// Create order for a family's yearly subscription (admin-only)
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    if (!PAYMENTS_ENABLED) {
      return res.status(503).json({ success: false, paymentsEnabled: false, message: 'Payments are disabled right now' });
    }
    const userId = req.user._id; // keep as ObjectId for isAdmin check
    const { familyId } = req.body;

    const inputId = familyId || req.user.primaryFamily?.familyId;
    if (!inputId) {
      return res.status(400).json({ success: false, message: 'Family ID is required' });
    }

    // Resolve family robustly (ObjectId or slug)
    const family = await resolveFamily(inputId);
    if (!family) return res.status(404).json({ success: false, message: 'Family not found' });

    const isAdminUser = family.isAdmin(userId) ||
      (req.user.primaryFamily?.familyId?.toString?.() === family._id.toString() && req.user.primaryFamily?.role === 'creator') ||
      (req.user.userType === 'superadmin');

    if (!isAdminUser) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const rzp = buildRazorpay();
    if (!rzp) {
      return res.status(503).json({ success: false, paymentsEnabled: false, message: 'Payment provider not configured' });
    }

    const order = await rzp.orders.create({
      amount: INR_YEARLY_AMOUNT_PAISE,
      currency: 'INR',
      receipt: 'rcpt_' + Date.now(),
      notes: { familyId: family._id.toString(), createdBy: userId }
    });

    res.json({ success: true, provider: 'razorpay', order, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// Verify payment signature and mark paid
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    if (!PAYMENTS_ENABLED) {
      return res.status(503).json({ success: false, paymentsEnabled: false, message: 'Payments are disabled right now' });
    }
    const userId = req.user._id;
    const { familyId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    const inputId = familyId || req.user.primaryFamily?.familyId;
    if (!inputId) return res.status(400).json({ success: false, message: 'Family ID is required' });

    const family = await resolveFamily(inputId);
    if (!family) return res.status(404).json({ success: false, message: 'Family not found' });

    if (!family.isAdmin(userId)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    let verified = false;
    if (process.env.RAZORPAY_KEY_SECRET && razorpay_payment_id && razorpay_order_id && razorpay_signature) {
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
      const digest = hmac.digest('hex');
      verified = (digest === razorpay_signature);
    } else {
      // Dev mode accept
      verified = true;
    }

    if (!verified) return res.status(400).json({ success: false, message: 'Signature verification failed' });

    const now = new Date();
    const endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    // Record payment
    const payment = new Payment({
      transactionId: 'TXN_' + Date.now(),
      razorpayOrderId: razorpay_order_id || 'mock_order',
      razorpayPaymentId: razorpay_payment_id || 'mock_payment',
  familyId: family._id,
  userId: req.user._id,
      amount: INR_YEARLY_AMOUNT_PAISE,
      currency: 'INR',
      description: 'ApnaParivar yearly subscription',
      subscriptionType: 'annual',
      subscriptionPeriod: { startDate: now, endDate },
      status: 'paid',
      paymentMethod: 'card'
    });
    await payment.save();

    // Update family subscription
    family.subscription.status = 'active';
    family.subscription.subscriptionEndsAt = endDate;
    await family.save();

    // Update user payment info
    await User.findByIdAndUpdate(req.user._id, {
      'paymentInfo.subscriptionStatus': 'active',
      'paymentInfo.subscriptionEndsAt': endDate,
      'paymentInfo.lastPaymentDate': now,
      'paymentInfo.nextPaymentDate': endDate
    });

    res.json({ success: true, message: 'Payment verified and subscription activated' });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
});

// Get subscription status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { familyId } = req.query;
    const inputId = familyId || req.user.primaryFamily?.familyId;
    const fam = await resolveFamily(inputId);
    const family = fam ? await Family.findById(fam._id).select('subscription familyName') : null;
    if (!family) return res.status(404).json({ success: false, message: 'Family not found' });
    res.json({ success: true, paymentsEnabled: PAYMENTS_ENABLED, family: { id: family._id, name: family.familyName, subscription: family.subscription } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get subscription status' });
  }
});

module.exports = router;
// ---- Dummy payment endpoints (no external provider) ----

// Activate subscription via dummy payment (admin-only). Enabled when real payments are disabled.
router.post('/dummy/activate', authenticateToken, async (req, res) => {
  try {
    if (PAYMENTS_ENABLED) {
      return res.status(400).json({ success: false, message: 'Dummy payments are only available when real payments are disabled' });
    }

    const { familyId } = req.body;
    const inputId = familyId || req.user.primaryFamily?.familyId;
    if (!inputId) return res.status(400).json({ success: false, message: 'Family ID is required' });

    const family = await resolveFamily(inputId);
    if (!family) return res.status(404).json({ success: false, message: 'Family not found' });

    // Only admins can activate
    if (!family.isAdmin(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    // Record a dummy payment if Payment model exists
    try {
      if (Payment) {
        const payment = new Payment({
          transactionId: 'DUMMY_' + Date.now(),
          familyId: family._id,
          userId: req.user._id,
          amount: INR_YEARLY_AMOUNT_PAISE,
          currency: 'INR',
          description: 'Dummy yearly subscription activation',
          subscriptionType: 'annual',
          subscriptionPeriod: { startDate: now, endDate },
          status: 'paid',
          paymentMethod: 'dummy'
        });
        await payment.save();
      }
    } catch (e) {
      // Non-fatal: continue activation even if Payment logging fails
      console.warn('Dummy payment logging failed:', e.message);
    }

    // Activate subscription
    family.subscription.status = 'active';
    family.subscription.subscriptionEndsAt = endDate;
    await family.save();

    await User.findByIdAndUpdate(req.user._id, {
      'paymentInfo.subscriptionStatus': 'active',
      'paymentInfo.subscriptionEndsAt': endDate,
      'paymentInfo.lastPaymentDate': now,
      'paymentInfo.nextPaymentDate': endDate
    });

    return res.json({ success: true, message: 'Subscription activated (dummy payment)' });
  } catch (error) {
    console.error('Dummy activate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to activate subscription' });
  }
});
# PayPal (Sandbox)
$env:PAYPAL_ENV="sandbox"
$env:PAYPAL_CLIENT_ID="<your_sandbox_client_id>"
$env:PAYPAL_CLIENT_SECRET="<your_sandbox_client_secret>"
$env:PAYPAL_CURRENCY="USD"  # or INR if you prefer; USD recommended in sandbox

# App URLs
$env:CLIENT_URL="http://localhost:5173"
$env:BACKEND_URL="http://localhost:5000"

# Usual backend env (example)
$env:MONGO_URI="<your_mongodb_uri>"
$env:JWT_SECRET="<strong_random>"
$env:SESSION_SECRET="<strong_random>"