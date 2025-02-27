const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Configure environment variables properly for both local and production
const isProduction = process.env.NODE_ENV === 'production';
const baseUrl = isProduction 
  ? 'https://parentportal-kokapbtx5l2lm.azurewebsites.net'
  : 'http://localhost:3000';

// Configure Passport Google strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${baseUrl}/auth/google/callback`,
    scope: ['profile', 'email']
  },
  (accessToken, refreshToken, profile, done) => {
    // This function will be called when a user successfully authenticates with Google
    // Here you would typically find or create a user in your database
    // For now, we'll just pass the profile to the callback
    return done(null, profile);
  }
));

// Serialization and deserialization for session management
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

module.exports = passport;