// Configure dotenv at the very beginning
const dotenv = require('dotenv');
dotenv.config(); // This must come before any other imports that use env variables

const express = require('express');
// Create the app BEFORE using it

const mongoose = require('mongoose');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy; // Add this line
const passport = require('passport'); // Import passport directly
const User = require('./models/userModel');
const path = require('path'); // Add path module
const app = express();

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.hostname}${req.url}`);
    }
    next();
  });
}

// Configure passport
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
        ? 'https://parentportal-kokapbtx5l2lm.azurewebsites.net/auth/google/callback'
        : 'http://localhost:3000/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists in the database
      let user = await User.findOne({ googleId: profile.id });
      
      const currentTime = new Date();
      
      if (user) {
        // Update last login time and add to login history
        user.lastLogin = currentTime;
        user.loginHistory.push({ loginTime: currentTime });
        await user.save();
        done(null, user);
      } else {
        // If not, create a new user with signup and login timestamps
        user = await new User({
          googleId: profile.id,
          username: profile.displayName,
          thumbnail: profile._json.picture,
          signupDate: currentTime,
          lastLogin: currentTime,
          loginHistory: [{ loginTime: currentTime }]
        }).save();
        done(null, user);
      }
    } catch (err) {
      done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

const routes = require('./routes/index');



// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use(routes);

// Google Auth Routes
app.get('/auth/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/',
    successRedirect: '/dashboard' // Redirect to dashboard after successful login
  })
);

// Simple route for the dashboard
app.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('dashboard', { user: req.user });
});

// Middleware to check if user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

// Logout route
app.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Database connection
mongoose.connect(process.env.DATABASE_URL)
    .then(() => console.log('Cosmos DB connected'))
    .catch(err => console.error('Cosmos DB connection error:', err));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});