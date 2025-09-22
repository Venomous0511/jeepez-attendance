const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    uid: {
      type: String,
      required: [true, 'UID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [
        /^[0-9A-F]{6,20}$/,
        'UID must be a valid hexadecimal string (6–20 characters)'
      ]
    },
    gender: {
      type: String,
      enum: {
        values: ['Male', 'Female', 'Other'],
        message: 'Gender must be Male, Female, or Other'
      },
      required: [true, 'Gender is required']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [ /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email must be valid' ]
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [
        /^\+63\d{10}$/,
        'Phone number must start with +63 and be 13 characters long (e.g., +639123456789)'
      ]
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
