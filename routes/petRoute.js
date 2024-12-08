/**
 * Pet Routes for various operations on pets
 */

const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');
const User = require('../models/User');
const s3 = require('../config/aws').s3;
const upload = require('../config/multer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const rekognition = require('../config/aws').rekognition;
const mongoose = require('mongoose'); 

// POST /upload-and-analyze - Upload an image to S3 and analyze it using Rekognition
router.post('/upload-and-analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const s3Params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: pets/${uuidv4()}-${req.file.originalname}, 
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const s3UploadResult = await s3.upload(s3Params).promise();
    const s3Key = s3Params.Key;
    const imageUrl = s3UploadResult.Location; // Public URL of the uploaded image

    const rekognitionParams = {
      Image: {
        S3Object: {
          Bucket: process.env.AWS_BUCKET_NAME,
          Name: s3Key,
        },
      },
      MaxLabels: 10,
      MinConfidence: 75,
    };

    const rekognitionResponse = await rekognition.detectLabels(rekognitionParams).promise();
    const labels = rekognitionResponse.Labels.map(label => label.Name);

    res.status(200).json({ imageUrl, labels });
  } catch (error) {
    console.error('Error in Upload and Analyze:', error);
    res.status(500).json({
      error: 'Failed to upload and analyze image.',
      details: error.message,
    });
  }
});

// POST /pets - Create a new pet 
router.post('/pets', upload.single('image'), async (req, res) => {
  try {
    
    const { name, species, breed, age, gender, size, color, description, available, owner, longitude, latitude } = JSON.parse(req.body.data);
    const ownerId = mongoose.Types.ObjectId.isValid(owner) ? new mongoose.Types.ObjectId(owner) : null;

    // Check if owner is provided and convert to ObjectId if it's a valid string
    if (!ownerId) {
      return res.status(400).json({ error: 'Invalid or missing owner ID.' });
    }

    const user = await User.findById(owner);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let imageUrl = '';

    if (req.file) {
      const s3Params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: pets/${uuidv4()}-${req.file.originalname},
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      console.log('s3Params:', s3Params);
      try {
        const uploadResult = await s3.upload(s3Params).promise();
        console.log('Upload successful:', uploadResult);
        imageUrl = uploadResult.Location;
      } catch (error) {
        console.error('S3 upload error:', error);
        throw error;
      }
    }

    // Proceed with pet creation as usual
    const pet = new Pet({
      name,
      species,
      breed,
      age,
      gender,
      size,
      color,
      description,
      available,
      imageUrl,
      owner: ownerId, 
      location: {
        longitude,
        latitude,
      }
    });

    await pet.save();

    user.pets.push(pet._id);
    await user.save();

    // res.status(201).json({ pet, labels: rekognitionLabels });
    res.status(201).json(pet);
  } catch (error) {
    console.error('Error creating pet:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /user/:userId/pets - Get all pets for a specific user
router.get('/user/:userId/pets', async (req, res) => {
    try {
      const user = await User.findById(req.params.userId).populate('pets');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.status(200).json(user.pets); // Returns an array of pet documents
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

// GET /pets - Get all pets
router.get('/pets', async (req, res) => {
    try {
      const pets = await Pet.find({ available: true });

      const modifiedPets = pets.map(pet => {
        if (!pet.location) {
          pet.location = null; 
        }
        return pet;
      });

      res.status(200).json(modifiedPets);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// PATCH /pet/:petId - Update pet details
router.patch('/pet/:petId', async (req, res) => {
  try {
    const petId = req.params.petId;
    const updateData = req.body;

    // Find the pet by ID and update it with fields from the request body
    const pet = await Pet.findByIdAndUpdate(petId, updateData, { new: true });

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    res.status(200).json(pet);
  } catch (error) {
    console.error('Error updating pet:', error);
    res.status(500).json({ error: 'Failed to update pet details' });
  }
});

// DELETE /pet/:petId - Delete a pet
router.delete('/pet/:petId', async (req, res) => {
  try {
    const petId = req.params.petId;
    const pet = await Pet.findByIdAndDelete(petId);

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting pet:', error);
    res.status(500).json({ error: 'Failed to delete pet' });
  }
});

// GET /pet/:petId/interested-adopters - Get all interested adopters for a pet
router.get('/pet/:petId/interested-adopters', async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.petId).populate('interestedAdopters', 'username email'); // Populate only username and email fields
    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    res.status(200).json(pet.interestedAdopters); // Return the list of interested adopters
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /pet/:petId/interest - Show interest in a pet
router.patch('/pet/:petId/interest', async (req, res) => {
  try {
    const { userId } = req.body; // Expecting userId to be passed in the request body
    const pet = await Pet.findById(req.params.petId);

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    if (!pet.interestedAdopters.includes(userId)) {
      pet.interestedAdopters.push(userId); // Add userId to the list of interested adopters
      await pet.save();
      res.status(200).json({ message: 'Interest submitted successfully!' });
    }
    else{
      res.status(200).json({ message: 'You have aready shown interest!' });
    }

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /pet/:petId/favorite - Add favorite pets to a list
router.patch('/pet/:petId/favorite', async (req, res) => {
  const { petId } = req.params;
  const { userId } = req.body;

  try {
    // Find the pet by ID
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    // Toggle favorite status by directly checking if the user is in the favorites array
    if (pet.favorites.includes(userId)) {
      // Remove user from favorites
      pet.favorites = pet.favorites.filter(id => id !== userId);
    } else {
      // Add user to favorites
      pet.favorites.push(userId);
    }

    // Save the updated pet
    await pet.save();
    res.status(200).json({ message: 'Favorite status updated', favorites: pet.favorites });
  } catch (error) {
    console.error('Error updating favorite status:', error);
    res.status(500).json({ error: 'Failed to update favorite status' });
  }
});


// GET /user/:userId/favorites - Get all favorite pets for a user
router.get('/user/:userId/favorites', async (req, res) => {
  const { userId } = req.params;

  try {
    // Convert userId to ObjectId correctly using 'new'
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find all pets where the userId is in the favorites array
    const favoritePets = await Pet.find({ favorites: userObjectId })
      .populate('owner', 'username') // Populate the owner field with the username
      .exec();

    res.status(200).json(favoritePets);
  } catch (error) {
    console.error('Error fetching favorite pets:', error);
    res.status(500).json({ error: 'Failed to fetch favorite pets' });
  }
});
// GET /pet/:petId/contact-owner - Get the contact details of the pet's owner
router.get('/pet/:petId/contact-owner', async (req, res) => {
  try {
    // Find the pet by ID and populate the owner's username and email
    const pet = await Pet.findById(req.params.petId).populate('owner', 'username email');
    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    const owner = pet.owner;
    if (!owner) {
      return res.status(404).json({ error: 'Owner details not found' });
    }

    // Return only the owner's contact details
    res.status(200).json({
      ownerUsername: owner.username,
      ownerEmail: owner.email,
    });
  } catch (error) {
    console.error('Error fetching owner details:', error);
    res.status(500).json({ error: 'Failed to fetch owner details.' });
  }
});

module.exports = router;
