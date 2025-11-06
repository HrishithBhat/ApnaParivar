// Load environment variables
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Debug: Check if environment variables are loaded
console.log('🔧 Environment check:', {
  clientID: process.env.GOOGLE_CLIENT_ID ? 'Found' : 'Missing',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Found' : 'Missing',
  jwtSecret: process.env.JWT_SECRET ? 'Found' : 'Missing'
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔍 Google OAuth Profile:', {
      id: profile.id,
      email: profile.emails[0]?.value,
      name: profile.displayName
    });

    // Enforce Gmail-only authentication (email must end with @gmail.com)
    const email = profile.emails[0]?.value?.toLowerCase();
    if (!email || !email.endsWith('@gmail.com')) {
      console.warn('🚫 Non-Gmail account attempted login:', email);
      return done(new Error('Only Gmail accounts are allowed'), null);
    }

    // Check if user already exists
    let user = await User.findByGoogleId(profile.id);
    
    if (user) {
      // User exists, update login info
      user.lastLoginAt = new Date();
      user.loginCount += 1;
      
      // Update profile picture if changed
      if (profile.photos && profile.photos[0]) {
        user.profilePicture = profile.photos[0].value;
      }
      
      await user.save();
      console.log('✅ Existing user logged in:', user.email);
      return done(null, user);
    }

    // Create new user
    const newUser = new User({
      googleId: profile.id,
      email,
      name: profile.displayName,
      profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
      isEmailVerified: true, // Google emails are pre-verified
      userType: 'family_member', // Default role, can be upgraded later
      lastLoginAt: new Date(),
      loginCount: 1
    });

    // Check if this is the first user (make them superadmin)
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      newUser.userType = 'superadmin';
      console.log('👑 First user registered as superadmin');
    }

    await newUser.save();
    console.log('🆕 New user created:', newUser.email);
    
    return done(null, newUser);
  } catch (error) {
    console.error('❌ Google OAuth Error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Generate JWT token
const generateJWT = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    userType: user.userType,
    familyMemberships: user.familyMemberships
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d' // Token expires in 7 days
  });
};

// Verify JWT token
const verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

module.exports = {
  passport,
  generateJWT,
  verifyJWT
};