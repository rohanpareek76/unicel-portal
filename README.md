# UNICEL Rural Creditcare Foundation — Website + Staff Portal

A public marketing site plus a role-based staff portal (Founder / Director /
Head of Institution) with a real Node.js + SQLite backend behind it.

```
unicel-rural/
├── public/          public website (home, about, how we work, contact)
├── portal/          staff login + role-aware dashboard (static frontend)
├── server/          Express API + SQLite database + decision logic
├── package.json
└── .env.example
```

## 1. Run it locally

You need [Node.js](https://nodejs.org) 18+ installed. This step needs
internet access to download packages (this couldn't be pre-installed here
because this sandbox has no network access) — run it on your own machine.

```bash
cd unicel-rural
npm install
cp .env.example .env      # then open .env and set a real JWT_SECRET
npm run seed               # creates the 3 staff accounts + sample loans
npm start
```

Then open:
- Public site: `http://localhost:3000/`
- Staff portal: `http://localhost:3000/portal/login.html`

Demo logins created by `npm run seed`:

| Role      | Email                        | Password       |
|-----------|-------------------------------|----------------|
| Founder   | founder@unicelrural.org       | Founder@123    |
| Director  | director@unicelrural.org      | Director@123   |
| HOI       | hoi@unicelrural.org            | Hoi@123        |

**Change these before it's real.** Open `server/seed.js`, replace the names,
emails and passwords with your actual Founder, Director and Head of
Institution, then run `npm run seed` again (it skips accounts that already
exist, so re-run it after changing details for a *new* account, or delete
`data.sqlite` to start fresh).

## 2. How the decision logic works

Everything is defined in one place: `server/decisionRules.js`. Nothing else
in the codebase hard-codes the rules — routes just call into this file.

| Stage | Role | Input | Output |
|---|---|---|---|
| 1 | HOI | Applicant KYC, village, purpose, amount | Recommend → Director, or Reject |
| 2 | Director | HOI's recommendation + amount | ≤ ₹2,00,000: Approve/Reject directly. Above: Escalate to Founder, or Reject |
| 3 | Founder | Escalated case + full portfolio view | Approve (disbursed) or Reject — final |

To change the escalation limit, edit `FOUNDER_ESCALATION_LIMIT` in
`server/decisionRules.js`. To add a new role or stage, extend the `STATUS`
object and the `allowedActions()` function — the API and dashboard both
read from it automatically, so a role can never skip a step or act outside
its authority.

## 3. Editing the public site

Plain HTML/CSS in `public/`. Company name, stats, and leadership names on
`public/index.html` and `public/about.html` are placeholders — search for
"Rajendra Sharma", "Kavita Singh" and "Arjun Meena" across `public/` and
`server/seed.js` and replace with your real leadership.

## 4. Deploying it for real

This is a standard Node/Express app with a SQLite file, so any of these
work without code changes:

- **Render** or **Railway** — connect your GitHub repo, set the `JWT_SECRET`
  environment variable, set the start command to `npm start`, and add a
  build step that runs `npm run seed` once after first deploy.
- **Google Cloud Run** — containerize with a small `Dockerfile`
  (`FROM node:20-slim`, copy files, `npm ci --omit=dev`, `CMD ["npm","start"]`)
  and deploy with `gcloud run deploy`. Cloud Run's filesystem resets on
  restart, so for real production use swap SQLite for Cloud SQL — the app
  only touches the database through `server/db.js`, so that's the one file
  to change.
- **A VPS** (e.g. a small cloud server) — clone the repo, run the same
  local steps above, and put it behind Nginx + a process manager like PM2.

To push this project to GitHub first (recommended before any of the above):

```bash
git init
git add .
git commit -m "Initial UNICEL Rural Creditcare Foundation site"
git remote add origin <your-repo-url>
git push -u origin main
```

## 5. Security notes before going live

- Set a long, random `JWT_SECRET` in `.env` — never commit `.env` itself.
- Change every seeded password immediately.
- Add HTTPS (Render/Railway/Cloud Run all provide this automatically).
- The contact form on `public/contact.html` is currently a static demo —
  wire it to a real `/api/contact` route (or an email service) before launch.
