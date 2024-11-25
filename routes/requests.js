const express = require('express');
const mongoose = require('mongoose');
const authenticateToken = require('../middleware/auth');
const Request = require('../models/Request'); // Adjust the path as needed
const nodemailer = require('nodemailer');
const User = require('../models/User'); 
const Driver = require('../models/Driver'); 
const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
    const { driverId, days } = req.body;
    const passengerId = req.user.id;
  
    console.log(driverId, passengerId, days);
  
    // Validate the input
    if (!passengerId || !driverId || !Array.isArray(days) || days.length === 0) {
      return res.status(400).json({
        error: 'Invalid input. Please provide passengerId, driverId, and a non-empty days array.',
      });
    }
  
    try {
      // Create a new request
      const newRequest = new Request({
        passengerId,
        driverId,
        days,
      });
  
      // Save to the database
      const savedRequest = await newRequest.save();
  
      // Fetch the driver's email
      const driver = await Driver.findById(driverId).populate('user').exec(); // Assuming the User model has a field `email`
      console.log(driver)
      if (!driver) {
        return res.status(404).json({
          error: 'Driver not found or email not available.',
        });
      }
  
      // Fetch the passenger's contact details
      const passenger = await User.findById(passengerId); // Get passenger info (including contact details)
      if (!passenger || !passenger.email) {
        return res.status(404).json({
          error: 'Passenger not found or contact details not available.',
        });
      }
  
      // Send an email to the driver using Nodemailer
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'reezmohdmg22@gmail.com', // Replace with your Gmail account
          pass: 'gzam ocbd zipz sdef',   // Replace with your Gmail app password
        },
      });
  
      const mailOptions = {
        from: 'reez@gmail.com', // Your email address
        to: driver.email, // Driver's email address
        subject: '🚗 New Service Request Received!',
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #4CAF50;">New Request for Your Service</h2>
          <p>Dear Driver,</p>
          <p>You have received a new service request from <strong>${passenger.name}</strong>. Please find the details below:</p>
          <hr style="border: none; border-top: 1px solid #ccc;">
          <h3 style="color: #333;">Request Details:</h3>
          <ul style="list-style-type: none; padding: 0;">
            <li><strong>Requested Days:</strong> ${days.join(', ')}</li>
          </ul>
          <hr style="border: none; border-top: 1px solid #ccc;">
          <h3 style="color: #333;">Passenger Contact:</h3>
          <ul style="list-style-type: none; padding: 0;">
            ${passenger.phone ? `<li><strong>Phone:</strong> ${passenger.phone}</li>` : ''}
            <li><strong>Email:</strong> ${passenger.email}</li>
          </ul>
          <hr style="border: none; border-top: 1px solid #ccc;">
          <p>Please review the request and respond promptly.</p>
          <p style="color: #666;">Best regards,<br>Your Reez Team</p>
        </div>
        `
      };
      
  
      // Send email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
  
      // Respond with the created request
      res.status(201).json({
        message: 'Request created successfully.',
        request: savedRequest,
      });
    } catch (err) {
      console.error('Error creating request:', err.message);
      res.status(500).json({
        error: 'An error occurred while creating the request.',
      });
    }
  });
  

// GET endpoint to fetch all requests for a specific driver
router.get('/driver', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    console.log(userId)
  
    try {
      const driver = await Driver.findOne({ user: userId });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
      // Fetch all requests for the specified driver and populate the entire passengerId
      const requests = await Request.find({ driverId:driver._id })
        .populate('passengerId')  // This will populate all fields from the User schema
        .exec();
  
      if (!requests || requests.length === 0) {
        return res.status(404).json({
          error: 'No requests found for this driver.',
        });
      }
  
      // Respond with the list of requests
      res.status(200).json({
        message: 'Requests fetched successfully.',
        requests,
      });
    } catch (err) {
      console.error('Error fetching requests:', err.message);
      res.status(500).json({
        error: 'An error occurred while fetching requests.',
      });
    }
  });

  router.get('/passenger', authenticateToken, async (req, res) => {
    const passengerId = req.user.id;
  
    try {
      // Fetch all requests for the specified passenger and populate related fields
      const requests = await Request.find({ passengerId })
        .populate({
          path: 'driverId',        // Populate the driverId field
          populate: [
            {
              path: 'user',        // Populate the user field within driverId
              select: 'name email', // Optionally select only name and email
            },
            {
              path: 'pickuppoints', // Populate the pickuppoints field within driverId
              select: 'address location', // Optionally select address and location
            },
          ],
        })
        .exec();
  
      if (!requests || requests.length === 0) {
        return res.status(404).json({
          error: 'No requests found for this passenger.',
        });
      }
  
      // Respond with the list of requests
      res.status(200).json({
        message: 'Requests fetched successfully.',
        requests,
      });
    } catch (err) {
      console.error('Error fetching requests:', err.message);
      res.status(500).json({
        error: 'An error occurred while fetching requests.',
      });
    }
  });
  
  
  

module.exports = router;
