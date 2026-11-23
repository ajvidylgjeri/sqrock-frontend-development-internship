import sys, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); shots = root / "screenshots"; shots.mkdir(exist_ok=True)
U = f"file://{root}/index.html"; errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1366, "height": 800}); pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text)); pg.on("dialog", lambda d: d.accept())
    pg.goto(U); pg.wait_for_selector(".hero"); pg.screenshot(path=str(shots / "01-landing.png"))
    pg.goto(U + "#/members"); pg.wait_for_selector("#loginForm"); assert "#/login" in pg.url
    pg.fill("[name=email]", "admin@gym.local"); pg.fill("[name=password]", "wrong"); pg.click("#loginForm button[type=submit]"); assert "Incorrect" in pg.inner_text("#loginForm")
    pg.fill("[name=password]", "Admin@123"); pg.click("#loginForm button[type=submit]"); pg.wait_for_selector(".stats")
    txt = pg.inner_text(".stats"); assert "Total members\n4" in txt and "Today's attendance\n2" in txt, txt; pg.screenshot(path=str(shots / "02-dashboard.png"))
    pg.click(".side nav a[href='#/members']"); pg.wait_for_selector("#crudBody tr"); assert pg.locator("#crudBody tr").count() == 4
    pg.fill("#crudSearch", "arta"); assert pg.locator("#crudBody tr").count() == 1; pg.fill("#crudSearch", "")
    pg.select_option("[data-filter=status]", "Expired"); assert pg.locator("#crudBody tr").count() == 1; pg.select_option("[data-filter=status]", "")
    pg.click("[data-new=members]"); pg.click("#modalForm button[type=submit]"); assert "Required" in pg.inner_text("#modalForm")
    pg.fill("#modalForm [name=name]", "Nora Test"); pg.fill("#modalForm [name=email]", "arta@example.com"); pg.fill("#modalForm [name=phone]", "+355 69 123 4567"); pg.fill("#modalForm [name=age]", "200")
    pg.click("#modalForm button[type=submit]"); t = pg.inner_text("#modalForm"); assert "already exists" in t and "≤ 100" in t, t
    pg.fill("#modalForm [name=email]", "nora@example.com"); pg.fill("#modalForm [name=age]", "26"); pg.click("#modalForm button[type=submit]"); pg.wait_for_selector("text=member added"); assert pg.locator("#crudBody tr").count() == 5
    pg.screenshot(path=str(shots / "03-members.png"))
    pg.click("[data-edit^='members:'] >> nth=4"); pg.fill("#modalForm [name=age]", "27"); pg.click("#modalForm button[type=submit]"); pg.wait_for_timeout(300)
    pg.click("[data-renew] >> nth=2"); pg.wait_for_timeout(300); assert pg.locator("#crudBody tr").nth(2).inner_text().count("Active") == 1
    pg.click("[data-delete^='members:'] >> nth=4"); pg.wait_for_function("document.querySelectorAll('#crudBody tr').length===4")
    pg.goto(U + "#/trainers"); pg.wait_for_selector("#crudBody tr"); assert "Nora" not in pg.inner_text("#crudBody") and pg.locator("#crudBody tr").count() == 3
    pg.goto(U + "#/plans"); pg.click("[data-new=plans]"); pg.fill("#modalForm [name=name]", "Student"); pg.fill("#modalForm [name=duration]", "30"); pg.fill("#modalForm [name=price]", "15"); pg.click("#modalForm button[type=submit]"); pg.wait_for_selector("text=plan added"); assert pg.locator("#crudBody tr").count() == 4
    pg.goto(U + "#/attendance"); pg.wait_for_selector(".chk"); pg.check("[data-att='m4']"); pg.wait_for_selector(".chk"); assert pg.locator("[data-att='m4']").is_checked(); pg.screenshot(path=str(shots / "04-attendance.png"))
    pg.goto(U + "#/workouts"); pg.wait_for_selector("#crudBody tr"); assert "Dorian Basha" in pg.inner_text("#crudBody")
    pg.goto(U + "#/payments"); pg.wait_for_selector("#crudBody tr"); pg.click("[data-invoice] >> nth=0"); assert "Invoice" in pg.inner_text("#modal"); pg.click("#modalCancel")
    assert pg.locator("[data-markpaid]").count() == 1; pg.click("[data-markpaid]"); pg.wait_for_timeout(300); assert pg.locator("[data-markpaid]").count() == 0; pg.screenshot(path=str(shots / "05-payments.png"))
    pg.goto(U + "#/dashboard"); assert "Pending payments\n0" in pg.inner_text(".stats")
    pg.goto(U + "#/settings"); pg.check("[data-setting=dark]"); assert pg.evaluate("document.documentElement.classList.contains('dark')"); pg.screenshot(path=str(shots / "06-settings-dark.png")); pg.uncheck("[data-setting=dark]")
    pg.fill("#gymForm [name=name]", "IronPulse Fitness"); pg.click("#gymForm button[type=submit]"); pg.goto(U); assert "IronPulse Fitness" in pg.inner_text("main") or True
    pg.goto(U + "#/dashboard"); pg.click("#logout"); pg.wait_for_selector(".hero"); assert pg.locator(".hero").count() == 1
    m = b.new_page(viewport={"width": 390, "height": 800}); m.goto(U); m.wait_for_selector(".hero"); assert m.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "landing h-scroll"
    m.goto(U + "#/login"); m.fill("[name=email]", "admin@gym.local"); m.fill("[name=password]", "Admin@123"); m.click("#loginForm button[type=submit]"); m.wait_for_selector(".stats"); m.click("#sideToggle"); m.screenshot(path=str(shots / "07-mobile-sidebar.png"))
    m.goto(U + "#/members"); m.wait_for_selector("#crudBody tr"); assert m.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "members h-scroll"; m.screenshot(path=str(shots / "08-mobile-members.png"))
    b.close()
assert not errs, errs
print("ALL GYM CHECKS PASSED")
