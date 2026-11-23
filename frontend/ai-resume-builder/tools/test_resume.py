import sys, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1]).resolve(); shots = root / "screenshots"; shots.mkdir(exist_ok=True)
U = f"file://{root}/index.html"; errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1366, "height": 800}); pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.on("dialog", lambda d: d.accept())
    pg.goto(U); pg.wait_for_selector(".hero"); pg.screenshot(path=str(shots / "01-landing.png"))
    pg.goto(U + "#/dashboard"); pg.wait_for_selector("#signupForm, #loginForm"); assert "#/login" in pg.url, "protected route redirects"
    pg.goto(U + "#/signup"); pg.click("#signupForm button[type=submit]"); assert "Enter your name" in pg.inner_text("#signupForm")
    pg.fill("[name=name]", "Ajvi Dylgjeri"); pg.fill("[name=email]", "ajvi@example.com"); pg.fill("[name=password]", "short"); pg.click("#signupForm button[type=submit]"); assert "at least 8" in pg.inner_text("#signupForm")
    pg.fill("[name=password]", "Secret123!"); pg.click("#signupForm button[type=submit]"); pg.wait_for_selector("#newResume"); pg.screenshot(path=str(shots / "02-dashboard-empty.png"))
    pg.click("#newResume"); pg.wait_for_selector(".builder .resume")
    assert pg.input_value("[data-path='personal.name']") == "Ajvi Dylgjeri"
    pg.fill("[data-path='personal.title']", "Frontend Developer"); assert "Frontend Developer" in pg.inner_text("#paper .r-title")      # live preview
    pg.fill("[data-path='personal.phone']", "+355 69 123 4567")
    pg.click("[data-add='education']"); pg.fill("[data-path='education.0.degree']", "BSc Software Engineering"); pg.fill("[data-path='education.0.school']", "UNYT"); assert "UNYT" in pg.inner_text("#paper")
    pg.click("[data-add='experience']"); pg.fill("[data-path='experience.0.company']", "Sqrock IT Solutions"); pg.fill("[data-path='experience.0.position']", "Intern"); assert "Sqrock IT Solutions" in pg.inner_text("#paper")
    pg.click("[data-add='projects']"); pg.fill("[data-path='projects.0.title']", "Food Delivery App"); pg.fill("[data-path='projects.0.tech']", "HTML, CSS, JS"); pg.click("[data-aiproj='0']"); assert "Designed and built Food Delivery App" in pg.inner_text("#paper")
    pg.fill("#skillIn", "HTML"); pg.keyboard.press("Enter"); pg.fill("#skillIn", "html"); pg.keyboard.press("Enter")
    assert pg.locator("#skillChips .chip").count() == 1, "duplicate skills ignored"
    assert pg.locator("#skillSuggest .sug").count() > 0; pg.click("#skillSuggest .sug >> nth=0"); assert pg.locator("#skillChips .chip").count() == 2
    pg.click("#aiSummary"); assert "Frontend Developer" in pg.input_value("[data-path='summary']")
    pg.click("[data-add='languages']"); pg.fill("[data-path='languages.0.name']", "English"); pg.select_option("[data-path='languages.0.level']", "Fluent"); assert "Fluent" in pg.inner_text("#paper")
    pg.fill("[data-path='personal.name']", "<img src=x onerror=alert(1)>"); assert pg.locator("#paper img[src=x]").count() == 0, "XSS escaped"; pg.fill("[data-path='personal.name']", "Ajvi Dylgjeri")
    pg.select_option("#tplSelect", "classic"); assert pg.locator("#paper .t-classic").count() == 1
    pg.select_option("#tplSelect", "modern"); pg.fill("[data-path='title']", "My Frontend Resume"); pg.wait_for_timeout(600)
    pg.screenshot(path=str(shots / "03-builder.png"))
    pg.reload(); pg.wait_for_selector(".builder .resume"); assert "Sqrock IT Solutions" in pg.inner_text("#paper"), "autosave persisted"
    pg.goto(U + "#/dashboard"); pg.wait_for_selector(".rcard"); assert pg.locator(".rcard").count() == 1
    pg.click("[data-dup]"); assert pg.locator(".rcard").count() == 2; pg.fill("#resumeSearch", "copy"); assert pg.locator(".rcard").count() == 1
    pg.fill("#resumeSearch", ""); pg.screenshot(path=str(shots / "04-dashboard.png"))
    pg.click("[data-del] >> nth=0"); pg.wait_for_function("document.querySelectorAll('.rcard').length===1")
    pg.goto(U + "#/settings"); pg.check("[data-setting=dark]"); assert pg.evaluate("document.documentElement.classList.contains('dark')"); pg.screenshot(path=str(shots / "05-settings-dark.png")); pg.uncheck("[data-setting=dark]")
    pg.goto(U + "#/profile"); pg.fill("#profileForm [name=name]", "Ajvi D."); pg.click("#profileForm button[type=submit]"); pg.wait_for_timeout(300)
    pg.fill("#pwForm [name=old]", "wrong"); pg.fill("#pwForm [name=pw]", "NewSecret123"); pg.click("#pwForm button[type=submit]"); assert "incorrect" in pg.inner_text("#pwForm")
    pg.click("#logout"); pg.goto(U + "#/login"); pg.fill("[name=email]", "ajvi@example.com"); pg.fill("[name=password]", "wrong"); pg.click("#loginForm button[type=submit]"); assert "Incorrect" in pg.inner_text("#loginForm")
    pg.fill("[name=password]", "Secret123!"); pg.click("#loginForm button[type=submit]"); pg.wait_for_selector("#newResume")
    m = b.new_page(viewport={"width": 390, "height": 800}); m.goto(U); m.wait_for_selector(".hero"); assert m.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "mobile h-scroll"; m.screenshot(path=str(shots / "06-mobile.png"))
    pg.goto(U + "#/dashboard"); pg.click("[data-open]"); pg.wait_for_selector("#paper .resume"); pg.pdf(path=str(shots / "resume-print-test.pdf"), format="A4", print_background=True)
    b.close()
assert not errs, errs
print("ALL RESUME BUILDER CHECKS PASSED")
