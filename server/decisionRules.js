/**
 * UNICEL Rural Creditcare Foundation — loan approval decision logic
 * ------------------------------------------------------------------
 * This is the single source of truth for how a loan moves through the
 * organisation. Change FOUNDER_ESCALATION_LIMIT to tune the policy —
 * every route reads from here, nothing is hard-coded elsewhere.
 *
 * Hierarchy & flow:
 *
 *   Field/HOI submits application  ->  SUBMITTED
 *   HOI verifies documents & eligibility (INPUT: applicant KYC, village,
 *   purpose, amount / OUTPUT: recommend or reject)
 *       - Reject                    ->  REJECTED
 *       - Recommend                 ->  DIRECTOR_REVIEW
 *
 *   Director assesses financial risk (INPUT: HOI recommendation + amount /
 *   OUTPUT: depends on amount)
 *       - amount <= FOUNDER_ESCALATION_LIMIT:
 *            Approve                ->  DISBURSED   (Director has final say)
 *            Reject                 ->  REJECTED
 *       - amount > FOUNDER_ESCALATION_LIMIT:
 *            Recommend to Founder   ->  FOUNDER_REVIEW
 *            Reject                 ->  REJECTED
 *
 *   Founder has final authority on high-value / escalated cases and full
 *   visibility over every case in the system (INPUT: escalated case +
 *   company-wide portfolio / OUTPUT: final approve or reject)
 *       - Approve                   ->  DISBURSED
 *       - Reject                    ->  REJECTED
 */

const FOUNDER_ESCALATION_LIMIT = 200000; // INR — loans above this always need Founder sign-off

const STATUS = {
  SUBMITTED: "SUBMITTED",
  DIRECTOR_REVIEW: "DIRECTOR_REVIEW",
  FOUNDER_REVIEW: "FOUNDER_REVIEW",
  DISBURSED: "DISBURSED",
  REJECTED: "REJECTED",
};

// Which role is allowed to act on which status, and what actions they may take
function allowedActions(role, status, amount) {
  if (role === "hoi" && status === STATUS.SUBMITTED) {
    return ["recommend", "reject"];
  }
  if (role === "director" && status === STATUS.DIRECTOR_REVIEW) {
    return amount > FOUNDER_ESCALATION_LIMIT
      ? ["escalate", "reject"]
      : ["approve", "reject"];
  }
  if (role === "founder" && status === STATUS.FOUNDER_REVIEW) {
    return ["approve", "reject"];
  }
  return [];
}

// Applies an action and returns the next status
function nextStatus(role, action, status, amount) {
  const allowed = allowedActions(role, status, amount);
  if (!allowed.includes(action)) {
    throw new Error(
      `Role '${role}' cannot perform '${action}' on a loan in status '${status}'`
    );
  }
  if (action === "reject") return STATUS.REJECTED;
  if (action === "recommend") return STATUS.DIRECTOR_REVIEW;
  if (action === "approve") return STATUS.DISBURSED;
  if (action === "escalate") return STATUS.FOUNDER_REVIEW;
  throw new Error(`Unknown action '${action}'`);
}

module.exports = { FOUNDER_ESCALATION_LIMIT, STATUS, allowedActions, nextStatus };
