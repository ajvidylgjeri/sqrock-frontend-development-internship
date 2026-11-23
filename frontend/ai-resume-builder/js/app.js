"use strict";
/* ResumeCraft - AI Resume Builder. Vanilla JS SPA: hash routing, localStorage "backend", live preview, print-to-PDF.
   NOTE: authentication is a front-end demo (data never leaves the browser). */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("rc_" + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("rc_" + k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
};
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2000); }

// ---------- auth (demo) ----------
async function hash(pw, salt) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + pw));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
const users = () => store.get("users", []);
const session = () => users().find(u => u.id === store.get("session", null));
function updateUser(patch) { const all = users().map(u => u.id === session().id ? { ...u, ...patch } : u); store.set("users", all); }

// ---------- data ----------
const blank = () => ({
  id: uid(), title: "Untitled resume", updated: Date.now(), template: "modern", color: "#4f46e5", font: "sans",
  personal: { name: "", title: "", email: "", phone: "", address: "", linkedin: "", github: "", website: "", photo: "" },
  summary: "", goal: "", education: [], skills: [], experience: [], projects: [], certifications: [], languages: [], achievements: []
});
const ENTRY = {
  education: () => ({ degree: "", school: "", start: "", end: "", grade: "" }),
  experience: () => ({ company: "", position: "", duration: "", details: "" }),
  projects: () => ({ title: "", desc: "", tech: "", github: "", live: "" }),
  certifications: () => ({ name: "", issuer: "", year: "" }),
  languages: () => ({ name: "", level: "Intermediate" }),
  achievements: () => ({ text: "" })
};
const resumes = () => store.get("resumes_" + session().id, []);
const saveResumes = r => store.set("resumes_" + session().id, r);
const getResume = id => resumes().find(r => r.id === id);
function saveResume(r) { r.updated = Date.now(); const all = resumes(); const i = all.findIndex(x => x.id === r.id); if (i >= 0) all[i] = r; else all.push(r); saveResumes(all); }

// ---------- path helpers for form binding ----------
function setPath(obj, path, val) { const p = path.split("."); let o = obj; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p.at(-1)] = val; }

// ---------- "AI" assistant: deterministic, rule-based suggestions (no external API) ----------
const SKILL_MAP = { "front": ["HTML", "CSS", "JavaScript", "React", "Responsive Design", "Git"], "back": ["Node.js", "Python", "SQL", "REST APIs", "Docker", "Git"],
  "data": ["Python", "Pandas", "SQL", "Machine Learning", "Data Visualisation"], "design": ["Figma", "UI Design", "Prototyping", "User Research"], "full": ["JavaScript", "React", "Node.js", "SQL", "Git", "REST APIs"] };
function aiSummary(r) {
  const p = r.personal, role = p.title || "motivated professional", skills = r.skills.slice(0, 4).join(", ");
  const edu = r.education[0]; const exp = r.experience.length;
  return `${role.charAt(0).toUpperCase() + role.slice(1)}${edu?.degree ? ` with a background in ${edu.degree}` : ""}${skills ? ` and hands-on skills in ${skills}` : ""}. ` +
    `${exp ? `Experienced across ${exp} role${exp > 1 ? "s" : ""}, ` : "Eager to learn, "}focused on building reliable, user-friendly solutions and collaborating effectively in a team. ` +
    `${r.goal ? "Goal: " + r.goal : "Looking for an opportunity to grow and make a measurable impact."}`;
}
function aiSkills(r) {
  const t = (r.personal.title + " " + r.summary).toLowerCase();
  const hits = Object.entries(SKILL_MAP).filter(([k]) => t.includes(k)).flatMap(([, v]) => v);
  return [...new Set(hits.length ? hits : ["Communication", "Teamwork", "Problem Solving", "Time Management"])].filter(s => !r.skills.map(x => x.toLowerCase()).includes(s.toLowerCase()));
}
function aiProject(p) {
  const tech = p.tech ? ` using ${p.tech}` : "";
  return `Designed and built ${p.title || "a project"}${tech}, covering planning, implementation and testing. Focused on clean code, responsive UI and a smooth user experience.`;
}

