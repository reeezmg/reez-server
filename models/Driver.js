const mongoose = require('mongoose');
const axios = require('axios');

// Driver Schema
const driverSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pickuppoints: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pickuppoint' }],
  chargesOption: { type: String, enum: ['fixed', 'negotiable', 'varies'] },
  charges: { type: Number },
  lowerLimit: { type: Number },
  upperLimit: { type: Number },
  teamNumber: { type: String },
  shiftTime: { type: String, enum: ['morning', 'evening', 'night', '9 to 5'] },
  seatsAvailable: { type: Number },
  rotaType: { type: Number, enum: [5,4] },
}, { timestamps: true });


// Mongoose middleware to update the location if any pickup point address changes during an update
driverSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  if (update && update.pickuppoints) {
    try {
      // Iterate over each updated pickup point and get coordinates
      for (let i = 0; i < update.pickuppoints.length; i++) {
        const { address } = update.pickuppoints[i];
        const { lat, lng } = await getCoordinatesFromAddress(address);
        update.pickuppoints[i].location = { coordinates: [lng, lat] };
      }
    } catch (error) {
      return next(error); // Pass the error to the next middleware (e.g., to be handled by the controller)
    }
  }
  next(); // Proceed with the update
});



module.exports = mongoose.model('Driver', driverSchema);
