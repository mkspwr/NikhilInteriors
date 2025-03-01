const Quote = require('../models/Quote');

// Save a new quote
exports.saveQuote = async (req, res) => {
  try {
    const newQuote = new Quote({
      projectType: req.body.projectType,
      area: req.body.area,
      rooms: req.body.rooms,
      featureLevel: req.body.featureLevel,
      minPrice: req.body.minPrice,
      maxPrice: req.body.maxPrice,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address
    });

    await newQuote.save();
    res.status(201).json({ success: true, quote: newQuote });
  } catch (error) {
    console.error('Error saving quote:', error);
    res.status(500).json({ success: false, error: 'Failed to save quote' });
  }
};

// Get all quotes - useful for admin
exports.getAllQuotes = async (req, res) => {
  try {
    const quotes = await Quote.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: quotes });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch quotes' });
  }
};