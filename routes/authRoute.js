/**
 * Sign up and login routes for users.
 */

const express = require('express');
const User = require('../models/User');
const router = express.Router();
const bcrypt = require('bcrypt');

// POST /api/signup - Create a new user
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

// GET /api/signup - Get all users
router.get('/signup', async (req,res) => {
    try {
        const user = await User.find();
        res.status(200).json(user);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
})

const jwt = require('jsonwebtoken');

// POST /api/login - Login user
router.post('/login', async (req,res) => {
    try {
        const { email, password } = req.body;
        // Find user by email in a case-insensitive way
        const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
        if (!user) {
          return res.status(404).json({ error: 'User not found.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const token = jwt.sign({ userId: user.userId, roleId: user.roleId}, 'yourSecretKey', { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true });
        console.log({
          email: user.email,
          roleId: user.roleId,
          userID: user._id,
          username: user.username,
        });
        
        res.status(200).send({ username: user.username, email: user.email, roleId: user.roleId,  userID: user._id, message: 'Login successful.' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
})

// GET /api/users - Get all users
router.get('/users', async (req,res) => {
    try {
        const user = await User.find();
        res.status(200).json(user);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
})

// GET /api/user/:userId - Get user by id
router.get('/user/:userId', async (req,res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found.' });
        }
        res
          .status(200)
          .json(user);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
})

// PUT /api/user/:userId - Update user by id
router.put('/user/:userId', async (req,res) => {
  console.log("***" + req.params.userId);
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
          console.log("***1" + req.params.userId);
          return res.status(404).json({ error: 'User not found.' });
        }

        console.log("***2" + req.params.userId);
        const newUser = req.body;
        
        if (newUser.newPassword && newUser.newPassword.trim() !== '') {
          // user.password = await bcrypt.hash(newUser.password, 10);
          user.password = newUser.newPassword;
          console.log("***3" + req.params.userId);
        }
        user.username = newUser.username;
        user.email = newUser.email;

        console.log("***4" + req.params.userId);
        await user.save();
        console.log("**5*" + req.params.userId);
        res.status(200).json(user);
        console.log("**6*" + req.params.userId);
      } catch (error) {s
        res.status(500).json({ error: error.message });
      }
})

// DELETE /api/user/:userId - Delete user by id
router.get('/signout', async (req,res) => {

    res.clearCookie("token")
    return res.status(200).json({message: "signed out"})

})

module.exports = router