// ---------- resume preview templates ----------
function renderResume(r) {
  const p = r.personal, contacts = [p.email, p.phone, p.address].filter(Boolean).map(esc);
  const links = [["LinkedIn", p.linkedin], ["GitHub", p.github], ["Web", p.website]].filter(l => l[1]).map(([n, u]) => `<a href="${esc(/^https?:/.test(u) ? u : "https://" + u)}" rel="noopener">${n}</a>`);
  const sec = (title, body) => body ? `<section class="r-sec"><h3>${title}</h3>${body}</section>` : "";
  const edu = r.education.filter(e => e.degree || e.school).map(e => `<div class="r-item"><div class="r-row"><b>${esc(e.degree)}</b><span>${esc(e.start)}${e.end ? " – " + esc(e.end) : ""}</span></div><div>${esc(e.school)}${e.grade ? " · " + esc(e.grade) : ""}</div></div>`).join("");
  const exp = r.experience.filter(e => e.company || e.position).map(e => `<div class="r-item"><div class="r-row"><b>${esc(e.position)}</b><span>${esc(e.duration)}</span></div><div>${esc(e.company)}</div>${e.details ? `<p>${esc(e.details).replace(/\n/g, "<br>")}</p>` : ""}</div>`).join("");
  const prj = r.projects.filter(e => e.title).map(e => `<div class="r-item"><div class="r-row"><b>${esc(e.title)}</b><span>${[e.github && "GitHub", e.live && "Live"].filter(Boolean).join(" · ")}</span></div>${e.tech ? `<div class="r-tech">${esc(e.tech)}</div>` : ""}<p>${esc(e.desc)}</p></div>`).join("");
  const cer = r.certifications.filter(e => e.name).map(e => `<li>${esc(e.name)}${e.issuer ? " — " + esc(e.issuer) : ""}${e.year ? " (" + esc(e.year) + ")" : ""}</li>`).join("");
  const lang = r.languages.filter(e => e.name).map(e => `<li>${esc(e.name)} <span class="r-muted">(${esc(e.level)})</span></li>`).join("");
  const ach = r.achievements.filter(e => e.text).map(e => `<li>${esc(e.text)}</li>`).join("");
  const skills = r.skills.length ? `<div class="r-tags">${r.skills.map(s => `<span>${esc(s)}</span>`).join("")}</div>` : "";
  const summary = [r.summary, r.goal && "Career goal: " + r.goal].filter(Boolean).map(esc).join("<br>");
  const photo = p.photo ? `<img class="r-photo" src="${esc(p.photo)}" alt="Profile photo">` : "";
  return `<article class="resume t-${r.template} f-${r.font}" style="--accent:${esc(r.color)}">
    <header class="r-head">${photo}<div><h1>${esc(p.name) || "Your Name"}</h1><div class="r-title">${esc(p.title)}</div>
    <div class="r-contact">${contacts.join(" · ")}</div><div class="r-links">${links.join(" · ")}</div></div></header>
    ${sec("Summary", summary ? `<p>${summary}</p>` : "")}${sec("Experience", exp)}${sec("Projects", prj)}${sec("Education", edu)}${sec("Skills", skills)}
    ${sec("Certifications", cer ? `<ul>${cer}</ul>` : "")}${sec("Languages", lang ? `<ul class="r-cols">${lang}</ul>` : "")}${sec("Achievements", ach ? `<ul>${ach}</ul>` : "")}</article>`;
}

// ---------- views ----------
const nav = (active) => {
  const u = session();
  return `<header class="topbar"><div class="wrap bar"><a class="brand" href="#/">📄 Resume<span>Craft</span></a>
    <button class="burger" id="burger" aria-label="Menu" aria-expanded="false">☰</button>
    <nav id="nav">${u ? `<a href="#/dashboard" class="${active === "dashboard" ? "on" : ""}">Dashboard</a><a href="#/profile" class="${active === "profile" ? "on" : ""}">Profile</a><a href="#/settings" class="${active === "settings" ? "on" : ""}">Settings</a><button class="btn ghost sm" id="logout">Log out</button>`
      : `<a href="#/">Home</a><a href="#/templates-info">Templates</a><a href="#/how">How it works</a><a href="#/contact">Contact</a><a class="btn ghost sm" href="#/login">Log in</a><a class="btn sm" href="#/signup">Get started</a>`}</nav></div></header>`;
};
const footer = () => `<footer class="foot"><div class="wrap foot-grid"><div><b>📄 ResumeCraft</b><p class="muted">Create job-ready resumes in minutes.</p></div>
  <div><b>Contact</b><p class="muted">hello@resumecraft.example<br>Tirana, Albania</p></div><div><b>Follow</b><p><a href="https://linkedin.com" rel="noopener">LinkedIn</a> · <a href="https://github.com" rel="noopener">GitHub</a></p></div></div>
  <p class="copy">© 2026 ResumeCraft — demo project. Data stays in your browser.</p></footer>`;

