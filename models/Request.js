const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Requests schema
const RequestSchema = new Schema({
  passengerId: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
  },
  driverId: {
    type: Schema.Types.ObjectId,
    ref: 'Driver', // Reference to the User model
    required: true,
  },
  days: {
    type: [String], // Array of strings for the selected days
    required: true,
    validate: {
      validator: function (days) {
        return days.length > 0; // Ensure at least one day is selected
      },
      message: 'You must select at least one day',
    },
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

// Create the model
const Request = mongoose.model('Request', RequestSchema);

module.exports = Request;
