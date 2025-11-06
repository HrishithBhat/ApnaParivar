const express = require('express');
const { authenticateToken, requireSuperAdmin } = require('../middleware/permissions');
const { User, Family, Payment } = require('../models');

const router = express.Router();

// Overview stats
router.get('/overview', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const [totalUsers, activeUsers, totalFamilies, activeFamilies, totalPayments] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Family.countDocuments(),
      Family.countDocuments({ isActive: true, isDeleted: false }),
      Payment.countDocuments({ status: 'paid' })
    ]);

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, active: activeUsers },
        families: { total: totalFamilies, active: activeFamilies },
        payments: { totalPaid: totalPayments }
      }
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch overview' });
  }
});

// List users (basic)
router.get('/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const users = await User.find().select('name email userType createdAt lastLoginAt isActive').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// List families (basic)
router.get('/families', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const families = await Family.find({ isDeleted: false })
      .select('familyName familyId createdBy createdAt subscription stats isActive')
      .populate('createdBy', 'name email');
    res.json({ success: true, families });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch families' });
  }
});

// List payments (recent)
router.get('/payments', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const payments = await Payment.find({}).sort({ createdAt: -1 }).limit(100)
      .populate('familyId', 'familyName familyId')
      .populate('userId', 'name email');
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

module.exports = router;
