// routes/tap.js
const express = require("express");
const router = express.Router();
const User = require("../models/UserModel");
const Log = require("../models/LogModel");

// POST /api/tap - Handle tap requests
router.post("/", async (req, res) => {
  try {
    console.log("[TAP-ROUTER] Incoming request body:", req.body);

    let parsedBody = req.body;
    let uid;

    // If body is raw buffer/string, try parsing it
    if (Buffer.isBuffer(req.body)) {
      const bodyStr = req.body.toString();
      console.log("[TAP-ROUTER] Raw buffer string:", bodyStr);

      try {
        parsedBody = JSON.parse(bodyStr);
      } catch (error) {
        console.log("[TAP-ROUTER] JSON parse failed:", error.message);

        // Regex fallback to extract UID
        const uidMatch = bodyStr.match(/([A-Fa-f0-9]{6,})/);
        if (uidMatch) {
          parsedBody = { uid: uidMatch[1].toUpperCase() };
          console.log("[TAP-ROUTER] UID extracted manually:", parsedBody);
        } else {
          return res.status(400).json({
            error: true,
            message: "Malformed body and UID could not be extracted",
            code: "MALFORMED_BODY",
          });
        }
      }
    }

    // Extract UID
    if (parsedBody && parsedBody.uid) {
      uid = parsedBody.uid;
    }

    if (!uid) {
      console.log("[TAP-ROUTER] Missing UID in request");
      return res
        .status(400)
        .json({ error: true, message: "UID is required", code: "MISSING_UID" });
    }

    // Normalize UID
    const cleanUid = uid
      .toString()
      .trim()
      .toUpperCase()
      .replace(/[^0-9A-F]/g, "");
    console.log("[TAP-ROUTER] Cleaned UID:", cleanUid);

    if (!cleanUid || cleanUid.length < 6) {
      return res.status(400).json({
        error: true,
        message: "Invalid UID format",
        code: "INVALID_UID",
      });
    }

    // Find user in DB
    const user = await User.findOne({ uid: cleanUid });
    if (!user) {
      console.log(`[TAP-ROUTER] Unregistered UID tapped: ${cleanUid}`);
      return res.json({
        error: false,
        message: `UID ${cleanUid} not registered. Please register this UID first.`,
        code: "NOT_REGISTERED",
        uid: cleanUid,
        registrationHelp: {
          message: `To register this UID, use: POST /api/users`,
          example: {
            name: "Your Name",
            uid: cleanUid,
            email: "your.email@example.com",
            phoneNumber: "+1234567890",
            gender: "Male",
          },
        },
      });
    }

    // Get today’s date in Asia/Manila
    function getTodayDate() {
      return new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Manila",
      });
    }

    const today = getTodayDate();
    console.log(`[TAP-ROUTER] Processing tap for ${user.name} on ${today}`);

    // Fetch today’s logs
    const todayLogs = await Log.find({ uid: cleanUid, date: today }).sort({
      timestamp: -1,
    });

    // Daily tap limit (8 per day)
    if (todayLogs.length >= 8) {
      return res.json({
        error: false,
        message: "Daily tap limit reached (8 taps).",
        name: user.name,
        code: "LIMIT_REACHED",
      });
    }

    // Alternate between tap-in / tap-out
    let tapType =
      todayLogs.length === 0 || todayLogs[0].type === "tap-out"
        ? "tap-in"
        : "tap-out";

    // Create new log
    const newLog = new Log({
      uid: cleanUid,
      name: user.name,
      date: today,
      type: tapType,
      timestamp: new Date(),
    });

    await newLog.save();
    console.log(
      `[TAP-ROUTER] SUCCESS: ${tapType} recorded for ${user.name} (UID: ${cleanUid})`
    );

    // Get recent logs
    const recentLogs = await Log.find().sort({ timestamp: -1 }).limit(10);

    const result = {
      error: false,
      message: `${tapType} recorded successfully`,
      name: user.name,
      type: tapType,
      timestamp: newLog.timestamp,
      date: today,
      code: "SUCCESS",
      uid: cleanUid,
      _id: newLog._id,
      logs: recentLogs,
    };

    // Emit to sockets (if socket.io attached)
    const io = req.app.get("io");
    if (io) io.emit("new-log", result);

    return res.json(result);
  } catch (err) {
    console.error("[TAP-ROUTER] Error:", err);
    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "SERVER_ERROR",
    });
  }
});

module.exports = router;
