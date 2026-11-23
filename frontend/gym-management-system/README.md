# IronPulse Gym Management System

Frontend Development Internship — Phase 2, Task 4 (Sqrock IT Solutions).

A responsive gym admin dashboard built with plain HTML, CSS and JavaScript (no build step). Data is stored in the browser (`localStorage`), so it works offline and can be hosted on any static host.

## Features
- **Landing page:** hero, about, membership plans, services, trainers, FAQ, contact form, navbar, footer.
- **Auth UI:** login, sign-up, forgot-password, logout, protected dashboard routes, form validation.
- **Dashboard:** total members, active memberships, trainers, monthly revenue, today's attendance, pending payments, recent activity, 7-day attendance chart.
- **Members:** add / edit / delete, search, filter by status and plan, one-click renewal, duplicate-email check.
- **Trainers:** CRUD with specialization, experience, contact and assigned members.
- **Membership plans:** Basic / Standard / Premium (duration, price, features, active/inactive).
- **Attendance:** mark daily check-ins, history, search, filter by member and date.
- **Workout & diet plans:** create, assign to a member, edit, delete.
- **Payments:** history, pending / paid, mark as paid, printable invoice.
- **Profile** (photo, name, email, change password) and **Settings** (dark mode, notification switches, gym info, reset demo data).
- Responsive layout (sidebar collapses, tables become cards on phones), keyboard-friendly, XSS-safe rendering.

## Run
Open `index.html` in a browser, or serve the folder (`python3 -m http.server`).
Demo login: `admin@gym.local` / `Admin@123` (front-end demo only; passwords are salted SHA-256 hashes in localStorage, not real security).

## Tests
`pip install playwright` then `python3 tools/test_gym.py .` runs an end-to-end check (auth guard, CRUD, validation, attendance, payments, dark mode, mobile layout) and refreshes the screenshots in `screenshots/`.

## Screenshots
See the `screenshots/` folder (landing, dashboard, members, attendance, payments, dark mode, mobile).

## Live demo
Deploy with GitHub Pages (Settings → Pages → branch `main`, folder `/frontend/gym-management-system`) — add the link here.
