const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Driver = require('./Driver'); // Import the Driver model

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  userType: { type: String, enum: ['Passenger', 'Driver'], required: true },
  location: { type: String, required: true },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password for login
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// After saving the user, create a Driver document if the user is of type "Driver"
userSchema.post('save', async function (doc, next) {
  if (doc.userType === 'Driver') {
    try {
      // Create a new Driver document with reference to the User document
      const newDriver = new Driver({
        user: doc._id, // Reference to the user that was just created
        // You can add any additional fields here as needed
      });

      await newDriver.save();
      console.log('Driver document created successfully');
    } catch (error) {
      console.error('Error creating driver document:', error);
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
