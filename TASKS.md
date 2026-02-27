# The Playa Provides — Task List

_Last updated: 2026-02-27_

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
_(nothing queued yet)_

---

## 🧠 Brainstorming
- [ ] **Camps & Friends layers** — new feature area, brainstorm before building

---

## ✅ Done
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