/**
 * Pet model
 */
const mongoose = require('mongoose');

// Define schema for Pet
const petSchema = new mongoose.Schema({
  name: { type: String, required: true },
  species: { type: String, required: true },
  breed: { type: String },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Unknown'], default: 'Unknown' },
  size: { type: String, enum: ['Small', 'Medium', 'Large'], default: 'Medium' },
  color: { type: String },
  description: { type: String },
  available: { type: Boolean, default: true },
  imageUrl: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  location: {
    longitude: { type: Number },
    latitude: { type: Number },
  },
  interestedAdopters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const Pet = mongoose.model('Pet', petSchema);
module.exports = Pet;
