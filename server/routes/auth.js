const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/login
// INPUT:  { email, password }
// OUTPUT: { token, user: { id, name, role, title } }
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role, title: user.title },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, role: user.role, title: user.title },
  });
});

// GET /api/auth/me — used by the portal to restore a session on page load
router.get("/me", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not logged in." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ user: payload });
  } catch {
    res.status(401).json({ error: "Session expired." });
  }
});

module.exports = router;
