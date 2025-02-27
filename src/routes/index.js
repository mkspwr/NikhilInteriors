const express = require('express');
const passport = require('passport');
const CrudController = require('../controllers/crudController');
const ItemModel = require('../models/itemModel');
const Contact = require('../models/contactModel');

const router = express.Router();

const crudController = new CrudController(ItemModel);

// Homepage route (public, no authentication required)
router.get('/', (req, res) => {
  res.render('home', { user: req.user });
});

// Dashboard route (protected, requires authentication)
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('index', { user: req.user });
});

// Route to start the Google OAuth process
router.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

// Google OAuth callback route
router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// Route to log out
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Example CRUD routes
router.post('/items', ensureAuthenticated, crudController.create.bind(crudController));
router.get('/items', ensureAuthenticated, crudController.read.bind(crudController));
router.put('/items/:id', ensureAuthenticated, crudController.update.bind(crudController));
router.delete('/items/:id', ensureAuthenticated, crudController.delete.bind(crudController));

// Contact form submission route
router.post('/submit-inquiry', async (req, res) => {
  try {
    // Check if all required fields are present
    const { name, email, service, message } = req.body;
    const phone = req.body.phone || ''; // Phone might be optional
    
    if (!name || !email || !service || !message) {
      return res.status(400).render('error', { 
        message: 'Please fill out all required fields' 
      });
    }
    
    // Create a new contact inquiry
    const newContact = new Contact({
      name,
      email,
      phone,
      service,
      message
    });
    
    // Save to database
    await newContact.save();
    
    // Redirect with success message
    return res.render('success', { 
      message: 'Thank you for your inquiry! We will get back to you soon.' 
    });
  } catch (error) {
    console.error('Error saving contact form:', error);
    return res.status(500).render('error', { 
      message: 'Something went wrong. Please try again later.' 
    });
  }
});

// Middleware to ensure user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth/google');
}

module.exports = router;