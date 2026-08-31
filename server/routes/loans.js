const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { STATUS, allowedActions, nextStatus, FOUNDER_ESCALATION_LIMIT } = require("../decisionRules");

const router = express.Router();
router.use(requireAuth);

function serialize(row) {
  return {
    ...row,
    canActOnBySelf: null, // filled in per-request below
  };
}

// GET /api/loans
// OUTPUT: loans relevant to the logged-in role's queue, plus everything
//         for the founder (full company visibility).
router.get("/", (req, res) => {
  const { role, id } = req.user;
  let rows;
  if (role === "hoi") {
    rows = db.prepare(
      `SELECT * FROM loan_applications
       WHERE status = ? OR hoi_id = ?
       ORDER BY created_at DESC`
    ).all(STATUS.SUBMITTED, id);
  } else if (role === "director") {
    rows = db.prepare(
      `SELECT * FROM loan_applications
       WHERE status = ? OR director_id = ?
       ORDER BY created_at DESC`
    ).all(STATUS.DIRECTOR_REVIEW, id);
  } else {
    // founder — full company-wide visibility
    rows = db.prepare(`SELECT * FROM loan_applications ORDER BY created_at DESC`).all();
  }

  const withActions = rows.map((r) => ({
    ...r,
    availableActions: allowedActions(role, r.status, r.amount),
  }));
  res.json({ loans: withActions, escalationLimit: FOUNDER_ESCALATION_LIMIT });
});

// POST /api/loans
// INPUT:  { applicant_name, village, purpose, amount }  (HOI logs new applications)
// OUTPUT: the created loan record, status = SUBMITTED
router.post("/", requireRole("hoi"), (req, res) => {
  const { applicant_name, village, purpose, amount } = req.body || {};
  if (!applicant_name || !village || !purpose || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: "All fields are required and amount must be positive." });
  }

  const info = db.prepare(
    `INSERT INTO loan_applications (applicant_name, village, purpose, amount, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(applicant_name.trim(), village.trim(), purpose.trim(), Number(amount), STATUS.SUBMITTED, req.user.id);

  const loan = db.prepare("SELECT * FROM loan_applications WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ loan });
});

// PATCH /api/loans/:id/decision
// INPUT:  { action: 'recommend' | 'approve' | 'reject' | 'escalate', remarks }
// OUTPUT: the updated loan record with its new status
//
// This is where the hierarchy is enforced: allowedActions() checks the
// caller's role against the loan's current status and amount before any
// write happens, so a Director cannot approve a case still sitting with
// the HOI, and cannot give final approval above the escalation limit.
router.patch("/:id/decision", (req, res) => {
  const { role, id: userId } = req.user;
  const { action, remarks } = req.body || {};
  const loan = db.prepare("SELECT * FROM loan_applications WHERE id = ?").get(req.params.id);

  if (!loan) return res.status(404).json({ error: "Loan application not found." });

  let newStatus;
  try {
    newStatus = nextStatus(role, action, loan.status, loan.amount);
  } catch (err) {
    return res.status(403).json({ error: err.message });
  }

  const now = new Date().toISOString();
  if (role === "hoi") {
    db.prepare(
      `UPDATE loan_applications SET status = ?, hoi_id = ?, hoi_remarks = ?, hoi_decided_at = ? WHERE id = ?`
    ).run(newStatus, userId, remarks || null, now, loan.id);
  } else if (role === "director") {
    db.prepare(
      `UPDATE loan_applications SET status = ?, director_id = ?, director_remarks = ?, director_decided_at = ? WHERE id = ?`
    ).run(newStatus, userId, remarks || null, now, loan.id);
  } else if (role === "founder") {
    db.prepare(
      `UPDATE loan_applications SET status = ?, founder_id = ?, founder_remarks = ?, founder_decided_at = ? WHERE id = ?`
    ).run(newStatus, userId, remarks || null, now, loan.id);
  }

  const updated = db.prepare("SELECT * FROM loan_applications WHERE id = ?").get(loan.id);
  res.json({ loan: updated });
});

module.exports = router;
