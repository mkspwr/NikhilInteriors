const mongoose = require('mongoose');

const QuoteSchema = new mongoose.Schema({
  projectType: {
    type: String,
    required: true,
    enum: ['residential-house', 'residential-apartment', 'office']
  },
  area: {
    type: Number,
    required: true
  },
  rooms: {
    type: Number,
    required: true
  },
  featureLevel: {
    type: String,
    required: true,
    enum: ['basic', 'premium', 'luxury']
  },
  minPrice: {
    type: Number,
    required: true
  },
  maxPrice: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Quote', QuoteSchema);