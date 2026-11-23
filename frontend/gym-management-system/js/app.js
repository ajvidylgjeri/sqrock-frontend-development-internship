"use strict";
/* IronPulse Gym Management System - vanilla JS SPA (hash routing, localStorage "database").
   Authentication is a front-end demo: demo admin = admin@gym.local / Admin@123. */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const DB_KEY = "ip_db";
const money = n => "$" + Number(n || 0).toFixed(2);
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2000); }

// ---------- storage ----------
const ls = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* unavailable */ } } };
function seed() {
  const d = today();
  return {
    plans: [{ id: "p1", name: "Basic", duration: 30, price: 25, features: "Gym floor access, locker", active: "Active" }, { id: "p2", name: "Standard", duration: 90, price: 65, features: "Basic + group classes", active: "Active" }, { id: "p3", name: "Premium", duration: 365, price: 220, features: "All access, personal trainer sessions, sauna", active: "Active" }],
    trainers: [{ id: "t1", name: "Marko Hoxha", specialization: "Strength & Conditioning", experience: 8, phone: "+355 69 111 2233", email: "marko@ironpulse.example" }, { id: "t2", name: "Elira Dervishi", specialization: "Yoga & Mobility", experience: 5, phone: "+355 69 222 3344", email: "elira@ironpulse.example" }, { id: "t3", name: "Ben Krasniqi", specialization: "CrossFit", experience: 6, phone: "+355 69 333 4455", email: "ben@ironpulse.example" }],
    members: [
      { id: "m1", name: "Arta Leka", email: "arta@example.com", phone: "+355 69 500 0001", gender: "Female", age: 24, planId: "p3", joined: addDays(d, -40), status: "Active", trainerId: "t2" },
      { id: "m2", name: "Dorian Basha", email: "dorian@example.com", phone: "+355 69 500 0002", gender: "Male", age: 31, planId: "p2", joined: addDays(d, -20), status: "Active", trainerId: "t1" },
      { id: "m3", name: "Sara Kola", email: "sara@example.com", phone: "+355 69 500 0003", gender: "Female", age: 28, planId: "p1", joined: addDays(d, -50), status: "Expired", trainerId: "t3" },
      { id: "m4", name: "Leo Gjoni", email: "leo@example.com", phone: "+355 69 500 0004", gender: "Male", age: 19, planId: "p1", joined: addDays(d, -5), status: "Active", trainerId: "t1" }],
    attendance: [{ id: "a1", memberId: "m1", date: d }, { id: "a2", memberId: "m2", date: d }, { id: "a3", memberId: "m1", date: addDays(d, -1) }, { id: "a4", memberId: "m4", date: addDays(d, -1) }],
    workouts: [{ id: "w1", name: "Full Body Strength", level: "Intermediate", exercises: "Squat 4x8\nBench press 4x8\nDeadlift 3x5\nPull-ups 3x10", diet: "High protein, 2.2L water", memberId: "m2" }, { id: "w2", name: "Mobility & Core", level: "Beginner", exercises: "Cat-cow 2x10\nPlank 3x40s\nHip openers 2x12", diet: "", memberId: "m1" }],
    payments: [{ id: "pay1", memberId: "m1", planId: "p3", amount: 220, date: addDays(d, -40), status: "Paid" }, { id: "pay2", memberId: "m2", planId: "p2", amount: 65, date: addDays(d, -20), status: "Paid" }, { id: "pay3", memberId: "m3", planId: "p1", amount: 25, date: addDays(d, -50), status: "Paid" }, { id: "pay4", memberId: "m4", planId: "p1", amount: 25, date: addDays(d, -5), status: "Pending" }],
    activity: [{ t: Date.now() - 3600e3, text: "Leo Gjoni joined with the Basic plan" }, { t: Date.now() - 7200e3, text: "Payment received from Dorian Basha" }],
    gym: { name: "IronPulse Gym", address: "Rruga Myslym Shyri, Tirana", phone: "+355 4 000 0000", hours: "06:00 - 23:00" }
  };
}
let db = ls.get(DB_KEY, null) || seed();
const save = () => ls.set(DB_KEY, db);
const log = text => { db.activity.unshift({ t: Date.now(), text }); db.activity = db.activity.slice(0, 15); };
const byId = (list, id) => db[list].find(x => x.id === id);

// ---------- auth ----------
const users = () => ls.get("ip_users", [{ id: "u0", name: "Gym Admin", email: "admin@gym.local", salt: "demo", hash: null, photo: "", demo: true }]);
async function sha(pw, salt) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + pw)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
async function ensureDemo() { const u = users(); if (u[0]?.demo && !u[0].hash) { u[0].hash = await sha("Admin@123", "demo"); ls.set("ip_users", u); } }
const me = () => users().find(u => u.id === ls.get("ip_session", null));
const patchMe = p => ls.set("ip_users", users().map(u => u.id === me().id ? { ...u, ...p } : u));

