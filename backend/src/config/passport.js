const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models');

module.exports = function setupPassport() {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      const email = profile.emails && profile.emails[0] && profile.emails[0].value;
      const googleId = profile.id;
      const name = profile.displayName || (profile.name && `${profile.name.givenName} ${profile.name.familyName}`) || 'Unknown';
      const photo = profile.photos && profile.photos[0] && profile.photos[0].value;

      // Find existing user
      let user = await User.findOne({ googleId });
      if (!user && email) {
        user = await User.findOne({ email });
      }

      if (!user) {
        // Create new user
        user = new User({
          googleId,
          email,
          name,
          profilePicture: photo,
          userType: 'family_member',
          isEmailVerified: true
        });

        await user.save();
      } else {
        // Update user if needed
        let changed = false;
        if (!user.googleId) { user.googleId = googleId; changed = true; }
        if (!user.profilePicture && photo) { user.profilePicture = photo; changed = true; }
        if (!user.name && name) { user.name = name; changed = true; }
        if (changed) await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));

  // Passport serialization (not using sessions but keep definitions)
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(async function(id, done) {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};