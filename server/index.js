require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

require("./db"); // ensures tables exist on boot

const authRoutes = require("./routes/auth");
const loanRoutes = require("./routes/loans");
const statsRoutes = require("./routes/stats");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? "https://unicel-portal.onrender.com"
    : "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

// ---- API ----
app.use("/api/auth", authRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/stats", statsRoutes);

// ---- Static sites ----
// Public marketing site at /
app.use(express.static(path.join(__dirname, "..", "public")));
// Staff/admin portal at /portal
app.use("/portal", express.static(path.join(__dirname, "..", "portal")));

app.get("/healthz", (req, res) => res.json({ ok: true }));

// ---- Error handler (must be last) ----
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production" ? "Something went wrong" : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`UNICEL Rural Creditcare Foundation server running on http://localhost:${PORT}`);
  console.log(`Public