// ---------- generic CRUD config ----------
const planName = id => byId("plans", id)?.name || "—";
const memberName = id => byId("members", id)?.name || "—";
const trainerName = id => byId("trainers", id)?.name || "—";
const opts = (list, label = "name") => () => db[list].map(x => [x.id, x[label]]);
const ENT = {
  members: { title: "Members", single: "member", fields: [
      { n: "name", l: "Full name", req: 1 }, { n: "email", l: "Email", t: "email", req: 1 }, { n: "phone", l: "Phone", t: "tel", req: 1 },
      { n: "gender", l: "Gender", sel: () => [["Male", "Male"], ["Female", "Female"], ["Other", "Other"]] }, { n: "age", l: "Age", t: "number", min: 10, max: 100, req: 1 },
      { n: "planId", l: "Membership plan", sel: opts("plans"), req: 1 }, { n: "trainerId", l: "Trainer (optional)", sel: () => [["", "— none —"], ...opts("trainers")()] },
      { n: "joined", l: "Joining date", t: "date", req: 1, def: today }, { n: "status", l: "Status", sel: () => [["Active", "Active"], ["Expired", "Expired"], ["Frozen", "Frozen"]] }],
    cols: [["Name", m => `<b>${esc(m.name)}</b><br><span class="muted small">${esc(m.email)}</span>`], ["Phone", m => esc(m.phone)], ["Plan", m => esc(planName(m.planId))], ["Joined", m => esc(m.joined)], ["Status", m => badge(m.status)]],
    search: m => m.name + m.email, filters: [["status", "Status", ["Active", "Expired", "Frozen"]], ["planId", "Plan", () => db.plans.map(p => [p.id, p.name])]],
    extra: m => `<button class="btn ghost sm" data-renew="${m.id}">Renew</button>` },
  trainers: { title: "Trainers", single: "trainer", fields: [{ n: "name", l: "Name", req: 1 }, { n: "specialization", l: "Specialization", req: 1 }, { n: "experience", l: "Experience (years)", t: "number", min: 0, max: 60, req: 1 }, { n: "phone", l: "Phone", t: "tel", req: 1 }, { n: "email", l: "Email", t: "email", req: 1 }],
    cols: [["Name", t => `<b>${esc(t.name)}</b>`], ["Specialization", t => esc(t.specialization)], ["Experience", t => t.experience + " yrs"], ["Contact", t => esc(t.phone) + "<br><span class='muted small'>" + esc(t.email) + "</span>"], ["Assigned members", t => db.members.filter(m => m.trainerId === t.id).map(m => esc(m.name)).join(", ") || "—"]],
    search: t => t.name + t.specialization },
  plans: { title: "Membership plans", single: "plan", fields: [{ n: "name", l: "Plan name", req: 1 }, { n: "duration", l: "Duration (days)", t: "number", min: 1, req: 1 }, { n: "price", l: "Price ($)", t: "number", min: 0, step: "0.01", req: 1 }, { n: "features", l: "Features", area: 1 }, { n: "active", l: "Status", sel: () => [["Active", "Active"], ["Inactive", "Inactive"]] }],
    cols: [["Plan", p => `<b>${esc(p.name)}</b>`], ["Duration", p => p.duration + " days"], ["Price", p => money(p.price)], ["Features", p => esc(p.features)], ["Status", p => badge(p.active)]], search: p => p.name, filters: [["active", "Status", ["Active", "Inactive"]]] },
  workouts: { title: "Workout & diet plans", single: "plan", fields: [{ n: "name", l: "Plan name", req: 1 }, { n: "level", l: "Level", sel: () => [["Beginner", "Beginner"], ["Intermediate", "Intermediate"], ["Advanced", "Advanced"]] }, { n: "exercises", l: "Exercises (one per line)", area: 1, req: 1 }, { n: "diet", l: "Diet plan (optional)", area: 1 }, { n: "memberId", l: "Assign to member", sel: () => [["", "— unassigned —"], ...opts("members")()] }],
    cols: [["Plan", w => `<b>${esc(w.name)}</b><br><span class="muted small">${esc(w.level)}</span>`], ["Exercises", w => esc(w.exercises).replace(/\n/g, "<br>")], ["Diet", w => esc(w.diet) || "—"], ["Assigned to", w => w.memberId ? esc(memberName(w.memberId)) : "—"]], search: w => w.name, filters: [["level", "Level", ["Beginner", "Intermediate", "Advanced"]]] },
  payments: { title: "Payments", single: "payment", fields: [{ n: "memberId", l: "Member", sel: opts("members"), req: 1 }, { n: "planId", l: "Plan", sel: opts("plans"), req: 1 }, { n: "amount", l: "Amount ($)", t: "number", min: 0, step: "0.01", req: 1 }, { n: "date", l: "Date", t: "date", req: 1, def: today }, { n: "status", l: "Status", sel: () => [["Paid", "Paid"], ["Pending", "Pending"]] }],
    cols: [["Member", p => `<b>${esc(memberName(p.memberId))}</b>`], ["Plan", p => esc(planName(p.planId))], ["Amount", p => money(p.amount)], ["Date", p => esc(p.date)], ["Status", p => badge(p.status)]], search: p => memberName(p.memberId), filters: [["status", "Status", ["Paid", "Pending"]]],
    extra: p => `<button class="btn ghost sm" data-invoice="${p.id}">Invoice</button>${p.status === "Pending" ? `<button class="btn sm" data-markpaid="${p.id}">Mark paid</button>` : ""}` }
};
function badge(s) { const c = { Active: "ok", Paid: "ok", Expired: "bad", Pending: "warn", Frozen: "info", Inactive: "bad", Beginner: "info", Intermediate: "warn", Advanced: "bad" }[s] || "info"; return `<span class="badge ${c}">${esc(s)}</span>`; }
const memberExpiry = m => addDays(m.joined, byId("plans", m.planId)?.duration || 0);

