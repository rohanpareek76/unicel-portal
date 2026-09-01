/**
 * Run with: npm run seed
 *
 * Creates the three staff accounts (Founder, Director, HOI) and a few
 * sample loan applications at different stages so the portal has
 * something to show immediately.
 *
 * >>> EDIT THE NAMES, EMAILS AND PASSWORDS BELOW BEFORE GOING LIVE. <
 * These are placeholders — replace them with your organisation's real
 * leadership details, then re-run `npm run seed` once (it skips users
 * that already exist).
 */
const bcrypt = require("bcryptjs");
const db = require("./db");
const STAFF = [
  {
    role: "founder",
    name: "Rajendra Sharma",
    title: "Founder",
    email: "founder@unicelrural.org",
    password: "Founder@123",
  },
  {
    role: "director",
    name: "Kavita Singh",
    title: "Director",
    email: "director@unicelrural.org",
    password: "Director@123",
  },
  {
    role: "hoi",
    name: "Arjun Meena",
    title: "Head of Institution",
    email: "hoi@unicelrural.org",
    password: "Hoi@123",
  },
  {
    role: "hoi",
    name: "YAHAN NAYA NAAM DALO",
    title: "Head of Institution",
    email: "naya@unicelrural.org",
    password: "Naya@123",
  },
];
const insertUser = db.prepare(
  `INSERT INTO users (name, email, password_hash, role, title) VALUES (?, ?, ?, ?, ?)`
);
const findUser = db.prepare(`SELECT id FROM users WHERE email = ?`);
const ids = {};
for (const s of STAFF) {
  const existing = findUser.get(s.email);
  if (existing) {
    ids[s.role] = existing.id;
    console.log(`Skipped (already exists): ${s.email}`);
    continue;
  }
  const hash = bcrypt.hashSync(s.password, 10);
  const info = insertUser.run(s.name, s.email, hash, s.role, s.title);
  ids[s.role] = info.lastInsertRowid;
  console.log(`Created ${s.role}: ${s.email} / ${s.password}`);
}
// Sample loan applications across the workflow, so every dashboard has
// something to review the first time it loads.
const loanCount = db.prepare(`SELECT COUNT(*) AS c FROM loan_applications`).get().c;
if (loanCount === 0) {
  const insertLoan = db.prepare(
    `INSERT INTO loan_applications
     (applicant_name, village, purpose, amount, status, hoi_id, hoi_remarks, hoi_decided_at, director_id, director_remarks, director_decided_at, created_by)
     VALUES (@applicant_name, @village, @purpose, @amount, @status, @hoi_id, @hoi_remarks, @hoi_decided_at, @director_id, @director_remarks, @director_decided_at, @created_by)`
  );
  insertLoan.run({
    applicant_name: "Sunita Devi",
    village: "Bassi",
    purpose: "Dairy cattle purchase",
    amount: 60000,
    status: "SUBMITTED",
    hoi_id: null, hoi_remarks: null, hoi_decided_at: null,
    director_id: null, director_remarks: null, director_decided_at: null,
    created_by: ids.hoi,
  });
  insertLoan.run({
    applicant_name: "Mahesh Kumar",
    village: "Chaksu",
    purpose: "Tractor implement purchase",
    amount: 150000,
    status: "DIRECTOR_REVIEW",
    hoi_id: ids.hoi, hoi_remarks: "Documents verified, good repayment history.", hoi_decided_at: new Date().toISOString(),
    director_id: null, director_remarks: null, director_decided_at: null,
    created_by: ids.hoi,
  });
  insertLoan.run({
    applicant_name: "Rekha Bai",
    village: "Sanganer",
    purpose: "Poly-house for vegetable farming",
    amount: 350000,
    status: "FOUNDER_REVIEW",
    hoi_id: ids.hoi, hoi_remarks: "Strong local reputation, land documents in order.", hoi_decided_at: new Date().toISOString(),
    director_id: ids.director, director_remarks: "High value, escalating per policy.", director_decided_at: new Date().toISOString(),
    created_by: ids.hoi,
  });
  insertLoan.run({
    applicant_name: "YAHAN NAYA APPLICANT NAAM",
    village: "Village Ka Naam",
    purpose: "Loan lene ka reason",
    amount: 100000,
    status: "SUBMITTED",
    hoi_id: null, hoi_remarks: null, hoi_decided_at: null,
    director_id: null, director_remarks: null, director_decided_at: null,
    created_by: ids.hoi,
  });
  console.log("Seeded 4 sample loan applications.");
}
console.log("\nDone. Log in at /portal/login.html with any of the accounts above.");
