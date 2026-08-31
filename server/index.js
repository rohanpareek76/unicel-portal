require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

require("./db"); // ensures tables exist on boot

const authRoutes = require("./routes/auth");
const loanRoutes = require("./routes/loans");
const statsRoutes = require("./routes/stats");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`UNICEL Rural Creditcare Foundation server running on http://localhost:${PORT}`);
  console.log(`Public site:  http://localhost:${PORT}/`);
  console.log(`Staff portal: http://localhost:${PORT}/portal/login.html`);
});
