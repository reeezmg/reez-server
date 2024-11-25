const mongoose = require('mongoose');

const pickupPointSchema = new mongoose.Schema({
  address: { type: String, required: true },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
}, { timestamps: true });

// Create the 2dsphere index
pickupPointSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Pickuppoint', pickupPointSchema);