const SAMPLES = [["modern", "Modern", "Accent header with sidebar-style skills"], ["classic", "Classic", "Traditional serif layout, ATS friendly"], ["minimal", "Minimal", "Clean and compact single column"]];
function sampleResume(t) { const r = blank(); r.template = t; r.personal = { name: "Alex Morgan", title: "Frontend Developer", email: "alex@example.com", phone: "+355 69 000 0000", address: "Tirana", linkedin: "linkedin.com/in/alex", github: "github.com/alex", website: "", photo: "" };
  r.summary = "Developer who loves building clean, accessible interfaces."; r.skills = ["HTML", "CSS", "JavaScript", "React"]; r.experience = [{ company: "Acme Labs", position: "Intern", duration: "2026", details: "Built dashboard components." }]; r.education = [{ degree: "BSc Software Engineering", school: "University", start: "2023", end: "2027", grade: "" }]; return r; }

const views = {
  landing() {
    return `${nav()}<main>
    <section class="hero wrap"><div><span class="pill">✨ Free · No sign-up needed to preview</span><h1>Build a resume that gets you interviews.</h1>
      <p class="lead">Fill in your details, watch the resume update live, switch templates and download a clean PDF.</p>
      <a class="btn" href="#/signup">Create my resume</a> <a class="btn ghost" href="#/login">I have an account</a></div>
      <div class="hero-card" aria-hidden="true">${renderResume(sampleResume("modern"))}</div></section>
    <section class="wrap"><h2 class="center">Everything you need</h2><div class="grid3">
      ${[["⚡", "Live preview", "See every change instantly as you type."], ["🎨", "Templates & colours", "Three templates, custom accent colour and font."], ["🧠", "Smart suggestions", "One-click summary, skill and project-description helpers."], ["📄", "PDF download", "Print-ready layout, save as PDF from any browser."], ["💾", "Auto save", "Your work is saved as you type."], ["📱", "Responsive", "Works on phone, tablet and desktop."]].map(([i, t, d]) => `<div class="card feat"><div class="ic">${i}</div><h3>${t}</h3><p class="muted">${d}</p></div>`).join("")}</div></section>
    <section class="wrap" id="tpl"><h2 class="center">Resume templates</h2><div class="grid3">${SAMPLES.map(([k, n, d]) => `<div class="card tpl"><div class="mini">${renderResume(sampleResume(k))}</div><h3>${n}</h3><p class="muted">${d}</p></div>`).join("")}</div></section>
    <section class="wrap"><h2 class="center">How it works</h2><div class="grid3">${[["1", "Sign up", "Create a free account in seconds."], ["2", "Fill in your details", "Add education, skills, experience and projects."], ["3", "Download", "Pick a template and save your PDF."]].map(([n, t, d]) => `<div class="card step"><span class="num">${n}</span><h3>${t}</h3><p class="muted">${d}</p></div>`).join("")}</div></section>
    <section class="wrap narrow"><h2 class="center">FAQ</h2>${[["Is it free?", "Yes. This demo is completely free."], ["Where is my data stored?", "Only in your browser's local storage. Nothing is uploaded."], ["How do I get a PDF?", "Open a resume, click Download PDF and choose “Save as PDF” in the print dialog."]].map(([q, a]) => `<details class="card"><summary>${q}</summary><p class="muted">${a}</p></details>`).join("")}</section>
    <section class="wrap narrow" id="contact"><h2 class="center">Contact us</h2><form id="contactForm" class="card form" novalidate>
      <label>Name<input name="name"><small class="err" data-for="name"></small></label><label>Email<input name="email" type="email"><small class="err" data-for="email"></small></label>
      <label>Message<textarea name="message" rows="4"></textarea><small class="err" data-for="message"></small></label><button class="btn" type="submit">Send message</button></form></section></main>${footer()}`;
  },

  login() { return authPage("Welcome back", "login", `<label>Email<input name="email" type="email" autocomplete="email"><small class="err" data-for="email"></small></label>
      <label>Password<input name="password" type="password" autocomplete="current-password"><small class="err" data-for="password"></small></label>
      <button class="btn block" type="submit">Log in</button><p class="center small"><a href="#/forgot">Forgot password?</a> · <a href="#/signup">Create account</a></p>`); },
  signup() { return authPage("Create your account", "signup", `<label>Full name<input name="name" autocomplete="name"><small class="err" data-for="name"></small></label>
      <label>Email<input name="email" type="email" autocomplete="email"><small class="err" data-for="email"></small></label>
      <label>Password (min 8 characters)<input name="password" type="password" autocomplete="new-password"><small class="err" data-for="password"></small></label>
      <button class="btn block" type="submit">Sign up</button><p class="center small">Already registered? <a href="#/login">Log in</a></p>`); },
  forgot() { return authPage("Reset password", "forgot", `<p class="muted">Enter your email and we will send reset instructions. (UI only in this demo.)</p>
      <label>Email<input name="email" type="email"><small class="err" data-for="email"></small></label><button class="btn block" type="submit">Send reset link</button><p class="center small"><a href="#/login">Back to login</a></p>`); },

  dashboard() {
    const list = resumes().sort((a, b) => b.updated - a.updated), q = (store.get("q", "") || "").toLowerCase();
    const shown = list.filter(r => (r.title + r.personal.name).toLowerCase().includes(q));
    return `${nav("dashboard")}<main class="wrap page"><div class="row"><div><h1>Hi ${esc(session().name.split(" ")[0])} 👋</h1><p class="muted">${list.length} resume${list.length === 1 ? "" : "s"} saved</p></div>
      <button class="btn" id="newResume">＋ New resume</button></div>
      <input id="resumeSearch" type="search" placeholder="Search resumes…" value="${esc(q)}" aria-label="Search resumes">
      <div class="grid3" id="resumeGrid">${shown.map(resumeCard).join("") || `<p class="empty">${list.length ? "No resumes match your search." : "No resumes yet. Create your first one!"}</p>`}</div></main>${footer()}`;
  },

  builder(id) {
    const r = getResume(id); if (!r) return `${nav("dashboard")}<main class="wrap page"><p class="empty">Resume not found. <a href="#/dashboard">Back to dashboard</a></p></main>`;
    return `${nav("dashboard")}<main class="builder"><div class="editor" id="editor">${editorHTML(r)}</div>
      <div class="preview-pane"><div class="preview-bar"><select id="tplSelect" aria-label="Template">${SAMPLES.map(([k, n]) => `<option value="${k}" ${r.template === k ? "selected" : ""}>${n}</option>`).join("")}</select>
        <label class="inline">Colour <input type="color" id="colorPick" value="${esc(r.color)}"></label>
        <select id="fontSelect" aria-label="Font">${[["sans", "Sans"], ["serif", "Serif"], ["mono", "Mono"]].map(([k, n]) => `<option value="${k}" ${r.font === k ? "selected" : ""}>${n}</option>`).join("")}</select>
        <button class="btn sm" id="printBtn">⬇ Download PDF</button></div><div class="paper" id="paper">${renderResume(r)}</div><p class="muted small center" id="saveState">All changes saved</p></div></main>`;
  },

  profile() {
    const u = session();
    return `${nav("profile")}<main class="wrap page narrow"><h1>Profile</h1><form id="profileForm" class="card form" novalidate>
      <div class="avatar big">${u.photo ? `<img src="${esc(u.photo)}" alt="">` : esc(u.name.charAt(0).toUpperCase())}</div>
      <label>Profile picture<input type="file" name="photo" accept="image/*"></label>
      <label>Name<input name="name" value="${esc(u.name)}"><small class="err" data-for="name"></small></label>
      <label>Email<input name="email" type="email" value="${esc(u.email)}"><small class="err" data-for="email"></small></label><button class="btn" type="submit">Save profile</button></form>
      <form id="pwForm" class="card form" novalidate><h3>Change password</h3><label>Current password<input name="old" type="password"></label>
      <label>New password<input name="pw" type="password"><small class="err" data-for="pw"></small></label><button class="btn" type="submit">Update password</button></form></main>${footer()}`;
  },

  settings() {
    const s = store.get("settings", { dark: false, notify: true, marketing: false, theme: "indigo" });
    return `${nav("settings")}<main class="wrap page narrow"><h1>Settings</h1><div class="card form">
      <label class="switch"><input type="checkbox" data-setting="dark" ${s.dark ? "checked" : ""}> Dark mode</label>
      <label>Theme colour<select data-setting="theme">${["indigo", "emerald", "rose", "amber"].map(t => `<option ${s.theme === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label class="switch"><input type="checkbox" data-setting="notify" ${s.notify ? "checked" : ""}> Email notifications (UI only)</label>
      <label class="switch"><input type="checkbox" data-setting="marketing" ${s.marketing ? "checked" : ""}> Product updates (UI only)</label></div>
      <div class="card form"><h3>Account</h3><p class="muted">Signed in as ${esc(session().email)}</p><button class="btn danger" id="deleteAccount">Delete account and all resumes</button></div></main>${footer()}`;
  }
};
function authPage(title, id, body) { return `${nav()}<main class="auth"><form id="${id}Form" class="card form auth-card" novalidate><h1>${title}</h1>${body}</form></main>`; }
function resumeCard(r) {
  return `<article class="card rcard"><div class="mini" data-open="${r.id}">${renderResume(r)}</div><div class="rbody"><b>${esc(r.title)}</b><span class="muted small">Updated ${new Date(r.updated).toLocaleDateString()}</span>
    <div class="actions"><a class="btn sm" href="#/builder/${r.id}">Edit</a><button class="btn ghost sm" data-dup="${r.id}">Duplicate</button><button class="btn ghost sm danger-t" data-del="${r.id}">Delete</button></div></div></article>`;
}

// ---------- builder form ----------
const inp = (path, label, val, type = "text", extra = "") => `<label>${label}<input type="${type}" data-path="${path}" value="${esc(val)}" ${extra}></label>`;
const area = (path, label, val, rows = 3) => `<label>${label}<textarea data-path="${path}" rows="${rows}">${esc(val)}</textarea></label>`;
function listBlock(key, title, r, fields) {
  return `<fieldset class="blk"><legend>${title}</legend>${r[key].map((e, i) => `<div class="entry">${fields(e, i)}<button class="btn ghost sm danger-t" data-remove="${key}.${i}">Remove</button></div>`).join("")}
    <button class="btn ghost sm" data-add="${key}">＋ Add ${title.toLowerCase().replace(/s$/, "")}</button></fieldset>`;
}
function editorHTML(r) {
  const p = "personal.";
  return `<div class="row"><a href="#/dashboard">← Dashboard</a></div>
  <label>Resume name<input data-path="title" value="${esc(r.title)}"></label>
  <fieldset class="blk"><legend>Personal information</legend><div class="two">${inp(p + "name", "Full name", r.personal.name)}${inp(p + "title", "Job title", r.personal.title)}
    ${inp(p + "email", "Email", r.personal.email, "email")}${inp(p + "phone", "Phone", r.personal.phone, "tel")}</div>${inp(p + "address", "Address", r.personal.address)}
    <div class="two">${inp(p + "linkedin", "LinkedIn", r.personal.linkedin)}${inp(p + "github", "GitHub portfolio", r.personal.github)}</div>${inp(p + "website", "Personal website (optional)", r.personal.website)}
    <label>Profile photo (optional)<input type="file" id="photoIn" accept="image/*"></label>${r.personal.photo ? `<button class="btn ghost sm" id="rmPhoto">Remove photo</button>` : ""}</fieldset>
  <fieldset class="blk"><legend>Professional summary</legend>${area("summary", "Summary / objective", r.summary, 4)}${inp("goal", "Career goal", r.goal)}
    <button class="btn ghost sm" id="aiSummary">✨ Generate summary</button></fieldset>
  ${listBlock("education", "Education", r, (e, i) => `<div class="two">${inp(`education.${i}.degree`, "Degree", e.degree)}${inp(`education.${i}.school`, "College / University", e.school)}${inp(`education.${i}.start`, "Start year", e.start)}${inp(`education.${i}.end`, "End year", e.end)}</div>${inp(`education.${i}.grade`, "Percentage / CGPA", e.grade)}`)}
  <fieldset class="blk"><legend>Skills</legend><div class="chips" id="skillChips">${r.skills.map((s, i) => `<span class="chip">${esc(s)} <button data-skill-rm="${i}" aria-label="Remove ${esc(s)}">×</button></span>`).join("")}</div>
    <div class="row g"><input id="skillIn" placeholder="Type a skill and press Enter" aria-label="Add skill"><button class="btn sm" id="skillAdd">Add</button></div>
    <div class="chips" id="skillSuggest">${aiSkills(r).slice(0, 8).map(s => `<button class="chip sug" data-sug="${esc(s)}">＋ ${esc(s)}</button>`).join("")}</div><p class="muted small">✨ Suggested skills based on your job title</p></fieldset>
  ${listBlock("experience", "Work experience", r, (e, i) => `<div class="two">${inp(`experience.${i}.company`, "Company", e.company)}${inp(`experience.${i}.position`, "Position", e.position)}</div>${inp(`experience.${i}.duration`, "Duration", e.duration)}${area(`experience.${i}.details`, "Responsibilities", e.details)}`)}
  ${listBlock("projects", "Projects", r, (e, i) => `${inp(`projects.${i}.title`, "Project title", e.title)}${inp(`projects.${i}.tech`, "Technologies used", e.tech)}${area(`projects.${i}.desc`, "Description", e.desc)}
     <button class="btn ghost sm" data-aiproj="${i}">✨ Write description</button><div class="two">${inp(`projects.${i}.github`, "GitHub link", e.github)}${inp(`projects.${i}.live`, "Live link", e.live)}</div>`)}
  ${listBlock("certifications", "Certifications", r, (e, i) => `<div class="two">${inp(`certifications.${i}.name`, "Certification", e.name)}${inp(`certifications.${i}.issuer`, "Issuer", e.issuer)}</div>${inp(`certifications.${i}.year`, "Year", e.year)}`)}
  ${listBlock("languages", "Languages", r, (e, i) => `<div class="two">${inp(`languages.${i}.name`, "Language", e.name)}<label>Level<select data-path="languages.${i}.level">${["Basic", "Intermediate", "Advanced", "Fluent", "Native"].map(l => `<option ${e.level === l ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>`)}
  ${listBlock("achievements", "Achievements", r, (e, i) => inp(`achievements.${i}.text`, "Award / hackathon / volunteer work", e.text))}`;
}

// ---------- router ----------
let current = null, saveTimer = null;
const PROTECTED = ["dashboard", "builder", "profile", "settings"];
function applySettings() {
  const s = store.get("settings", { dark: false, theme: "indigo" });
  document.documentElement.classList.toggle("dark", !!s.dark);
  const colors = { indigo: "#4f46e5", emerald: "#059669", rose: "#e11d48", amber: "#d97706" };
  document.documentElement.style.setProperty("--brand", colors[s.theme] || colors.indigo);
}
async function render() {
  const [name = "", arg] = (location.hash.slice(2) || "").split("/");
  if (PROTECTED.includes(name) && !session()) { location.hash = "#/login"; return; }
  if (["login", "signup", "forgot"].includes(name) && session()) { location.hash = "#/dashboard"; return; }
  const map = { "": "landing", "templates-info": "landing", how: "landing", contact: "landing" };
  const fn = views[map[name] ?? name] || views.landing;
  current = name === "builder" ? getResume(arg) : null;
  $("#app").innerHTML = fn(arg);
  if (["templates-info", "how", "contact"].includes(name)) setTimeout(() => $({ "templates-info": "#tpl", how: ".step", contact: "#contact" }[name])?.scrollIntoView({ behavior: "smooth" }), 30);
  else window.scrollTo(0, 0);
}
function markSaving() { const s = $("#saveState"); if (s) s.textContent = "Saving…"; clearTimeout(saveTimer); saveTimer = setTimeout(() => { saveResume(current); const s2 = $("#saveState"); if (s2) s2.textContent = "All changes saved"; }, 350); }
function refreshPreview() { const paper = $("#paper"); if (paper) paper.innerHTML = renderResume(current); markSaving(); }
function refreshEditor() { const ed = $("#editor"), y = ed.scrollTop, pageY = window.scrollY; ed.innerHTML = editorHTML(current); ed.scrollTop = y; window.scrollTo(0, pageY); }

// ---------- validation helpers ----------
function fail(form, errs) { $$(".err", form).forEach(s => s.textContent = errs[s.dataset.for] || ""); const k = Object.keys(errs)[0]; if (k) form.elements[k]?.focus(); return Object.keys(errs).length > 0; }
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const fileToDataURL = f => new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(f); });
async function resizeImage(file, max = 240) {
  const img = new Image(); img.src = await fileToDataURL(file); await img.decode();
  const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k;
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", .85);
}

// ---------- events ----------
document.addEventListener("submit", async e => {
  const f = e.target; if (!f.id.endsWith("Form")) return; e.preventDefault();
  const d = Object.fromEntries(new FormData(f));
  if (f.id === "signupForm") {
    const errs = {}; if (!d.name?.trim() || d.name.trim().length < 2) errs.name = "Enter your name."; if (!EMAIL.test(d.email || "")) errs.email = "Enter a valid email."; if ((d.password || "").length < 8) errs.password = "Use at least 8 characters.";
    if (!errs.email && users().some(u => u.email === d.email.toLowerCase())) errs.email = "This email is already registered.";
    if (fail(f, errs)) return;
    const salt = uid(), u = { id: uid(), name: d.name.trim(), email: d.email.toLowerCase(), salt, hash: await hash(d.password, salt), photo: "" };
    store.set("users", [...users(), u]); store.set("session", u.id); toast("Welcome, " + u.name + "!"); location.hash = "#/dashboard";
  } else if (f.id === "loginForm") {
    const u = users().find(x => x.email === (d.email || "").toLowerCase());
    if (!EMAIL.test(d.email || "")) return void fail(f, { email: "Enter a valid email." });
    if (!d.password) return void fail(f, { password: "Enter your password." });
    if (!u || await hash(d.password, u.salt) !== u.hash) return void fail(f, { password: "Incorrect email or password." });
    store.set("session", u.id); location.hash = "#/dashboard";
  } else if (f.id === "forgotForm") {
    if (fail(f, EMAIL.test(d.email || "") ? {} : { email: "Enter a valid email." })) return; toast("If this email exists, a reset link has been sent (demo)."); location.hash = "#/login";
  } else if (f.id === "contactForm") {
    const errs = {}; if (!d.name?.trim()) errs.name = "Enter your name."; if (!EMAIL.test(d.email || "")) errs.email = "Enter a valid email."; if (!d.message?.trim() || d.message.trim().length < 10) errs.message = "Message must be at least 10 characters.";
    if (fail(f, errs)) return; f.reset(); toast("Thanks! We will get back to you.");
  } else if (f.id === "profileForm") {
    const errs = {}; if (!d.name?.trim()) errs.name = "Enter your name."; if (!EMAIL.test(d.email || "")) errs.email = "Enter a valid email.";
    if (fail(f, errs)) return; const patch = { name: d.name.trim(), email: d.email.toLowerCase() };
    if (d.photo?.size) patch.photo = await resizeImage(d.photo); updateUser(patch); toast("Profile saved"); render();
  } else if (f.id === "pwForm") {
    const u = session(); if (await hash(d.old || "", u.salt) !== u.hash) return void fail(f, { pw: "Current password is incorrect." });
    if ((d.pw || "").length < 8) return void fail(f, { pw: "Use at least 8 characters." });
    const salt = uid(); updateUser({ salt, hash: await hash(d.pw, salt) }); f.reset(); fail(f, {}); toast("Password updated");
  }
});

document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "resumeSearch") { store.set("q", t.value); const q = t.value.toLowerCase(); $("#resumeGrid").innerHTML = resumes().filter(r => (r.title + r.personal.name).toLowerCase().includes(q)).map(resumeCard).join("") || `<p class="empty">No resumes match your search.</p>`; }
  if (t.dataset.path && current) { setPath(current, t.dataset.path, t.value); refreshPreview(); }
  if (t.id === "colorPick") { current.color = t.value; refreshPreview(); }
});
document.addEventListener("change", async e => {
  const t = e.target;
  if (t.id === "tplSelect") { current.template = t.value; refreshPreview(); }
  if (t.id === "fontSelect") { current.font = t.value; refreshPreview(); }
  if (t.dataset.path && t.tagName === "SELECT" && current) { setPath(current, t.dataset.path, t.value); refreshPreview(); }
  if (t.id === "photoIn" && t.files[0]) { current.personal.photo = await resizeImage(t.files[0]); refreshEditor(); refreshPreview(); }
  if (t.dataset.setting) { const s = store.get("settings", { dark: false, notify: true, marketing: false, theme: "indigo" }); s[t.dataset.setting] = t.type === "checkbox" ? t.checked : t.value; store.set("settings", s); applySettings(); }
});
document.addEventListener("keydown", e => { if (e.target.id === "skillIn" && e.key === "Enter") { e.preventDefault(); addSkill(e.target.value); } });
function addSkill(v) { v = v.trim(); if (!v || current.skills.some(s => s.toLowerCase() === v.toLowerCase())) return; current.skills.push(v); refreshEditor(); refreshPreview(); $("#skillIn")?.focus(); }

