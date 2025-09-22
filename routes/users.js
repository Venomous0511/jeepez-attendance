const express = require('express');
const router = express.Router();
const User = require('../models/UserModel');

/**
 * @route   GET /api/users
 * @desc    Get all users (sorted by newest first)
 */
router.get('/', async (req, res) => {
  try {
    console.log('[USERS] Fetching all users');
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('[USERS] Error fetching users:', err);
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 */
router.get('/:id', async (req, res) => {
  try {
    console.log(`[USERS] Fetching user: ${req.params.id}`);
    const user = await User.findById(req.params.id);

    if (!user) {
      console.warn(`[USERS] User not found: ${req.params.id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(`[USERS] Error fetching user ${req.params.id}:`, err);
    res.status(500).json({ message: 'Error fetching user', error: err.message });
  }
});

/**
 * @route   POST /api/users
 * @desc    Create new user
 */
router.post('/', async (req, res) => {
  try {
    const { name, uid, gender, email, phoneNumber } = req.body;

    if (!name || !uid) {
      return res.status(400).json({ message: 'Name and UID are required' });
    }

    const user = new User({
      name,
      uid: uid.toUpperCase().trim(),
      gender,
      email,
      phoneNumber
    });

    const savedUser = await user.save();
    console.log(`[USERS] Created new user: ${savedUser._id}`);
    res.status(201).json(savedUser);
  } catch (err) {
    console.error('[USERS] Error creating user:', err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        message: `${field} already exists`,
        error: `Duplicate ${field}: ${err.keyValue[field]}`
      });
    }

    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed', error: err.message });
    }

    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, uid, gender, email, phoneNumber } = req.body;

    const updateData = { name, gender, email, phoneNumber };
    if (uid) updateData.uid = uid.toUpperCase().trim();

    console.log(`[USERS] Updating user: ${req.params.id}`);
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      console.warn(`[USERS] User not found: ${req.params.id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error(`[USERS] Error updating user ${req.params.id}:`, err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        message: `${field} already exists`,
        error: `Duplicate ${field}: ${err.keyValue[field]}`
      });
    }

    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed', error: err.message });
    }

    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid ID format', error: err.message });
    }

    res.status(500).json({ message: 'Error updating user', error: err.message });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 */
router.delete('/:id', async (req, res) => {
  try {
    console.log(`[USERS] Deleting user: ${req.params.id}`);
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      console.warn(`[USERS] User not found: ${req.params.id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`[USERS] Deleted user: ${req.params.id}`);
    res.json({ message: 'User deleted successfully', user: deletedUser });
  } catch (err) {
    console.error(`[USERS] Error deleting user ${req.params.id}:`, err);
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
});

module.exports = router;
