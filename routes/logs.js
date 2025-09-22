const express = require('express');
const router = express.Router();
const Log = require('../models/LogModel');

// Get local Date
function getLocalDateString() {
  const now = new Date();
  // Format YYYY-MM-DD in Philippines timezone
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

// Helper: format log object
const formatLog = (log) => ({
  _id: log._id,
  uid: log.uid,
  name: log.name,
  date: log.date,
  type: log.type,
  timestamp: log.timestamp
});

// GET all logs (sorted by most recent)
router.get('/', async (req, res) => {
  try {
    console.log('[LOGS] Fetching all logs');
    const logs = await Log.find().sort({ timestamp: -1 });
    res.json(logs.map(formatLog));
    console.log(`[LOGS] Retrieved ${logs.length} logs`);
  } catch (err) {
    console.error('[LOGS] Error fetching logs:', err);
    res.status(500).json({ message: 'Error fetching logs', error: err.message || err });
  }
});

// GET logs for a specific date
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    console.log(`[LOGS] Fetching logs for date: ${date}`);
    const logs = await Log.find({ date }).sort({ timestamp: -1 });
    res.json(logs.map(formatLog));
    console.log(`[LOGS] Retrieved ${logs.length} logs for ${date}`);
  } catch (err) {
    console.error(`[LOGS] Error fetching logs for date ${req.params.date}:`, err);
    res.status(500).json({ message: 'Error fetching logs for date', error: err.message || err });
  }
});

// GET logs for a specific user
router.get('/user/:uid', async (req, res) => {
  try {
    const cleanUid = req.params.uid.toUpperCase().trim();
    console.log(`[LOGS] Fetching logs for UID: ${cleanUid}`);
    const logs = await Log.find({ uid: cleanUid }).sort({ timestamp: -1 });
    res.json(logs.map(formatLog));
    console.log(`[LOGS] Retrieved ${logs.length} logs for UID ${cleanUid}`);
  } catch (err) {
    console.error(`[LOGS] Error fetching logs for UID ${req.params.uid}:`, err);
    res.status(500).json({ message: 'Error fetching user logs', error: err.message || err });
  }
});

// GET today's logs
router.get('/today', async (req, res) => {
  try {
    const today = getLocalDateString();
    console.log(`[LOGS] Fetching today's logs: ${today}`);
    const logs = await Log.find({ date: today }).sort({ timestamp: -1 });
    res.json(logs.map(formatLog));
    console.log(`[LOGS] Retrieved ${logs.length} logs for today`);
  } catch (err) {
    console.error('[LOGS] Error fetching today\'s logs:', err);
    res.status(500).json({ message: 'Error fetching today\'s logs', error: err.message || err });
  }
});

// DELETE a specific log (admin function)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[LOGS] Deleting log: ${id}`);
    const deletedLog = await Log.findByIdAndDelete(id);

    if (!deletedLog) {
      console.log(`[LOGS] Log not found: ${id}`);
      return res.status(404).json({ message: 'Log not found' });
    }

    console.log(`[LOGS] Successfully deleted log: ${id}`);
    res.json({ message: 'Log deleted successfully', deletedLog: formatLog(deletedLog) });
  } catch (err) {
    console.error(`[LOGS] Error deleting log ${req.params.id}:`, err);
    res.status(500).json({ message: 'Error deleting log', error: err.message || err });
  }
});

// GET attendance summary for a specific date
router.get('/summary/:date', async (req, res) => {
  try {
    const { date } = req.params;
    console.log(`[LOGS] Generating summary for date: ${date}`);
    const logs = await Log.find({ date }).sort({ timestamp: 1 });

    // Group logs by UID
    const userLogs = {};
    logs.forEach(log => {
      if (!userLogs[log.uid]) userLogs[log.uid] = [];
      userLogs[log.uid].push(log);
    });

    // Calculate summaries
    const summary = Object.keys(userLogs).map(uid => {
      const userLogList = userLogs[uid];
      const tapInCount = userLogList.filter(l => l.type === 'tap-in').length;
      const tapOutCount = userLogList.filter(l => l.type === 'tap-out').length;

      return {
        uid,
        name: userLogList[0].name,
        tapInCount,
        tapOutCount,
        totalTaps: userLogList.length,
        isComplete: tapInCount === tapOutCount && tapInCount > 0,
        logs: userLogList.map(l => ({ type: l.type, timestamp: l.timestamp }))
      };
    });

    console.log(`[LOGS] Summary generated for ${summary.length} users on ${date}`);
    res.json({ date, totalUsers: summary.length, users: summary });
  } catch (err) {
    console.error(`[LOGS] Error generating summary for ${req.params.date}:`, err);
    res.status(500).json({ message: 'Error generating attendance summary', error: err.message || err });
  }
});

module.exports = router;
