const express = require('express');
const passport = require('passport');
const CrudController = require('../controllers/crudController');
const ItemModel = require('../models/itemModel');
const Contact = require('../models/contactModel');
const Quote = require('../models/Quote');

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

// Submit a quote request
router.post('/submit-quote', async (req, res) => {
    console.log('=== QUOTE SUBMISSION RECEIVED ===');
    console.log('Request Body:', req.body);
    
    try {
        // Extract form data
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
        
        console.log('Extracted fields:', { 
            projectType, 
            area: Number(area), 
            rooms: Number(rooms), 
            featureLevel 
        });
        
        // Calculate prices based on project type and feature level
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
        
        console.log('Calculated prices:', { minPrice, maxPrice, baseRate });
        
        // Create new quote
        const newQuote = new Quote({
            projectType,
            area: Number(area),
            rooms: Number(rooms),
            featureLevel,
            minPrice,
            maxPrice,
            name,
            email,
            phone,
            address
        });
        
        console.log('Quote object created:', newQuote);
        
        // Save to database
        const savedQuote = await newQuote.save();
        console.log('Quote saved successfully:', savedQuote._id);
        
        // Send success response
        res.status(201).json({
            success: true,
            message: 'Quote submitted successfully',
            data: {
                quoteId: savedQuote._id,
                minPrice,
                maxPrice
            }
        });
    } catch (error) {
        console.error('ERROR SAVING QUOTE:', error);
        
        // Check for validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = {};
            
            // Extract validation error messages
            for (const field in error.errors) {
                validationErrors[field] = error.errors[field].message;
                console.log(`Validation error on field "${field}":`, error.errors[field].message);
            }
            
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        
        // Handle other errors
        res.status(500).json({
            success: false,
            message: 'Failed to submit quote',
            error: error.message
        });
    }
});

// Get a specific quote by ID
router.get('/quotes/:id', async (req, res) => {
    try {
        const quote = await Quote.findById(req.params.id);
        
        if (!quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: quote
        });
    } catch (error) {
        console.error('ERROR FETCHING QUOTE:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quote',
            error: error.message
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