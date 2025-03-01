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

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

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

// Route for pricing calculator
app.get('/pricing-calculator', (req, res) => {
  console.log('Rendering pricing calculator page');
  res.render('pricing-calculator');
});

// API endpoint to save quotes
app.post('/api/save-quote', async (req, res) => {
  console.log('Quote received:', req.body);
  
  try {
    // Make sure we have a Quote model imported
    const Quote = require('./models/Quote');
    
    // Extract data from request
    const {
      projectType,
      area,
      rooms,
      featureLevel,
      name,
      email,
      phone,
      address
    } = req.body;
    
    // Calculate pricing based on project type and feature level
    let baseRate = 0;
    
    if (projectType === 'residential-house') {
      if (featureLevel === 'basic') baseRate = 1200;
      else if (featureLevel === 'premium') baseRate = 1800;
      else if (featureLevel === 'luxury') baseRate = 2500;
    } else if (projectType === 'residential-apartment') {
      if (featureLevel === 'basic') baseRate = 1000;
      else if (featureLevel === 'premium') baseRate = 1500;
      else if (featureLevel === 'luxury') baseRate = 2200;
    } else if (projectType === 'office') {
      if (featureLevel === 'basic') baseRate = 1100;
      else if (featureLevel === 'premium') baseRate = 1600;
      else if (featureLevel === 'luxury') baseRate = 2300;
    }
    
    const minPrice = Math.round(Number(area) * baseRate * 0.9);
    const maxPrice = Math.round(Number(area) * baseRate * 1.1);
    
    // Create a new quote document
    const newQuote = new Quote({
      projectType,
      area: Number(area),
      rooms: Number(rooms || 1), // Default to 1 if not provided
      featureLevel,
      minPrice,
      maxPrice,
      name,
      email,
      phone,
      address
    });
    
    console.log('Attempting to save quote:', newQuote);
    
    // Save to database
    const savedQuote = await newQuote.save();
    console.log('Quote saved successfully with ID:', savedQuote._id);
    
    // Return success response WITH THE REQUIRED DATA
    return res.status(201).json({
      success: true,
      message: 'Quote saved successfully',
      data: {
        quoteId: savedQuote._id.toString(), // Convert ObjectId to string
        minPrice: minPrice,
        maxPrice: maxPrice
      }
    });
  } catch (err) {
    console.error('Error saving quote:', err);
    
    // Return error response
    return res.status(500).json({
      success: false,
      message: err.message || 'An error occurred while saving the quote'
    });
  }
});

// Database connection
console.log('Connecting to MongoDB...');
mongoose.connect(process.env.DATABASE_URL)
    .then(() => console.log('Cosmos DB connected'))
    .catch(err => console.error('Cosmos DB connection error:', err));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});