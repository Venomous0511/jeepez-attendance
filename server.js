require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const usersroutes = require('./routes/users');
const logsroutes = require('./routes/logs');
const taproutes = require('./routes/tap');

const User = require('./models/UserModel');
const Log = require('./models/LogModel');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

/* -------------------- Middlewares -------------------- */
app.use(cors());

// ✅ Use raw parser only for /api/tap
app.use('/api/tap', express.raw({ type: '*/*' }));

// ✅ Use normal JSON parser for all other endpoints
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Request logging
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path} - Content-Type: ${req.headers['content-type'] || 'none'}`);
  if (req.body && Object.keys(req.body).length > 0 && !(req.body instanceof Buffer)) {
    console.log(`[REQUEST] Body:`, req.body);
  }
  next();
});

/* -------------------- Routes -------------------- */
app.use(express.static(path.join(__dirname, 'dashboard')));
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
});

app.get('/dashboard/edit.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'edit.html'));
});

// API routes
app.use('/api/users', usersroutes);
app.use('/api/logs', logsroutes);
app.use('/api/tap', taproutes);

app.set("io", io);

/* -------------------- Utilities -------------------- */
function getTodayDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

/* -------------------- Debug Endpoints -------------------- */
app.get('/api/debug/logs', async (req, res) => {
  try {
    const today = getTodayDate();
    const todayLogs = await Log.find({ date: today }).sort({ timestamp: -1 });
    const allLogs = await Log.find().sort({ timestamp: -1 }).limit(20);

    res.json({
      today,
      todayLogsCount: todayLogs.length,
      todayLogs: todayLogs.slice(0, 10),
      recentLogs: allLogs.slice(0, 10),
      totalLogsInDB: await Log.countDocuments()
    });
  } catch (err) {
    console.error('[DEBUG] Error fetching logs:', err);
    res.status(500).json({ error: true, message: 'Error fetching debug logs' });
  }
});

app.get('/api/debug/uid/:uid', async (req, res) => {
  try {
    const uid = req.params.uid.toUpperCase().trim();
    const today = getTodayDate();

    const user = await User.findOne({ uid });
    const todayLogs = await Log.find({ uid, date: today }).sort({ timestamp: -1 });
    const allUserLogs = await Log.find({ uid }).sort({ timestamp: -1 }).limit(10);

    res.json({
      uid,
      today,
      userExists: !!user,
      user: user ? { name: user.name, uid: user.uid } : null,
      todayLogsCount: todayLogs.length,
      todayLogs,
      recentUserLogs: allUserLogs
    });
  } catch (err) {
    console.error('[DEBUG] Error fetching UID info:', err);
    res.status(500).json({ error: true, message: 'Error fetching UID info' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Server is running',
    today: getTodayDate(),
    uptime: process.uptime()
  });
});

app.post('/api/test-tap', (req, res) => {
  console.log('[TEST] Test tap request body:', req.body);
  res.json({
    message: 'Test successful - check server logs',
    receivedBody: req.body,
    timestamp: new Date().toISOString(),
    today: getTodayDate()
  });
});

app.post('/api/register-test-user', async (req, res) => {
  try {
    const { uid, name, email, phoneNumber, gender } = req.body;
    const cleanUID = uid.toUpperCase().trim();

    const user = new User({
      uid: cleanUID,
      name: name || 'Test User',
      email: email || `test${Date.now()}@example.com`,
      phoneNumber: phoneNumber || '+1234567890',
      gender: gender || 'Other'
    });

    await user.save();
    console.log(`[REGISTER] Created test user: ${name} with UID: ${cleanUID}`);

    res.json({ message: 'User registered successfully', user: { uid: cleanUID, name } });
  } catch (err) {
    console.error('[REGISTER] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- Socket.io -------------------- */
io.on("connection", (socket) => {
  console.log("[SOCKET] Client connected");
  socket.on("disconnect", () => console.log("[SOCKET] Client disconnected"));
});

/* -------------------- Global Error Handler -------------------- */
app.use((err, req, res, next) => {
  console.error('[ERROR] Global error handler:', err);
  res.status(500).json({ error: true, message: 'Something went wrong!', code: 'GLOBAL_ERROR' });
});

/* -------------------- Start Server -------------------- */
const PORT = process.env.PORT || 3000;
const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/rfid_attendance';

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('[DB] MongoDB connected successfully');
    server.listen(PORT, () => {
      console.log(`[SERVER] Server running on port ${PORT}`);
      console.log(`[SERVER] Health check at http://localhost:${PORT}/api/health`);
      console.log(`[SERVER] Debug logs at http://localhost:${PORT}/api/debug/logs`);
      console.log(`[SERVER] POST /api/tap - Main RFID tap endpoint`);
    });
  })
  .catch(err => {
    console.error('[DB] MongoDB connection error:', err);
    process.exit(1);
  });
