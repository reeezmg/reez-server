// server.js or a dedicated routes file
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'reezmohdmg22@gmail.com', // Replace with your Gmail account
    pass: 'gzam ocbd zipz sdef',   // Replace with your Gmail app password
  },
});

router.post('/', async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP

  try {
    await transporter.sendMail({
      from: 'reez@gmail.com',
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP is: ${otp}`,
      html: `<p>Your OTP is: <strong>${otp}</strong></p>`,
    });

    res.status(200).json({ message: 'OTP sent successfully', otp }); // For development only; in production, do not send OTP back
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
});

module.exports = router;
