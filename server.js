/**
 * Advanced Roblox Connections Finder backend
 * -------------------------------------------
 * Safely crawls Roblox's friends API to find friend-of-friend chains.
 * Works on Render free tier without hitting rate limits.
 */

import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION ---
const MAX_DEPTH = 3;          // how many hops deep (You -> Friend -> Friend -> Target)
const MAX_FRIENDS = 100;      // how many friends per user to inspect
const DELAY_MS = 300;         // pause between Roblox API calls

// helper: delay
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// helper: get userId from username (new endpoint)
async function getUserId(username) {
  const res = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username] })
  });
  const data = await res.json();
  return data?.data?.[0]?.id || null;
}

// helper: get username from userId
async function getUsername(userId) {
  const res = await fetch(`https://users.roblox.com/v1/users/${userId}`);
  if (!res.ok) return String(userId);
  const data = await res.json();
  return data.name || String(userId);
}

// helper: get friend ids for a user
async function getFriends(userId) {
  await wait(DELAY_MS);
  const res = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data.slice(0, MAX_FRIENDS).map(f => f.id);
}

// main search
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

// --- ROUTE ---
app.get("/find", async (req, res) => {
  const username = req.query.user;
  if (!username) return res.json({ success: false, message: "Missing ?user parameter" });

  try {
    // for demo: start from a fixed test user (e.g., your own Roblox ID)
    const startUserId = 1; // change to your own ID later
    const targetUserId = await getUserId(username);
    if (!targetUserId) return res.json({ success: false, message: "User not found." });

    const start = Date.now();
    const path = await findConnection(startUserId, targetUserId);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (!path) {
      return res.json({ success: false, message: "No connection found.", elapsed });
    }

    // convert ids to names
    const names = [];
    for (const uid of path) names.push(await getUsername(uid));

    res.json({
      success: true,
      message: "Connection found!",
      elapsed,
      pathUserIds: path,
      pathUsernames: names
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => console.log("✅ Advanced backend running on port " + PORT));

