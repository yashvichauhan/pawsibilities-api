const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');
const User = require('../models/User');
const s3 = require('../config/aws');
const upload = require('../config/multer');
const { v4: uuidv4 } = require('uuid');
// Keep only one import of mongoose
const mongoose = require('mongoose'); 

router.post('/pets', upload.single('image'), async (req, res) => {
  try {
    
    const { name, species, breed, age, gender, size, color, description, available, owner } = JSON.parse(req.body.data);

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
        Key: `pets/${uuidv4()}-${req.file.originalname}`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      const uploadResult = await s3.upload(s3Params).promise();
      imageUrl = uploadResult.Location;
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
      owner: ownerId, // Ensure it's treated as ObjectId
    });

    await pet.save();

    user.pets.push(pet._id);
    await user.save();

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
  

module.exports = router;