document.addEventListener("click", async e => {
  const t = e.target.closest("button,[data-open]"); if (!t) return;
  if (t.id === "logout") { store.set("session", null); location.hash = "#/"; }
  else if (t.id === "burger") { const o = $("#nav").classList.toggle("open"); t.setAttribute("aria-expanded", o); }
  else if (t.id === "newResume") { const r = blank(); const u = session(); r.personal.name = u.name; r.personal.email = u.email; saveResume(r); location.hash = "#/builder/" + r.id; }
  else if (t.dataset.open) location.hash = "#/builder/" + t.dataset.open;
  else if (t.dataset.dup) { const r = structuredClone(getResume(t.dataset.dup)); r.id = uid(); r.title += " (copy)"; saveResume(r); toast("Resume duplicated"); render(); }
  else if (t.dataset.del) { if (confirm("Delete this resume? This cannot be undone.")) { saveResumes(resumes().filter(r => r.id !== t.dataset.del)); toast("Resume deleted"); render(); } }
  else if (t.dataset.add) { current[t.dataset.add].push(ENTRY[t.dataset.add]()); refreshEditor(); refreshPreview(); }
  else if (t.dataset.remove) { const [k, i] = t.dataset.remove.split("."); current[k].splice(+i, 1); refreshEditor(); refreshPreview(); }
  else if (t.id === "skillAdd") addSkill($("#skillIn").value);
  else if (t.dataset.skillRm) { current.skills.splice(+t.dataset.skillRm, 1); refreshEditor(); refreshPreview(); }
  else if (t.dataset.sug) addSkill(t.dataset.sug);
  else if (t.id === "aiSummary") { current.summary = aiSummary(current); refreshEditor(); refreshPreview(); toast("Summary generated - edit it freely"); }
  else if (t.dataset.aiproj) { const p = current.projects[+t.dataset.aiproj]; p.desc = aiProject(p); refreshEditor(); refreshPreview(); }
  else if (t.id === "rmPhoto") { current.personal.photo = ""; refreshEditor(); refreshPreview(); }
  else if (t.id === "printBtn") { saveResume(current); window.print(); }
  else if (t.id === "deleteAccount") { if (confirm("Delete your account and all resumes?")) { const id = session().id; localStorage.removeItem("rc_resumes_" + id); store.set("users", users().filter(u => u.id !== id)); store.set("session", null); location.hash = "#/"; } }
});
window.addEventListener("hashchange", render);
applySettings(); render();