// ---------- layout ----------
function publicNav() { return `<header class="topbar"><div class="wrap bar"><a class="brand" href="#/">🏋️ Iron<span>Pulse</span></a><button class="burger" id="burger" aria-label="Menu" aria-expanded="false">☰</button>
  <nav id="nav"><a href="#/">Home</a><a href="#/#plans">Plans</a><a href="#/#trainers">Trainers</a><a href="#/#contact">Contact</a><a class="btn sm" href="#/login">Admin login</a></nav></div></header>`; }
const footer = () => `<footer class="foot"><div class="wrap foot-grid"><div><b>🏋️ ${esc(db.gym.name)}</b><p class="muted">Train hard. Recover well.</p></div><div><b>Visit us</b><p class="muted">${esc(db.gym.address)}<br>${esc(db.gym.hours)}</p></div><div><b>Follow</b><p><a href="https://instagram.com" rel="noopener">Instagram</a> · <a href="https://facebook.com" rel="noopener">Facebook</a></p></div></div><p class="copy">© 2026 ${esc(db.gym.name)} — demo project</p></footer>`;
const NAV = [["dashboard", "📊", "Dashboard"], ["members", "👥", "Members"], ["trainers", "🏅", "Trainers"], ["plans", "🎫", "Plans"], ["attendance", "✅", "Attendance"], ["workouts", "💪", "Workouts"], ["payments", "💳", "Payments"], ["profile", "👤", "Profile"], ["settings", "⚙️", "Settings"]];
function shell(active, title, body) {
  const u = me();
  return `<div class="shell"><aside class="side" id="side"><a class="brand" href="#/dashboard">🏋️ Iron<span>Pulse</span></a><nav>${NAV.map(([k, i, n]) => `<a href="#/${k}" class="${k === active ? "on" : ""}">${i} ${n}</a>`).join("")}</nav><button class="btn ghost sm block" id="logout">Log out</button></aside>
    <div class="main"><header class="head"><button class="burger" id="sideToggle" aria-label="Toggle sidebar">☰</button><h1>${title}</h1><div class="who"><span class="avatar">${u.photo ? `<img src="${esc(u.photo)}" alt="">` : esc(u.name[0].toUpperCase())}</span><span class="hide-sm">${esc(u.name)}</span></div></header><section class="content">${body}</section></div></div>`;
}

