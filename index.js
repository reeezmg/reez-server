const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/users');
const requestRoutes = require('./routes/requests');
const driverRoutes = require('./routes/drivers');
const otpRoutes = require('./routes/otp');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cookieParser());
// Middleware
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'https://reez-one.vercel.app',
      'https://www.reez.uk'
    ],    
    credentials: true,
  })
);
app.use(express.json());


  mongoose
  .connect('mongodb+srv://pool:pool@cluster0.jmazz.mongodb.net/pool?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('Connected!'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));
// Routes
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/otp', otpRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
