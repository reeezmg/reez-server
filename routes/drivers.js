const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios')
const Driver = require('../models/Driver'); 
const User = require('../models/User'); 
const PickupPoint = require('../models/Pickuppoint');
const authenticateToken = require('../middleware/auth');
const router = express.Router();


router.put('/update', authenticateToken, async (req, res) => {
  const {
    pickuppoints, // Array of addresses to be added
    chargesOption,
    charges,
    lowerLimit,
    upperLimit,
    teamNumber,
    shiftTime,
    seatsAvailable,
    rotaType,
  } = req.body;

  try {
    const userId = req.user.id;

    console.log(userId);
    const driver = await Driver.findOne({ user: userId });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Update other driver details
    driver.chargesOption = chargesOption || driver.chargesOption;
    driver.charges = charges || driver.charges;
    driver.lowerLimit = lowerLimit || driver.lowerLimit;
    driver.upperLimit = upperLimit || driver.upperLimit;
    driver.teamNumber = teamNumber || driver.teamNumber;
    driver.shiftTime = shiftTime || driver.shiftTime;
    driver.seatsAvailable = seatsAvailable || driver.seatsAvailable;
    driver.rotaType = rotaType || driver.rotaType;

    // Process pickup points and save them in the PickupPoint schema
    if (Array.isArray(pickuppoints) && pickuppoints.length > 0) {
      const geocodedPoints = await Promise.all(
        pickuppoints.map(async (address) => {
          const geocodeResponse = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json`,
            {
              params: {
                address,
                key: 'AIzaSyBWcMC1VvjoU05e6oTv9M3vXGNm0O8ExGY', // Replace with your actual API key
              },
            }
          );

          const location = geocodeResponse.data.results[0]?.geometry.location;
          if (!location) {
            throw new Error(`Failed to geocode address: ${address}`);
          }

          // Create a new PickupPoint document
          const newPickupPoint = new PickupPoint({
            address,
            location: {
              type: 'Point',
              coordinates: [location.lng, location.lat],
            },
          });

          await newPickupPoint.save(); // Save the new pickup point to the database

          return newPickupPoint._id; // Return the ID of the newly created pickup point
        })
      );

      // Update the driver's pickuppoints with references to the newly created PickupPoint documents
      driver.pickuppoints = [...driver.pickuppoints, ...geocodedPoints];
    }

    // Save the updated driver
    await driver.save();

    res.status(200).json({ message: 'Driver information updated successfully', driver });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update driver information', error });
  }
});

router.get('/getdriverinfo', authenticateToken, async (req, res) => {
  const userId  =  req.user.id;
  console.log(userId)

  try {
    // Find the driver by userId and populate pickuppoints
    const driver = await Driver.findOne({ user: userId })
      .populate({
        path: 'pickuppoints',
        select: 'address _id', // Select only address and _id fields
      });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found.' });
    }

    res.status(200).json({
      message: 'Driver details fetched successfully.',
      driver,
    });
  } catch (error) {
    console.error('Error fetching driver details:', error.message);
    res.status(500).json({
      error: 'An error occurred while fetching driver details.',
    });
  }
});

router.delete('/pickuppoint/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPickuppoint = await PickupPoint.findByIdAndDelete(id);

    if (!deletedPickuppoint) {
      return res.status(404).json({ error: 'Pickup point not found' });
    }

    res.status(200).json({ message: 'Pickup point deleted successfully' });
  } catch (error) {
    console.error('Error deleting pickup point:', error);
    res.status(500).json({ error: 'Failed to delete pickup point' });
  }
});


const getCoordinatesFromAddress = async (address) => {
  const apiKey = 'AIzaSyBWcMC1VvjoU05e6oTv9M3vXGNm0O8ExGY'; // Replace with your Google Maps API key
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    if (response.data.results.length === 0) {
      throw new Error('Location not found');
    }
    const { lat, lng } = response.data.results[0].geometry.location;
    return { lat, lng };
  } catch (error) {
    throw new Error('Geocoding API error: ' + error.message);
  }
};


router.get('/', async (req, res) => {
  try {
    const {pickuppoint, shiftTime, rotaType, teamNumber,radius } = req.query;
  console.log(rotaType)
    // Convert radius from miles to meters
    const radiusInMeters = radius ? Number(radius) * 1609.34 : 2*1609.34;

    // Prepare the match filter for additional query parameters
    let matchFilter = { seatsAvailable: { $gt: 0 } };
    if (shiftTime) matchFilter.shiftTime = shiftTime;
    if (rotaType) matchFilter.rotaType = parseInt(rotaType);
    if (teamNumber) matchFilter.teamNumber = teamNumber;

    let drivers;

    // If pickuppoint and radius are provided, perform geospatial filtering
    if (pickuppoint && radiusInMeters) {
      const { lat, lng } = await getCoordinatesFromAddress(pickuppoint);

      // Step 1: Find the pickup points near the given location using $geoNear
      const pickuppoints = await PickupPoint.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distance',
            maxDistance: radiusInMeters,
            spherical: true,
          },
        },
        // Optionally, apply any additional filtering on the pickuppoints (if necessary)
      ]);

      // Extract the IDs of the nearby pickuppoints
      const pickuppointIds = pickuppoints.map(p => p._id);
      console.log(pickuppointIds);

      // Step 2: Find the drivers associated with these nearby pickuppoints
      drivers = await Driver.aggregate([
        {
          $match: {
            pickuppoints: { $in: pickuppointIds },
            ...matchFilter, // Apply any additional filters
          },
        },
        {
          $lookup: {
            from: 'pickuppoints', // Join with the Pickuppoint collection
            localField: 'pickuppoints', // Field from the drivers collection
            foreignField: '_id', // Field from the pickuppoints collection
            as: 'pickupDetails', // The resulting array field with pickup point details
          },
        },
        {
          $unwind: '$pickupDetails', // Unwind the pickupDetails array so we can access individual pickup points
        },
        {
          $match: {
            'pickupDetails._id': { $in: pickuppointIds }, // Filter the pickup details to only include the nearby ones
          },
        },
        {
          $group: {
            _id: '$_id', // Group by driver ID
            user: { $first: '$user' },
            chargesOption: { $first: '$chargesOption' },
            charges: { $first: '$charges' },
            lowerLimit: { $first: '$lowerLimit' },
            upperLimit: { $first: '$upperLimit' },
            teamNumber: { $first: '$teamNumber' },
            shiftTime: { $first: '$shiftTime' },
            seatsAvailable: { $first: '$seatsAvailable' },
            rotaType: { $first: '$rotaType' },
            // Collect pickup point addresses for each driver
            pickupAddresses: { $push: '$pickupDetails.address' }, // Push the address of each nearby pickup point
            distances: { $push: '$pickupDetails.distance' }, // Push the distance to each nearby pickup point
          },
        },
        {
          $lookup: {
            from: 'users', // Lookup user details
            localField: 'user',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        {
          $unwind: {
            path: '$userDetails',
            preserveNullAndEmptyArrays: true, // Optional: Include drivers without user details
          },
        },
        {
          $project: {
            userDetails: 1,
            chargesOption: 1,
            charges: 1,
            lowerLimit: 1,
            upperLimit: 1,
            teamNumber: 1,
            shiftTime: 1,
            seatsAvailable: 1,
            rotaType: 1,
            pickupAddresses: 1, // Return only the addresses of the nearby pickup points
            distances: 1, // Return the distances to the nearby pickup points
          },
        },
      ]);
     
      console.log( { drivers,nearLocation:true });
      res.status(200).json( { drivers,nearLocation:true });
    } else {
      drivers = await Driver.aggregate([
        {
          $match: matchFilter,
        },
        {
          $lookup: {
            from: 'pickuppoints', // Join with the Pickuppoint collection
            localField: 'pickuppoints', // Field from the drivers collection
            foreignField: '_id', // Field from the pickuppoints collection
            as: 'pickupDetails', // The resulting array field with pickup point details
          },
        },
        {
          $unwind: {
            path: '$pickupDetails',
            preserveNullAndEmptyArrays: true, // Keep drivers with no pickup point
          },
        },
        {
          $group: {
            _id: '$_id', // Group by driver ID
            user: { $first: '$user' },
            chargesOption: { $first: '$chargesOption' },
            charges: { $first: '$charges' },
            lowerLimit: { $first: '$lowerLimit' },
            upperLimit: { $first: '$upperLimit' },
            teamNumber: { $first: '$teamNumber' },
            shiftTime: { $first: '$shiftTime' },
            seatsAvailable: { $first: '$seatsAvailable' },
            rotaType: { $first: '$rotaType' },
            // Collect pickup point addresses for each driver
            pickupAddresses: { $push: '$pickupDetails.address' }, // Push the address of each pickup point
          },
        },
        {
          $lookup: {
            from: 'users', // Lookup user details
            localField: 'user',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        {
          $unwind: {
            path: '$userDetails',
            preserveNullAndEmptyArrays: true, // Optional: Include drivers without user details
          },
        },
        {
          $project: {
            userDetails: 1,
            chargesOption: 1,
            charges: 1,
            lowerLimit: 1,
            upperLimit: 1,
            teamNumber: 1,
            shiftTime: 1,
            seatsAvailable: 1,
            rotaType: 1,
            pickupAddresses: 1, // Return the addresses of all pickup points
          },
        },
      ]);
      console.log(drivers);
      res.status(200).json({ drivers });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve drivers', error: error.message });
  }
});



module.exports = router;
