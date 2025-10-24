/**
 * Roblox Connections Finder Backend
 * ---------------------------------
 * Works for every player — uses the player's own UserId from Roblox.
 * Crawls Roblox's public Friends API safely and returns connection chains.
 * 
 * Author: You 😊
 */

import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION ---
const MAX_DEPTH = 3;          // how deep the chain can go (You -> Friend -> Friend -> Target)
const MAX_FRIENDS = 100;      // how many friends per user to check
const DELAY_MS = 300;         // wait time between requests (prevents Roblox rate-limiting)

// --- HELPER FUNCTIONS ---

// Wait function
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Convert username to userId using Roblox's new API
async function getUserId(username) {
  const res = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username] }),
  });
  const data = await res.json();
  return data?.data?.[0]?.id || null;
}

// Convert userId to username
async function getUsername(userId) {
  const res = await fetch(`https://users.roblox.com/v1/users/${userId}`);
  if (!res.ok) return String(userId);
  const data = await res.json();
  return data.name || String(userId);
}

// Get a user's friends (limited to MAX_FRIENDS)
async function getFriends(userId) {
  await wait(DELAY_MS);
  const res = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data.slice(0, MAX_FRIENDS).map(f => f.id);
}

// Core search function (Breadth-First Search)
async function findConnection(startUserId, targetUserId, maxDepth = MAX_DEPTH) {
  if (startUserId === targetUserId) return [startUserId];

  const queue = [{ id: startUserId, path: [startUserId] }];
  const visited = new Set([startUserId]);

  while (queue.length > 0) {
    const { id, path } = queue.shift();
    const depth = path.length - 1;
    if (depth >= maxDepth) continue;

    const friends = await getFriends(id);
    for (const fid of friends) {
      if (visited.has(fid)) continue;
      visited.add(fid);

      const newPath = [...path, fid];
      if (fid === targetUserId) return newPath;
      queue.push({ id: fid, path: newPath });
    }
  }
  return null;
}

// --- ROUTES ---

// Root route (for testing)
app.get("/", (req, res) => {
  res.send("✅ Roblox Connections Finder backend is running!");
});

// /find?user=MiniToon&start=123456
app.get("/find", async (req, res) => {
  const username = req.query.user;
  const startUserId = parseInt(req.query.start) || 1;

  if (!username) return res.json({ success: false, message: "Missing ?user parameter" });
  if (!startUserId) return res.json({ success: false, message: "Missing ?start parameter" });

  try {
    const targetUserId = await getUserId(username);
    if (!targetUserId) return res.json({ success: false, message: "User not found." });

    const start = Date.now();
    const path = await findConnection(startUserId, targetUserId);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (!path) {
      return res.json({ success: false, message: "No connection found.", elapsed });
    }

    // Convert IDs to usernames for readability
    const names = [];
    for (const uid of path) names.push(await getUsername(uid));

    res.json({
      success: true,
      message: "Connection found!",
      elapsed,
      pathUserIds: path,
      pathUsernames: names,
    });
  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log("✅ Backend running on port " + PORT);
});
