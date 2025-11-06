const express = require('express');
const passport = require('passport');
const { generateJWT } = require('../middleware/auth');
const { authenticateToken } = require('../middleware/permissions');
const { User } = require('../models');

const router = express.Router();

// @route   GET /api/auth/google
// @desc    Start Google OAuth flow
// @access  Public
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
    session: false 
  }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = generateJWT(req.user);
      
      // Set token in cookie (optional, for additional security)
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Redirect to frontend with token
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/success?token=${token}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=callback_failed`);
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Get user with populated primary family data
    const user = await User.findById(req.user._id)
      .populate('primaryFamily.familyId', 'familyName familyId description stats')
      .select('-__v');

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture,
        userType: user.userType,
        primaryFamily: user.primaryFamily,
        hasFamily: user.hasFamily,
        isFamilyCreator: user.isFamilyCreator,
        preferences: user.preferences,
        hasActiveSubscription: user.hasActiveSubscription,
        paymentInfo: {
          subscriptionStatus: user.paymentInfo.subscriptionStatus,
          trialEndsAt: user.paymentInfo.trialEndsAt,
          subscriptionEndsAt: user.paymentInfo.subscriptionEndsAt
        },
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (clear token)
// @access  Private
router.post('/logout', authenticateToken, (req, res) => {
  try {
    // Clear cookie
    res.clearCookie('auth_token');
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // Generate new token
    const newToken = generateJWT(req.user);
    
    // Update cookie
    res.cookie('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      token: newToken,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, preferences } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (name) user.name = name;
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }
    
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile update failed'
    });
  }
});

// @route   DELETE /api/auth/account
// @desc    Delete user account (soft delete)
// @access  Private
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Soft delete
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();

    // Clear cookie
    res.clearCookie('auth_token');

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('❌ Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Account deletion failed'
    });
  }
});

// @route   GET /api/auth/stats
// @desc    Get authentication statistics (superadmin only)
// @access  Private (Superadmin)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Superadmin access required'
      });
    }

    const stats = await User.aggregate([
      {
        $group: {
          _id: '$userType',
          count: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [{ $eq: ['$isActive', true] }, 1, 0]
            }
          }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const recentLogins = await User.countDocuments({
      lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        recentLogins,
        userTypes: stats
      }
    });
  } catch (error) {
    console.error('❌ Auth stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get authentication statistics'
    });
  }
});

module.exports = router;