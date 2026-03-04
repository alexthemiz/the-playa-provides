# The Playa Provides — Task List

_Last updated: 2026-03-04 (session 3)_

---

## 🏗️ In Progress
- [ ] **Test spreadsheet import end-to-end in browser** — CSV upload, Excel upload, duplicate detection, error cases

---

## 🔧 Bugs & Fixes
- [ ] **Magic link → 6-digit OTP** — Gmail pre-fetches magic links and burns them before the user clicks. Fix: switch to email OTP code in Supabase dashboard (Auth → Email OTP) + small login page change to show code input field.
- [ ] **Email sender: hello@theplayaprovides.com** — Currently sends from Supabase noreply. Fix: configure Resend SMTP in Supabase dashboard (Project Settings → Auth → SMTP). Already using Resend for request emails so credentials are on hand.

---

## ⚡ Quick Wins
- [ ] **Lend To / Transfer buttons** — Buttons exist on /inventory action column but have no onClick. Brainstorm the flow first, then implement.

---

## 🚀 Features
_(nothing queued yet)_

---

## 🎨 Design & Brand
_(nothing queued yet)_

---

## 💡 Ideas & Long Term
- [ ] **Custom Supabase Auth domain** — Upgrade to Supabase Pro, set `auth.theplayaprovides.com` as custom auth domain + DNS config. Fixes Google OAuth consent screen showing `bklycpitofjrjhizttny.supabase.co` instead of the app domain.

---

## 🧠 Brainstorming
- [ ] **Camps & Friends layers** — new feature area, brainstorm before building

---

## ✅ Done
- [x] Fix: Profile page stuck on "Loading..." — missing try/catch/finally in fetchProfileAndGear
- [x] Fix: Logout button cursor not changing to pointer on hover
- [x] Design: WelcomeModal tightened — smaller icon, line break in title, X close button, tighter padding
- [x] Fix: `/auth/auth-code-error` page missing (magic link 404)
- [x] Fix: signup stuck on "Loading..." (router.refresh() race)
- [x] Fix: RequestModal stuck on "Sending..." (replaced alert with inline error state)
- [x] Fix: send-request-email edge function 401 (redeployed with --no-verify-jwt)
- [x] Feature: Spreadsheet import modal (upload → map columns → review → bulk insert)
- [x] Feature: Status column moved to 2nd position in inventory table
- [x] Fix: "Import Spreadsheet" renamed to "Import Inventory"
- [x] Fix: Add new location popup too narrow on /list-item (moved outside grid)
- [x] Fix: /resources page showed empty list with stale session (silent retry as anon)
- [x] Fix: Photo upload stuck on "Uploading..." (missing try/catch/finally)
- [x] Fix: Category filter on /inventory had wrong options (synced with list-item categories)
- [x] Fix: Locations dropdown broken for new users (auto-select "Add new location" when no saved locations)
- [x] Fix: Logout button unresponsive — removed router.refresh() race condition from handleSignOut + added try/catch for broken auth states
- [x] Design: Page headline updates across all routes — "The Playa Provides: ..." branding, personalised with preferred_name on /list-item and /inventory, left-justified
- [x] Fix: "View →" link on /profile/[username] items list — was triggering intercepting route silently; changed to hard nav via &lt;a href&gt;
- [x] Feature: Google OAuth sign-in on /login and /signup
- [x] Feature: Privacy Policy page at /privacy — includes required Google Limited Use disclosure
- [x] Fix: /privacy and /terms added to middleware public routes (footer links now work without auth)
- [x] Design: /about page — replaced lorem ipsum with mission, contact, support, and contribute sections