// ---------- views ----------
function crud(key) {
  const e = ENT[key], q = ls.get("q_" + key, ""), fl = ls.get("f_" + key, {});
  const rows = db[key].filter(r => e.search(r).toLowerCase().includes(q.toLowerCase()) && Object.entries(fl).every(([k, v]) => !v || r[k] === v));
  return `<div class="toolbar"><input id="crudSearch" type="search" placeholder="Search ${e.title.toLowerCase()}…" value="${esc(q)}" aria-label="Search">
    ${(e.filters || []).map(([k, l, o]) => `<select data-filter="${k}" aria-label="Filter by ${l}"><option value="">All ${l.toLowerCase()}</option>${(typeof o === "function" ? o() : o.map(x => [x, x])).map(([v, t]) => `<option value="${esc(v)}" ${fl[k] === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`).join("")}
    <button class="btn" data-new="${key}">＋ Add ${e.single}</button></div>
    <div class="tablewrap"><table><thead><tr>${e.cols.map(c => `<th>${c[0]}</th>`).join("")}<th>Actions</th></tr></thead><tbody id="crudBody">${crudRows(key, rows)}</tbody></table></div><p class="muted small" id="crudCount">${rows.length} of ${db[key].length} shown</p>`;
}
function crudRows(key, rows) {
  const e = ENT[key];
  return rows.map(r => `<tr>${e.cols.map(c => `<td data-label="${c[0]}">${c[1](r)}</td>`).join("")}<td class="acts">${e.extra ? e.extra(r) : ""}<button class="btn ghost sm" data-edit="${key}:${r.id}">Edit</button><button class="btn ghost sm danger-t" data-delete="${key}:${r.id}">Delete</button></td></tr>`).join("") || `<tr><td colspan="${e.cols.length + 1}" class="empty">Nothing found.</td></tr>`;
}
const views = {
  landing() {
    return `${publicNav()}<main><section class="hero wrap"><div><span class="pill">🔥 First week free</span><h1>Stronger every day at ${esc(db.gym.name)}.</h1><p class="lead">Modern equipment, expert trainers and flexible memberships in the heart of the city.</p><a class="btn" href="#/login">Open admin dashboard</a> <a class="btn ghost" href="#/signup">Create staff account</a></div><div class="hero-art" aria-hidden="true">🏋️‍♂️</div></section>
    <section class="wrap"><h2 class="center">About the gym</h2><p class="center lead narrow">${esc(db.gym.name)} offers 1,200 m² of training space, group classes, personal training, a sauna and a friendly community. Open ${esc(db.gym.hours)}.</p></section>
    <section class="wrap" id="plans"><h2 class="center">Membership plans</h2><div class="grid3">${db.plans.filter(p => p.active === "Active").map((p, i) => `<div class="card plan ${i === 1 ? "pop" : ""}"><h3>${esc(p.name)}</h3><div class="price">${money(p.price)}<small> / ${p.duration} days</small></div><p class="muted">${esc(p.features)}</p><a class="btn block" href="#/signup">Join now</a></div>`).join("")}</div></section>
    <section class="wrap"><h2 class="center">Services</h2><div class="grid3">${[["🏋️", "Strength zone", "Free weights, racks and machines."], ["🧘", "Group classes", "Yoga, HIIT, spinning and more."], ["🥗", "Nutrition coaching", "Diet plans tailored to your goals."]].map(([i, t, d]) => `<div class="card"><div class="ic">${i}</div><h3>${t}</h3><p class="muted">${d}</p></div>`).join("")}</div></section>
    <section class="wrap" id="trainers"><h2 class="center">Our trainers</h2><div class="grid3">${db.trainers.map(t => `<div class="card center"><div class="avatar big">${esc(t.name[0])}</div><h3>${esc(t.name)}</h3><p class="muted">${esc(t.specialization)} · ${t.experience} yrs</p></div>`).join("")}</div></section>
    <section class="wrap narrow"><h2 class="center">FAQ</h2>${[["Can I try before I join?", "Yes - your first week is free."], ["Can I freeze my membership?", "Yes, ask the front desk for up to 30 days."], ["Are classes included?", "Standard and Premium plans include group classes."]].map(([q, a]) => `<details class="card"><summary>${q}</summary><p class="muted">${a}</p></details>`).join("")}</section>
    <section class="wrap narrow" id="contact"><h2 class="center">Contact</h2><form id="contactForm" class="card form" novalidate><label>Name<input name="name"><small class="err" data-for="name"></small></label><label>Email<input name="email" type="email"><small class="err" data-for="email"></small></label><label>Message<textarea name="message" rows="4"></textarea><small class="err" data-for="message"></small></label><button class="btn" type="submit">Send</button></form></section></main>${footer()}`;
  },
  login: () => authPage("Admin login", "login", `<p class="muted small">Demo account: <b>admin@gym.local</b> / <b>Admin@123</b></p><label>Email<input name="email" type="email" autocomplete="email"><small class="err" data-for="email"></small></label><label>Password<input name="password" type="password" autocomplete="current-password"><small class="err" data-for="password"></small></label><button class="btn block" type="submit">Log in</button><p class="center small"><a href="#/forgot">Forgot password?</a> · <a href="#/signup">Create account</a></p>`),
  signup: () => authPage("Create staff account", "signup", `<label>Full name<input name="name"><small class="err" data-for="name"></small></label><label>Email<input name="email" type="email"><small class="err" data-for="email"></small></label><label>Password (min 8)<input name="password" type="password" autocomplete="new-password"><small class="err" data-for="password"></small></label><button class="btn block" type="submit">Sign up</button><p class="center small"><a href="#/login">Back to login</a></p>`),
  forgot: () => authPage("Reset password", "forgot", `<p class="muted">Enter your email to receive reset instructions (UI only).</p><label>Email<input name="email" type="email"><small class="err" data-for="email"></small></label><button class="btn block" type="submit">Send reset link</button><p class="center small"><a href="#/login">Back to login</a></p>`),

  dashboard() {
    const active = db.members.filter(m => m.status === "Active").length, month = today().slice(0, 7);
    const rev = db.payments.filter(p => p.status === "Paid" && p.date.startsWith(month)).reduce((s, p) => s + +p.amount, 0);
    const att = db.attendance.filter(a => a.date === today()).length, pending = db.payments.filter(p => p.status === "Pending");
    const stat = (i, l, v, c) => `<div class="card stat"><div class="si ${c}">${i}</div><div><div class="muted small">${l}</div><b>${v}</b></div></div>`;
    return shell("dashboard", "Dashboard", `<p class="lead">Welcome back, ${esc(me().name.split(" ")[0])}! Here is today's overview.</p><div class="stats">${stat("👥", "Total members", db.members.length, "c1")}${stat("✅", "Active memberships", active, "c2")}${stat("🏅", "Trainers", db.trainers.length, "c3")}${stat("💰", "Revenue this month", money(rev), "c4")}${stat("📅", "Today's attendance", att, "c5")}${stat("⏳", "Pending payments", pending.length, "c6")}</div>
      <div class="two-col"><div class="card"><h3>Recent activity</h3><ul class="feed">${db.activity.slice(0, 7).map(a => `<li>${esc(a.text)}<span class="muted small">${new Date(a.t).toLocaleString()}</span></li>`).join("") || "<li class='muted'>No activity yet.</li>"}</ul></div>
      <div class="card"><h3>Attendance, last 7 days</h3>${weekChart()}</div></div>`);
  },
  members: () => shell("members", "Members", crud("members")),
  trainers: () => shell("trainers", "Trainers", crud("trainers")),
  plans: () => shell("plans", "Membership plans", crud("plans")),
  workouts: () => shell("workouts", "Workout & diet plans", crud("workouts")),
  payments() {
    const pend = db.payments.filter(p => p.status === "Pending").reduce((s, p) => s + +p.amount, 0);
    return shell("payments", "Payments", `<div class="stats small-stats"><div class="card stat"><div><div class="muted small">Pending amount</div><b>${money(pend)}</b></div></div><div class="card stat"><div><div class="muted small">Total collected</div><b>${money(db.payments.filter(p => p.status === "Paid").reduce((s, p) => s + +p.amount, 0))}</b></div></div></div>${crud("payments")}`);
  },
  attendance() {
    const date = ls.get("att_date", today()), q = ls.get("att_q", ""), f = ls.get("att_m", "");
    const present = new Set(db.attendance.filter(a => a.date === date).map(a => a.memberId));
    const hist = db.attendance.filter(a => (!ls.get("att_hist_date", "") || a.date === ls.get("att_hist_date", "")) && (!f || a.memberId === f) && memberName(a.memberId).toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date));
    return shell("attendance", "Attendance", `<div class="card"><div class="toolbar"><label class="inline">Date <input type="date" id="attDate" value="${date}"></label><span class="muted">${present.size} present</span></div>
      <div class="chk">${db.members.filter(m => m.status === "Active").map(m => `<label class="chkrow"><input type="checkbox" data-att="${m.id}" ${present.has(m.id) ? "checked" : ""}> ${esc(m.name)}</label>`).join("") || "<p class='muted'>No active members.</p>"}</div></div>
      <div class="card"><h3>History</h3><div class="toolbar"><input id="attSearch" type="search" placeholder="Search by member…" value="${esc(q)}"><select id="attMember"><option value="">All members</option>${db.members.map(m => `<option value="${m.id}" ${f === m.id ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select><input type="date" id="attHistDate" value="${ls.get("att_hist_date", "")}" aria-label="Filter by date"></div>
      <div class="tablewrap"><table><thead><tr><th>Date</th><th>Member</th></tr></thead><tbody>${hist.map(a => `<tr><td data-label="Date">${a.date}</td><td data-label="Member">${esc(memberName(a.memberId))}</td></tr>`).join("") || `<tr><td colspan="2" class="empty">No records.</td></tr>`}</tbody></table></div></div>`);
  },
  profile() {
    const u = me();
    return shell("profile", "Profile", `<form id="profileForm" class="card form narrow-card" novalidate><div class="avatar big">${u.photo ? `<img src="${esc(u.photo)}" alt="">` : esc(u.name[0].toUpperCase())}</div><label>Profile picture<input type="file" name="photo" accept="image/*"></label><label>Name<input name="name" value="${esc(u.name)}"><small class="err" data-for="name"></small></label><label>Email<input name="email" type="email" value="${esc(u.email)}"><small class="err" data-for="email"></small></label><button class="btn" type="submit">Save profile</button></form>
      <form id="pwForm" class="card form narrow-card" novalidate><h3>Change password</h3><label>Current password<input name="old" type="password"></label><label>New password<input name="pw" type="password"><small class="err" data-for="pw"></small></label><button class="btn" type="submit">Update password</button></form>`);
  },
  settings() {
    const s = ls.get("ip_settings", { dark: false, email: true, sms: false });
    return shell("settings", "Settings", `<div class="card form narrow-card"><h3>Appearance & notifications</h3><label class="switch"><input type="checkbox" data-setting="dark" ${s.dark ? "checked" : ""}> Dark mode</label><label class="switch"><input type="checkbox" data-setting="email" ${s.email ? "checked" : ""}> Email notifications (UI)</label><label class="switch"><input type="checkbox" data-setting="sms" ${s.sms ? "checked" : ""}> SMS reminders (UI)</label></div>
      <form id="gymForm" class="card form narrow-card" novalidate><h3>Gym information</h3><label>Gym name<input name="name" value="${esc(db.gym.name)}"><small class="err" data-for="name"></small></label><label>Address<input name="address" value="${esc(db.gym.address)}"></label><label>Phone<input name="phone" value="${esc(db.gym.phone)}"></label><label>Opening hours<input name="hours" value="${esc(db.gym.hours)}"></label><button class="btn" type="submit">Save gym info</button></form>
      <div class="card narrow-card"><h3>Account</h3><p class="muted">Signed in as ${esc(me().email)}</p><button class="btn ghost danger-t" id="resetDemo">Reset demo data</button></div>`);
  }
};
function authPage(title, id, body) { return `${publicNav()}<main class="auth"><form id="${id}Form" class="card form auth-card" novalidate><h1>${title}</h1>${body}</form></main>`; }
function weekChart() {
  const days = [...Array(7)].map((_, i) => addDays(today(), i - 6)), counts = days.map(d => db.attendance.filter(a => a.date === d).length), max = Math.max(1, ...counts);
  return `<div class="bars" role="img" aria-label="Attendance per day for the last 7 days">${days.map((d, i) => `<div class="bar-col"><div class="bar-fill" style="height:${Math.round(counts[i] / max * 100)}%"><span>${counts[i]}</span></div><small>${d.slice(5)}</small></div>`).join("")}</div>`;
}

