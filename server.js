import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("✅ Your Roblox backend is running!");
});

app.get("/find", async (req, res) => {
  const username = req.query.user;
  if (!username) return res.json({ success: false, message: "Missing ?user parameter" });

  const url = `https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(username)}`;
  const robloxRes = await fetch(url);
  const data = await robloxRes.json();

  res.json({
    success: true,
    message: "Backend working correctly!",
    userData: data,
  });
});

app.listen(PORT, () => console.log("✅ Server running on port " + PORT));
