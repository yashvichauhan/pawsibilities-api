const express = require('express');
const User = require('../models/User');
const router = express.Router();
const bcrypt = require('bcrypt');

router.post('/signup', async (req,res) => {
    try {
        const { username, email, password } = req.body;
        if (!(username && email && password)) {
          return res.status(400).json({ error: 'Username, email and password are required.' });
        }
    
        const user = new User(req.body);
        await user.save();
        user.password = undefined; // Remove password from response
        res.status(201).json(user);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
})

//Get username from signup API
router.get('/signup', async (req,res) => {
    try {
        const user = await User.find();
        res.status(200).json(user);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
})

const jwt = require('jsonwebtoken');

router.post('/login', async (req,res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(404).json({ error: 'User not found.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const token = jwt.sign({ userId: user.userId}, 'yourSecretKey', { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true }).send({ message: 'Login successful.' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
})

module.exports = router