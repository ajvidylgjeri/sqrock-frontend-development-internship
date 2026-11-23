# AI Resume Builder

Frontend Development Internship — Phase 2, Task 2 (Sqrock IT Solutions).

A resume builder with live preview, built with plain HTML, CSS and JavaScript (no build step). Data lives in `localStorage`.

## Features
- Sign-up / login (demo), protected routes, profile and settings (dark mode).
- Dashboard: create, search, duplicate and delete resumes.
- Builder form: personal info, summary, experience, education, skills, projects, with live preview.
- 3 templates, accent colour and font choices.
- Rule-based "AI" helpers: summary generator, skill and project-description suggestions (runs locally, no external API).
- Autosave, print / Save as PDF, XSS-safe rendering, responsive layout.

## Run
Open `index.html` or serve the folder (`python3 -m http.server`).

## Tests
`python3 tools/test_resume.py .` (Playwright) — runs the end-to-end checks and refreshes `screenshots/`.

## Live demo
Deploy with GitHub Pages (folder `/frontend/ai-resume-builder`) and add the link here.
