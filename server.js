// Simple Roblox backend test
// Confirms that Render + Roblox Studio connection works
// Uses the updated Roblox Users API

import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// root route
app.get("/", (req, res) => {
  res.send("✅ Your Roblox backend is running!");
});

// /find?user=MiniToon
app.get("/find", async (req, res) => {
  const username = req.query.user;
  if (!username) {
    return res.json({ success: false, message: "Missing ?user parameter" });
  }

  try {
    // Roblox’s new API endpoint for username → userId
    const url = "https://users.roblox.com/v1/usernames/users";
    const robloxRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username] }),
    });

    const data = await robloxRes.json();
    const userId = data?.data?.[0]?.id || null;

    if (!userId) {
      return res.json({ success: false, message: "User not found." });
    }

    res.json({
      success: true,
      message: "Backend working correctly!",
      userData: { id: userId, name: username },
    });
  } catch (err) {
    console.error("Error calling Roblox API:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// start server
app.listen(PORT, () =>
  console.log("✅ Server running on port " + PORT)
);
