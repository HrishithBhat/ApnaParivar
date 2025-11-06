const jwt = require('jsonwebtoken');
const { User, Family } = require('../models');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Fallback: check cookie (for browser-based OAuth flows)
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data
    const user = await User.findById(decoded.id).select('-__v');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('🔒 Auth middleware error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Middleware to check if user is superadmin
const requireSuperAdmin = (req, res, next) => {
  if (req.user.userType !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Superadmin access required'
    });
  }
  next();
};

// Middleware to check if user is family admin (admin1, admin2, or admin3)
const requireFamilyAdmin = (req, res, next) => {
  const familyId = req.params.familyId;
  
  if (!familyId) {
    return res.status(400).json({
      success: false,
      message: 'Family ID is required'
    });
  }

  const membership = req.user.familyMemberships.find(
    m => m.familyId.toString() === familyId && 
         ['admin1', 'admin2', 'admin3'].includes(m.role) &&
         m.status === 'active'
  );

  if (!membership) {
    return res.status(403).json({
      success: false,
      message: 'Family admin access required'
    });
  }

  req.userFamilyRole = membership.role;
  next();
};

// Middleware to check if user can view family (admin or approved viewer)
const requireFamilyAccess = async (req, res, next) => {
  const familyId = req.params.familyId;
  
  if (!familyId) {
    return res.status(400).json({
      success: false,
      message: 'Family ID is required'
    });
  }

  // First, allow access if user's primary family matches (handle populated doc or ObjectId)
  const userFam = req.user.primaryFamily?.familyId;
  const userFamIdStr = typeof userFam === 'string'
    ? userFam
    : (userFam?._id?.toString?.() || userFam?.toString?.() || '');
  if (userFamIdStr && userFamIdStr === familyId) {
    req.userFamilyRole = req.user.primaryFamily.role;
    return next();
  }

  // Otherwise, check if user is an allowed viewer on the family
  try {
    const family = await Family.findById(familyId).select('accessSettings.allowedViewers');
    const isViewer = family?.accessSettings?.allowedViewers?.some(v => v.userId?.toString() === req.user._id.toString());
    if (isViewer) {
      req.userFamilyRole = 'viewer';
      return next();
    }
  } catch (e) {
    // fall through to 403
  }

  return res.status(403).json({ success: false, message: 'Family access required' });
};

// Middleware to check subscription status
const requireActiveSubscription = async (req, res, next) => {
  try {
    // Superadmin always has access
    if (req.user.userType === 'superadmin') {
      return next();
    }

    // Check if user has active subscription
    if (!req.user.hasActiveSubscription) {
      return res.status(402).json({
        success: false,
        message: 'Active subscription required',
        subscriptionStatus: req.user.paymentInfo.subscriptionStatus,
        trialEndsAt: req.user.paymentInfo.trialEndsAt
      });
    }

    next();
  } catch (error) {
    console.error('💳 Subscription check error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Subscription verification error'
    });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-__v');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Silently continue without user if token is invalid
    next();
  }
};

module.exports = {
  authenticateToken,
  requireSuperAdmin,
  requireFamilyAdmin,
  requireFamilyAccess,
  requireActiveSubscription,
  optionalAuth
};