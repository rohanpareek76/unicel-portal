/**
 * Run with: npm run seed
 *
 * Creates staff accounts (Founder, Director, HOI) and a few sample loan
 * applications so the portal has something to show immediately.
 *
 * IMPORTANT: Change FOUNDER_PASSWORD below to something only you know,
 * then run `npm run seed` once. It skips users that already exist, so
 * re-running is safe.
 *
 * TO ADD MORE STAFF (up to as many as you need — e.g. 20 people):
 * just copy one of the objects inside the STAFF array below, change the
 * role/name/email/password, and run `npm run seed` again. Multiple
 * people CAN share the same role (e.g. several "hoi" accounts) — the
 * system already supports that.
 */
const bcrypt = require("bcryptjs");
const db = require("./db");

const FOUNDER_PASSWORD = "Rohan@2026"; // <-- CHANGE THIS before going live, then log in and never share it

const STAFF = [
  {
    role: "founder",
    name: "Rohan Pareek",
    title: "Founder",
    email: "rohanpareek998@gmail.com",
    password: FOUNDER_PASSWORD,
  },
  {
    role: "director",
    name: "Kavita Singh",
    title: "Director",
    email: "director@unicelrural.org",
    password: "Director@123", // <-- replace with the real Director's email + a real password
  },
  {
    role: "hoi",
    name: "Arjun Meena",
    title: "Head of Institution",
    email: "hoi@unicelrural.org",
    password: "Hoi@123", // <-- replace with the real HOI's email + a real password
  },
  // Add more staff here — copy the block above, e.g.:
  // {
  //   role: "hoi",
  //   name: "New Staff Name",
  //   title: "Head of Institution",
  //   email: "newstaff@unicelrural.org",
  //   password: "ChangeThis@123",
  // },
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

// Sample loan applications across the workflow, so the dashboard has
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
  console.log("Seeded 3 sample loan applications.");
}

console.log("\nDone. Log in at /portal/login.html with any of the accounts above.");
