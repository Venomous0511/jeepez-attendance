const mongoose = require('mongoose');

function getLocalDateString() {
  const now = new Date();
  // Format YYYY-MM-DD in Philippines timezone
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

const logSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: [true, 'UID is required'],
      trim: true,
      uppercase: true,
      index: true // Single-field index for quick UID lookups
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: [true, 'Date is required'],
      index: true,
      match: [
        /^\d{4}-\d{2}-\d{2}$/,
        'Date must be in YYYY-MM-DD format'
      ]
    },
    type: {
      type: String,
      enum: {
        values: ['tap-in', 'tap-out'],
        message: 'Type must be either tap-in or tap-out'
      },
      required: [true, 'Tap type is required']
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt automatically
  }
);

// Compound indexes
logSchema.index({ uid: 1, date: 1 }); // For per-user daily lookups
logSchema.index({ date: 1, timestamp: -1 }); // For daily log sorting

// Instance method to format the log for API responses
logSchema.methods.toJSON = function () {
  const log = this.toObject();
  return {
    _id: log._id,
    uid: log.uid,
    name: log.name,
    date: log.date,
    type: log.type,
    timestamp: log.timestamp
  };
};

// Static method: get today's logs for a specific UID
logSchema.statics.getTodaysLogs = async function (uid) {
  const today = getLocalDateString();
  return this.find({
    uid: uid.toUpperCase().trim(),
    date: today
  }).sort({ timestamp: -1 });
};

// Static method: get recent logs (default: last 10)
logSchema.statics.getRecentLogs = async function (limit = 10) {
  return this.find()
    .sort({ timestamp: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Log', logSchema);