// ---------- modal form ----------
function openForm(key, id) {
  const e = ENT[key], rec = id ? byId(key, id) : {}, m = $("#modal"), f = $("#modalForm");
  f.dataset.key = key; f.dataset.id = id || "";
  f.innerHTML = `<h2>${id ? "Edit" : "Add"} ${e.single}</h2>${e.fields.map(fl => {
    const v = rec[fl.n] ?? (fl.def ? fl.def() : "");
    if (fl.sel) return `<label>${fl.l}<select name="${fl.n}">${fl.sel().map(([val, t]) => `<option value="${esc(val)}" ${String(v) === String(val) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select><small class="err" data-for="${fl.n}"></small></label>`;
    if (fl.area) return `<label>${fl.l}<textarea name="${fl.n}" rows="4">${esc(v)}</textarea><small class="err" data-for="${fl.n}"></small></label>`;
    return `<label>${fl.l}<input name="${fl.n}" type="${fl.t || "text"}" value="${esc(v)}" ${fl.min !== undefined ? `min="${fl.min}"` : ""} ${fl.max !== undefined ? `max="${fl.max}"` : ""} ${fl.step ? `step="${fl.step}"` : ""}><small class="err" data-for="${fl.n}"></small></label>`;
  }).join("")}<div class="row end"><button class="btn ghost" type="button" id="modalCancel">Cancel</button><button class="btn" type="submit">${id ? "Save changes" : "Add " + e.single}</button></div>`;
  m.showModal();
}
function submitForm(f) {
  const key = f.dataset.key, e = ENT[key], d = Object.fromEntries(new FormData(f)), errs = {};
  e.fields.forEach(fl => {
    const v = (d[fl.n] ?? "").toString().trim();
    if (fl.req && !v) errs[fl.n] = "Required.";
    else if (fl.t === "email" && v && !EMAIL.test(v)) errs[fl.n] = "Enter a valid email.";
    else if (fl.t === "number" && v) { const n = +v; if (isNaN(n) || (fl.min !== undefined && n < fl.min) || (fl.max !== undefined && n > fl.max)) errs[fl.n] = `Enter a number${fl.min !== undefined ? " ≥ " + fl.min : ""}${fl.max !== undefined ? " ≤ " + fl.max : ""}.`; }
    else if (fl.t === "tel" && v && !/^\+?[0-9 ()-]{7,18}$/.test(v)) errs[fl.n] = "Enter a valid phone number.";
  });
  if (key === "members" && !errs.email && db.members.some(m => m.email.toLowerCase() === d.email.toLowerCase() && m.id !== f.dataset.id)) errs.email = "A member with this email already exists.";
  $$(".err", f).forEach(s => s.textContent = errs[s.dataset.for] || "");
  if (Object.keys(errs).length) { f.elements[Object.keys(errs)[0]]?.focus(); return; }
  e.fields.forEach(fl => { if (fl.t === "number") d[fl.n] = +d[fl.n]; else if (typeof d[fl.n] === "string") d[fl.n] = d[fl.n].trim(); });
  if (f.dataset.id) { Object.assign(byId(key, f.dataset.id), d); log(`Updated ${e.single}: ${d.name || memberName(d.memberId)}`); toast(e.single + " updated"); }
  else { const rec = { id: uid(), ...d }; db[key].push(rec); log(`New ${e.single}: ${d.name || memberName(d.memberId)}`); toast(e.single + " added"); }
  save(); $("#modal").close(); render();
}

// ---------- router & events ----------
const PROTECTED = ["dashboard", "members", "trainers", "plans", "attendance", "workouts", "payments", "profile", "settings"];
function applySettings() { document.documentElement.classList.toggle("dark", !!ls.get("ip_settings", {}).dark); }
function render() {
  const [name = ""] = location.hash.slice(2).split("#")[0].split("/");
  if (PROTECTED.includes(name) && !me()) { location.hash = "#/login"; return; }
  if (["login", "signup", "forgot"].includes(name) && me()) { location.hash = "#/dashboard"; return; }
  $("#app").innerHTML = (views[name || "landing"] || views.landing)();
  const anchor = location.hash.split("#")[2]; if (anchor) setTimeout(() => $("#" + anchor)?.scrollIntoView({ behavior: "smooth" }), 30); else window.scrollTo(0, 0);
}
const fail = (form, errs) => { $$(".err", form).forEach(s => s.textContent = errs[s.dataset.for] || ""); const k = Object.keys(errs)[0]; if (k) form.elements[k]?.focus(); return !!k; };
async function resizeImage(file) { const img = new Image(); img.src = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); }); await img.decode(); const k = Math.min(1, 200 / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", .85); }

document.addEventListener("submit", async e => {
  const f = e.target; if (f.id === "modalForm") { e.preventDefault(); return submitForm(f); }
  if (!f.id.endsWith("Form")) return; e.preventDefault(); const d = Object.fromEntries(new FormData(f));
  if (f.id === "loginForm") {
    const errs = {}; if (!EMAIL.test(d.email || "")) errs.email = "Enter a valid email."; if (!d.password) errs.password = "Enter your password."; if (fail(f, errs)) return;
    const u = users().find(x => x.email === d.email.toLowerCase());
    if (!u || await sha(d.password, u.salt) !== u.hash) return void fail(f, { password: "Incorrect email or password." });
    ls.set("ip_session", u.id); location.hash = "#/dashboard";
  } else if (f.id === "signupForm") {
    const errs = {}; if (!d.name?.trim()) errs.name = "Enter your name."; if (!EMAIL.test(d.email || "")) errs.email = "Enter a valid email."; else if (users().some(u => u.email === d.email.toLowerCase())) errs.email = "Email already registered."; if ((d.password || "").length < 8) errs.password = "Use at least 8 characters.";
    if (fail(f, errs)) return; const salt = uid(), u = { id: uid(), name: d.name.trim(), email: d.email.toLowerCase(), salt, hash: await sha(d.password, salt), photo: "" };
    ls.set("ip_users", [...users(), u]); ls.set("ip_session", u.id); location.hash = "#/dashboard";
  } else if (f.id === "forgotForm") { if (fail(f, EMAIL.test(d.email || "") ? {} : { email: "Enter a valid email." })) return; toast("If the email exists, a reset link was sent (demo)."); location.hash = "#/login"; }
  else if (f.id === "contactForm") { const errs = {}; if (!d.name?.trim()) errs.name = "Enter your name."; if (!EMAIL.test(d.email || "")) errs.email = "Enter a valid email."; if ((d.message || "").trim().length < 10) errs.message = "At least 10 characters."; if (fail(f, errs)) return; f.reset(); toast("Message sent. Thank you!"); }
  else if (f.id === "profileForm") { const errs = {}; if (!d.name?.trim()) errs.name = "Enter your name."; if (!EMAIL.test(d.email || "")) errs.email = "Enter a valid email."; if (fail(f, errs)) return; const p = { name: d.name.trim(), email: d.email.toLowerCase() }; if (d.photo?.size) p.photo = await resizeImage(d.photo); patchMe(p); toast("Profile saved"); render(); }
  else if (f.id === "pwForm") { const u = me(); if (await sha(d.old || "", u.salt) !== u.hash) return void fail(f, { pw: "Current password is incorrect." }); if ((d.pw || "").length < 8) return void fail(f, { pw: "Use at least 8 characters." }); const salt = uid(); patchMe({ salt, hash: await sha(d.pw, salt) }); f.reset(); fail(f, {}); toast("Password updated"); }
  else if (f.id === "gymForm") { if (!d.name?.trim()) return void fail(f, { name: "Required." }); db.gym = { name: d.name.trim(), address: d.address, phone: d.phone, hours: d.hours }; save(); toast("Gym information saved"); }
});
document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "crudSearch") { const key = location.hash.slice(2); ls.set("q_" + key, t.value); const k = key; const fl = ls.get("f_" + k, {}); const rows = db[k].filter(r => ENT[k].search(r).toLowerCase().includes(t.value.toLowerCase()) && Object.entries(fl).every(([a, v]) => !v || r[a] === v)); $("#crudBody").innerHTML = crudRows(k, rows); $("#crudCount").textContent = `${rows.length} of ${db[k].length} shown`; }
  if (t.id === "attSearch") { ls.set("att_q", t.value); render(); const n = $("#attSearch"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
});
document.addEventListener("change", async e => {
  const t = e.target;
  if (t.dataset.filter) { const k = location.hash.slice(2), fl = ls.get("f_" + k, {}); fl[t.dataset.filter] = t.value; ls.set("f_" + k, fl); render(); }
  else if (t.id === "attDate") { ls.set("att_date", t.value || today()); render(); }
  else if (t.id === "attMember") { ls.set("att_m", t.value); render(); }
  else if (t.id === "attHistDate") { ls.set("att_hist_date", t.value); render(); }
  else if (t.dataset.att) { const date = ls.get("att_date", today()); if (t.checked) { if (!db.attendance.some(a => a.memberId === t.dataset.att && a.date === date)) { db.attendance.push({ id: uid(), memberId: t.dataset.att, date }); log(`${memberName(t.dataset.att)} checked in (${date})`); } } else db.attendance = db.attendance.filter(a => !(a.memberId === t.dataset.att && a.date === date)); save(); render(); }
  else if (t.dataset.setting) { const s = ls.get("ip_settings", {}); s[t.dataset.setting] = t.checked; ls.set("ip_settings", s); applySettings(); }
});
document.addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.id === "logout") { ls.set("ip_session", null); location.hash = "#/"; }
  else if (t.id === "burger") { const o = $("#nav").classList.toggle("open"); t.setAttribute("aria-expanded", o); }
  else if (t.id === "sideToggle") $("#side").classList.toggle("open");
  else if (t.dataset.new) openForm(t.dataset.new);
  else if (t.dataset.edit) openForm(...t.dataset.edit.split(":"));
  else if (t.dataset.delete) { const [k, id] = t.dataset.delete.split(":"); if (confirm(`Delete this ${ENT[k].single}? This cannot be undone.`)) { if (k === "members") { db.attendance = db.attendance.filter(a => a.memberId !== id); db.payments = db.payments.filter(p => p.memberId !== id); db.workouts.forEach(w => { if (w.memberId === id) w.memberId = ""; }); } if (k === "trainers") db.members.forEach(m => { if (m.trainerId === id) m.trainerId = ""; }); if (k === "plans" && db.members.some(m => m.planId === id)) return toast("Plan is in use by members - set it to Inactive instead"); db[k] = db[k].filter(x => x.id !== id); log(`Deleted ${ENT[k].single}`); save(); toast("Deleted"); render(); } }
  else if (t.id === "modalCancel") $("#modal").close();
  else if (t.dataset.renew) { const m = byId("members", t.dataset.renew), p = byId("plans", m.planId); db.payments.push({ id: uid(), memberId: m.id, planId: p.id, amount: p.price, date: today(), status: "Paid" }); m.joined = today(); m.status = "Active"; log(`${m.name} renewed ${p.name}`); save(); toast("Membership renewed"); render(); }
  else if (t.dataset.markpaid) { byId("payments", t.dataset.markpaid).status = "Paid"; log("Payment marked as paid"); save(); render(); }
  else if (t.dataset.invoice) { const p = byId("payments", t.dataset.invoice), f = $("#modalForm"); f.dataset.key = ""; f.innerHTML = `<div class="invoice"><h2>Invoice #${p.id.toUpperCase()}</h2><p class="muted">${esc(db.gym.name)} · ${esc(db.gym.address)}</p><hr><p><b>Billed to:</b> ${esc(memberName(p.memberId))}</p><p><b>Date:</b> ${esc(p.date)}</p><table><tr><td>${esc(planName(p.planId))} membership</td><td class="r">${money(p.amount)}</td></tr><tr><td><b>Total</b></td><td class="r"><b>${money(p.amount)}</b></td></tr></table><p>Status: ${badge(p.status)}</p></div><div class="row end"><button class="btn ghost" type="button" id="modalCancel">Close</button><button class="btn" type="button" onclick="window.print()">Print</button></div>`; $("#modal").showModal(); }
  else if (t.id === "resetDemo") { if (confirm("Reset all gym data to the demo set?")) { db = seed(); save(); toast("Demo data restored"); render(); } }
});
window.addEventListener("hashchange", render);
ensureDemo().then(() => { applySettings(); render(); });
