const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/stats/summary
// OUTPUT: portfolio-wide counts and totals, used on the dashboard header cards
router.get("/summary", (req, res) => {
  const totals = db.prepare(
    `SELECT
       COUNT(*) AS total_applications,
       COALESCE(SUM(CASE WHEN status = 'DISBURSED' THEN amount ELSE 0 END), 0) AS total_disbursed,
       COALESCE(SUM(CASE WHEN status IN ('SUBMITTED','DIRECTOR_REVIEW','FOUNDER_REVIEW') THEN 1 ELSE 0 END), 0) AS pending,
       COALESCE(SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END), 0) AS rejected
     FROM loan_applications`
  ).get();

  const byStage = db.prepare(
    `SELECT status, COUNT(*) AS count FROM loan_applications GROUP BY status`
  ).all();

  res.json({ totals, byStage });
});

module.exports = router;
