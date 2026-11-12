// Verifies the gallery in a real browser against the static export, served in-process (no server process).
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { extname, join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "out");
const shots = join(here, ".shots"); mkdirSync(shots, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const BASE = "http://gallery.test";

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route(`${BASE}/**`, (route) => {
  const u = new URL(route.request().url());
  let p = decodeURIComponent(u.pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = join(out, p);
  if (!file.startsWith(out) || !existsSync(file)) return route.fulfill({ status: 404, body: "not found" });
  route.fulfill({ status: 200, contentType: types[extname(file)] ?? "application/octet-stream", body: readFileSync(file) });
});
const page = await ctx.newPage();
const go = async (path) => { const r = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" }); await page.waitForTimeout(250); return r; };
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
let bad = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { bad++; console.log("  FAIL " + msg); } };
const css = async (loc, prop) => { await loc.page().waitForTimeout(260); return loc.evaluate((e, p) => getComputedStyle(e)[p], prop); }; // fills fade for 150 ms

// 1. home lists the registry with live previews
await page.goto(`${BASE}/`);
ok(/master library/i.test(await page.locator(".flow").innerText()) && /brand ui kit/i.test(await page.locator(".flow").innerText()) && /brand design system/i.test(await page.locator(".flow").innerText()), "Overview explains Master Library, Brand UI Kit and Brand Design System");
ok((await page.locator(".steps li").count()) === 4, "Overview shows the 4-step workflow");
await page.goto(`${BASE}/components/`);
await page.waitForSelector(".card");
ok((await page.locator(".card").count()) === 57, "the components page shows 57 component cards");
ok(await page.locator(".card").evaluateAll((cs) => cs.every((c) => c.querySelector(".stage-mini")?.children.length > 0)), "each card renders the real component");
ok(/CTA-001/.test(await page.locator(".card", { hasText: "CTA-001" }).first().innerText()) && !/class [ABC]|token-only|conformance/.test(await page.locator(".card").first().innerText()), "card shows the id and no engineering badges");
await page.screenshot({ path: join(shots, "home.png") });

// 2. navigate via Link, then customise
await page.locator(".card", { hasText: "CTA-001" }).first().click();
await page.waitForURL(/\/components\/CTA-001\/?$/);
await page.waitForSelector(".stages");
const custom = page.locator(".stages .stage").nth(0).locator("button");
const original = page.locator(".stages .stage").nth(1).locator("button");
ok((await css(custom, "backgroundColor")) === "rgb(31, 79, 216)", `finova default = blue (${await css(custom, "backgroundColor")})`);
ok((await css(custom, "borderTopLeftRadius")) === "0px", "finova default = sharp");
ok((await css(original, "backgroundColor")) === "rgb(245, 197, 24)", "original stays yellow");
ok((await css(original, "borderTopLeftRadius")) === "9999px", "original stays pill");

await page.selectOption("#brand", "master-yellow");
ok((await css(custom, "backgroundColor")) === "rgb(245, 197, 24)", "switching brand switches colour");
ok((await css(custom, "color")) === "rgb(17, 17, 17)", "on-accent label is dark on yellow");
await page.selectOption("#radius", "0px");
ok((await css(custom, "borderTopLeftRadius")) === "0px", "radius override applies");
ok((await css(original, "borderTopLeftRadius")) === "9999px", "original unaffected by customising");
await page.selectOption("#mode", "dark");
const stageBg = await css(page.locator(".stages .stage").nth(0), "backgroundColor");
ok(stageBg !== "rgb(255, 255, 255)" && stageBg !== "rgba(0, 0, 0, 0)", `dark mode changes the stage (${stageBg})`);
await page.fill("#label", "Book a demo");
ok((await custom.innerText()).trim() === "Book a demo", "label is editable");
await page.screenshot({ path: join(shots, "detail.png") });

// 3. real interaction in the page
await custom.hover(); await page.waitForTimeout(60);
ok((await custom.evaluate((e) => e.getAnimations({ subtree: true }).length)) >= 1, "shimmer runs on hover in the gallery");

// 3b. skins and loading are real, not cosmetic
await go("/components/CTA-003/");
await page.waitForSelector(".stages");
const c3 = page.locator(".stages .stage").nth(0).locator("button");
await page.selectOption("#brand", "finova");
await page.selectOption("#skin", "outline-invert");
ok((await css(c3, "backgroundColor")) === "rgba(0, 0, 0, 0)", `outline skin has a transparent fill (${await css(c3, "backgroundColor")})`);
ok((await css(c3, "borderTopWidth")) === "2px", "outline skin shows its border");
await c3.hover();
ok((await css(c3, "backgroundColor")) === "rgb(31, 79, 216)", `outline-invert fills with the accent on hover (${await css(c3, "backgroundColor")})`);
await page.mouse.move(0, 0);
await page.check("#loading");
ok((await c3.getAttribute("aria-disabled")) === "true" && (await c3.getAttribute("disabled")) === null, "loading uses aria-disabled, not disabled");
await c3.focus();
ok(await c3.evaluate((e) => document.activeElement === e), "a loading button can still take focus");
await page.uncheck("#loading");
await go("/components/CTA-005/");
await page.waitForSelector(".stages");
const c5 = page.locator(".stages .stage").nth(0).locator("button");
await page.selectOption("#radius", "9999px");
ok((await css(c5, "borderTopLeftRadius")) === "9999px", "orbit border follows the radius override");

// 3c. wave 2: each new component renders and its skin/loading controls work
for (const [id, skin] of [["CTA-006", "surface-glow"], ["CTA-007", "outline-tint"], ["CTA-008", "outline"], ["CTA-009", "surface-gradient"], ["CTA-012", "neutral"], ["CTA-013", "surface-ink"]]) {
  await go(`/components/${id}/`);
  const el = page.locator(".stages .stage").nth(0).locator("button");
  ok((await el.count()) === 1, `${id} renders a button in the customised stage`);
  await page.selectOption("#skin", skin);
  ok((await el.getAttribute("data-skin")) === skin, `${id} applies skin ${skin}`);
  await page.check("#loading");
  ok((await el.getAttribute("aria-disabled")) === "true" && (await el.getAttribute("disabled")) === null, `${id} loading keeps the button enabled for focus`);
  await page.uncheck("#loading");
}

// 3d. wave 3: pointer tracking is real, and the status morph is controlled and announced
await go("/components/CTA-010/");
const spot = page.locator(".stages .stage").nth(0).locator("button");
await spot.hover({ position: { x: 24, y: 10 } });
await page.waitForTimeout(80);
ok((await spot.evaluate((e) => e.style.getPropertyValue("--_mx"))) !== "", "spotlight follows the pointer in the gallery");
await page.mouse.move(0, 0);
ok((await spot.evaluate((e) => e.style.getPropertyValue("--_mx"))) === "", "spotlight clears when the pointer leaves");
await go("/components/CTA-014/");
const morph = page.locator(".stages .stage").nth(0).locator("button");
await page.selectOption("#p-status", "success");
ok((await morph.getAttribute("data-status")) === "success" && (await morph.getAttribute("aria-disabled")) === "true", "success state is inert");
ok(((await page.locator(".stages .stage").nth(0).locator('[role="status"]').innerText()) || "").trim() !== "", "success is announced");
await page.selectOption("#p-status", "error");
ok((await morph.getAttribute("data-status")) === "error" && (await morph.getAttribute("aria-disabled")) === null, "error state allows a retry");

// 3e. wave A: each new archetype renders its real structure and controls work
for (const [id, sel, skin] of [["CRD-002", "article", "filled"], ["CRD-003", "article", "filled"], ["CRD-004", "article", "filled"], ["INP-001", "input", "filled"], ["FRM-001", "ul", "sunken"], ["ACC-002", "details", "boxed"], ["NAV-001", "a[href]", "neutral"], ["NAV-002", "a[href]", "neutral"]]) {
  await go(`/components/${id}/`);
  const stage = page.locator(".stages .stage").nth(0);
  ok((await stage.locator(sel).count()) >= 1, `${id} renders its ${sel} in the customised stage`);
  await page.selectOption("#skin", skin);
  ok((await stage.locator("[data-skin]").first().getAttribute("data-skin")) === skin, `${id} applies skin ${skin}`);
}
await go("/components/INP-001/");
ok((await page.locator(".stages .stage").nth(0).locator("label").count()) === 1, "the text field renders a visible label");
await go("/components/CRD-004/");
ok((await page.locator(".stages .stage").nth(0).locator("a[href]").count()) === 1, "the card has exactly one primary link");
await go("/components/ACC-002/");
const sum = page.locator(".stages .stage").nth(0).locator("summary").first();
await sum.click(); await page.waitForTimeout(100);
ok(await page.locator(".stages .stage").nth(0).locator("details").first().evaluate((d) => d.open), "clicking a summary opens its panel");

// 3f. wave B: real behaviour in the gallery (headless adapter, portals stay inside the brand scope)
const cstage = () => page.locator(".stages .stage").nth(0);
await go("/components/TAB-001/"); await page.selectOption("#skin", "contained");
ok((await cstage().locator("[data-skin]").first().getAttribute("data-skin")) === "contained", "TAB-001 applies skin contained");
await cstage().locator('[role="tab"]').nth(1).click(); await page.waitForTimeout(60);
ok((await cstage().locator('[role="tab"]').nth(1).getAttribute("aria-selected")) === "true" && (await cstage().locator('[role="tabpanel"]:visible').count()) === 1, "TAB-001 selects a tab and shows exactly one panel");
await go("/components/ACC-001/"); await page.selectOption("#skin", "boxed");
await cstage().locator("button[aria-expanded]").first().click(); await page.waitForTimeout(400);
ok((await cstage().locator("button[aria-expanded]").first().getAttribute("aria-expanded")) === "true" && (await cstage().locator('[role="region"]').count()) >= 1, "ACC-001 opens a panel");
await go("/components/NAV-003/"); await page.selectOption("#skin", "flat");
await cstage().locator("button[aria-expanded]").click(); await page.waitForTimeout(250);
ok(await cstage().locator("ul").first().isVisible(), "NAV-003 reveals its links on click");
await page.keyboard.press("Escape"); await page.waitForTimeout(120);
ok(!(await cstage().locator("ul").first().isVisible()), "NAV-003 closes on Escape");
await go("/components/DLG-001/"); await page.selectOption("#skin", "outlined");
await cstage().locator(".ds-dlg-001__trigger").click(); await page.waitForSelector('[role="dialog"]'); await page.waitForTimeout(300);
const dlg = cstage().locator('[role="dialog"]');
ok((await dlg.count()) === 1, "DLG-001 portals INTO the brand scope (not <body>)");
ok((await dlg.getAttribute("data-skin")) === "outlined", "DLG-001 applies skin outlined");
ok((await dlg.evaluate((e) => getComputedStyle(e).getPropertyValue("--ds-dlg-bg").trim())) !== "" && (await dlg.evaluate((e) => getComputedStyle(e).backgroundColor)) !== "rgba(0, 0, 0, 0)", "DLG-001 renders with its tokens");
await page.keyboard.press("Escape"); await page.waitForSelector('[role="dialog"]', { state: "detached" });
ok(await cstage().locator(".ds-dlg-001__trigger").evaluate((e) => document.activeElement === e), "DLG-001 returns focus to its trigger");
await go("/components/DLG-003/"); await page.selectOption("#skin", "flat");
await cstage().locator(".ds-dlg-003__trigger").click(); await page.waitForSelector('[role="menu"]'); await page.waitForTimeout(200);
ok((await cstage().locator('[role="menu"]').count()) === 1 && (await cstage().locator('[role="menuitem"]').count()) >= 3, "DLG-003 opens a menu inside the brand scope");
await page.keyboard.press("ArrowDown"); await page.waitForTimeout(60);
ok(await page.evaluate(() => !!document.activeElement?.hasAttribute("data-highlighted")), "DLG-003 highlights the item that has focus");
await page.keyboard.press("Escape"); await page.waitForSelector('[role="menu"]', { state: "detached" });

// 3g. wave C: page-level components render their real structure in the gallery
await go("/components/NAV-008/"); await page.selectOption("#skin", "inverse");
ok((await cstage().locator("a[href^='#']").count()) === 1 && (await cstage().locator("[data-skin]").first().getAttribute("data-skin")) === "inverse", "NAV-008 renders a skip link and applies skin inverse");
await go("/components/NAV-009/"); await page.selectOption("#skin", "neutral");
ok((await cstage().locator("nav[aria-label] ol > li").count()) >= 3 && (await cstage().locator('[aria-current="page"]').count()) === 1, "NAV-009 renders a labelled trail with one current page");
await go("/components/NAV-006/"); await page.selectOption("#skin", "lifted");
ok((await cstage().locator("header nav a").count()) >= 3, "NAV-006 renders a header with its nav");
await go("/components/NAV-007/"); await page.selectOption("#skin", "lifted");
ok((await cstage().locator("header nav a").count()) >= 3, "NAV-007 renders a header with its nav");
await go("/components/TST-001/"); await page.selectOption("#skin", "outlined");
ok((await cstage().locator('[role="status"]').count()) === 1 && (await cstage().locator('[role="alert"]').count()) === 1 && (await cstage().locator(".ds-tst-001__item").count()) >= 3, "TST-001 renders both live regions and its toasts");
await cstage().locator(".ds-tst-001__close").first().click(); await page.waitForTimeout(120);
ok((await cstage().locator(".ds-tst-001__item").count()) === 2, "dismissing a toast removes it");

// 3h. wave C rest: mega menu, drawer, popover and tooltip behave in the gallery
await go("/components/NAV-005/"); await page.selectOption("#skin", "flat");
await cstage().locator("button[aria-expanded]").first().click(); await page.waitForTimeout(250);
ok((await cstage().locator('[class*="__panel"]:visible').count()) === 1 && (await cstage().locator('[role="menu"]').count()) === 0, "NAV-005 opens one panel and uses no menu roles");
await page.keyboard.press("Escape"); await page.waitForTimeout(100);
ok((await cstage().locator('[class*="__panel"]:visible').count()) === 0, "NAV-005 closes on Escape");
await go("/components/NAV-004/"); await page.selectOption("#skin", "outlined");
await cstage().locator(".ds-nav-004__trigger").click(); await page.waitForSelector('[role="dialog"]'); await page.waitForTimeout(500);
ok((await cstage().locator('[role="dialog"] nav a').count()) >= 3 && (await cstage().locator('[role="dialog"]').getAttribute("data-skin")) === "outlined", "NAV-004 opens a drawer with its nav inside the brand scope");
await page.keyboard.press("Escape"); await page.waitForSelector('[role="dialog"]', { state: "detached" });
await go("/components/DLG-002/"); await page.selectOption("#skin", "flat");
await cstage().locator(".ds-dlg-002__trigger").click(); await page.waitForSelector('[role="dialog"]'); await page.waitForTimeout(250);
ok((await cstage().locator('[role="dialog"]').count()) === 1 && (await page.evaluate(() => !document.querySelector('[aria-hidden="true"]:not(svg)'))), "DLG-002 opens inside the brand scope and leaves the page live (non-modal)");
await page.keyboard.press("Escape"); await page.waitForSelector('[role="dialog"]', { state: "detached" });
await go("/components/TIP-001/"); await page.selectOption("#skin", "raised");
await cstage().locator(".ds-tip-001__trigger").focus(); await page.waitForTimeout(300);
ok((await cstage().locator('[role="tooltip"]').count()) >= 1, "TIP-001 shows its tooltip on keyboard focus");
await page.keyboard.press("Escape"); await page.waitForTimeout(150);
ok((await cstage().locator('[role="tooltip"]').count()) === 0, "TIP-001 dismisses on Escape");

// 3i. wave D: forms and data behave in the gallery
await go("/components/INP-003/"); await page.selectOption("#skin", "filled");
await cstage().locator("textarea").fill("hello"); await page.waitForTimeout(100);
ok(/115 characters remaining/.test(await cstage().locator('[class*="__count"]').innerText()), "INP-003 counts characters as you type");
await go("/components/INP-005/"); await page.selectOption("#skin", "filled");
ok((await cstage().locator("select option").count()) >= 3 && (await cstage().locator("label").count()) === 1, "INP-005 renders a labelled native select");
await go("/components/INP-004/"); await page.selectOption("#skin", "filled");
await cstage().locator('input[type="checkbox"]:not(:checked):not(:disabled)').first().check();
ok((await cstage().locator('input[type="checkbox"]:checked').count()) === 2 && (await cstage().locator("fieldset legend").count()) === 1, "INP-004 checks a native checkbox inside a fieldset");
await go("/components/INP-006/");
await cstage().locator('input[type="radio"]').nth(1).check();
ok((await cstage().locator('input[type="radio"]:checked').count()) === 1, "INP-006 selects exactly one radio");
await go("/components/INP-007/");
await cstage().locator('input[role="switch"]').check();
ok(await cstage().locator('input[role="switch"]').isChecked(), "INP-007 turns on");
await go("/components/CRD-005/"); await page.selectOption("#skin", "outlined");
ok((await cstage().locator("dl dt").count()) === 1 && (await cstage().locator("dl dd").count()) >= 2, "CRD-005 renders a labelled figure as a description list");
await go("/components/NAV-010/"); await page.selectOption("#skin", "ghost");
ok((await cstage().locator('nav a[aria-current="page"]').count()) === 1 && (await cstage().locator("nav a").count()) >= 5, "NAV-010 renders pages with one current");
await go("/components/TBL-001/"); await page.selectOption("#skin", "striped");
await cstage().locator(".ds-tbl-001__sort").nth(1).click(); await page.waitForTimeout(100);
ok((await cstage().locator('th[aria-sort="ascending"]').count()) === 1, "TBL-001 sorts a column and marks it with aria-sort");

// 3j. palettes and the foundations page
await go("/palettes/");
ok((await page.locator(".pal-item").count()) === 35, "the palettes page lists 35 palettes");
await page.getByRole("button", { name: /Ken Red/ }).click(); await page.waitForTimeout(500);
ok(/50\/50 contrast checks pass/.test(await page.locator(".pal-badges").innerText()), "a palette reports its contrast gate");
ok((await page.locator(".pal-live button").count()) >= 2, "the live preview renders real components in the chosen palette");
const accent = await page.locator(".pal-live").evaluate((e) => getComputedStyle(e).getPropertyValue("--ds-color-accent").trim());
ok(accent.toLowerCase() === "#b01f24", `choosing Ken Red loads its theme (accent ${accent})`);
await go("/system/");
ok((await page.locator("main h1").first().innerText()).includes("How the Master design system is built") && (await page.locator(".sys-table").count()) >= 2, "the foundations and atomic map page renders");
ok(/\d+\s+component token families/.test(await page.locator(".sys-grid").innerText()) && !/\bds \(/.test(await page.locator(".sys-grid").innerText()), "token families are counted per component family");
await go("/components/CTA-003/");
await page.selectOption("#brand", "p-violet"); await page.waitForTimeout(500);
ok((await page.locator(".stages .stage").nth(0).evaluate((e) => getComputedStyle(e).getPropertyValue("--ds-color-accent").trim())).toLowerCase() === "#7c3aed", "a palette can be chosen on a component page");

// 3k. designs: each of the six components shows all five designs side by side, and a design can be chosen
for (const id of ["CRD-004", "INP-001", "TAB-001", "NAV-006", "TBL-001", "DLG-001"]) {
  await go(`/components/${id}/`);
  ok((await page.locator(".designs .stage").count()) === 5, `${id} shows 5 designs side by side`);
  ok((await page.locator("#p-design option").count()) === 5, `${id} offers 5 designs in the picker`);
}
await go("/components/TAB-001/"); await page.selectOption("#p-design", "vertical");
ok((await page.locator(".stages .stage").nth(0).locator('[role="tablist"][aria-orientation="vertical"]').count()) === 1, "the vertical tabs design switches the tablist to vertical");
await go("/components/NAV-006/"); await page.selectOption("#p-design", "accent");
ok((await page.locator(".stages .stage").nth(0).locator('header[data-design="accent"]').count()) === 1, "the accent header design is applied");
await go("/components/DLG-001/");
await page.locator(".designs .stage").filter({ hasText: "sheet" }).first().locator(".ds-dlg-001__trigger").click(); await page.waitForSelector('[role="dialog"][data-design="sheet"]'); await page.waitForTimeout(300);
ok(await page.evaluate(() => { const r = document.querySelector('[role="dialog"]').getBoundingClientRect(); return Math.abs(r.bottom - innerHeight) <= 1 && r.width <= innerWidth; }), "the bottom-sheet dialog design is anchored to the bottom edge");
await page.keyboard.press("Escape"); await page.waitForSelector('[role="dialog"]', { state: "detached" });

// 3m. docs shell: contents on the left, foundations page, six new design sets
await go("/");
ok((await page.locator("nav.toc details.toc-sec").count()) === 6 && !/\bAtoms\b|\bMolecules\b|\bOrganisms\b/.test(await page.locator("nav.toc").innerText()), "the left contents has the six sections and no Atoms/Molecules/Organisms headings");
ok((await page.locator('nav.toc a[href="/palettes/"]').count()) === 1, "the contents links to Colour in Foundations");
await page.fill("#toc-q", "pagination"); await page.waitForTimeout(150);
ok((await page.locator("nav.toc li a").count()) === 1, "searching the contents filters to one entry");
await page.fill("#toc-q", "");
await go("/components/TAB-001/");
ok((await page.locator('nav.toc a[aria-current="page"]').count()) === 1, "the open component is highlighted in the contents");
await go("/foundations/");
ok((await page.locator(".found h2").count()) >= 4 && /type scale/i.test(await page.locator(".found").innerText()), "the Foundations page shows the type scale, spacing, radius and motion");
await page.selectOption("#f-brand", "lifestyle");
ok((await page.locator(".stage").evaluate((e) => e.getAttribute("data-brand"))) === "lifestyle", "the Foundations brand switch applies");
for (const id of ["INP-004", "INP-007", "ACC-001", "CRD-005", "NAV-010", "TST-001", "INP-006", "INP-005", "INP-003", "NAV-009", "ACC-002"]) {
  await go(`/components/${id}/`);
  ok((await page.locator(".designs .stage").count()) === 5 && (await page.locator("#p-design option").count()) === 5, `${id} shows 5 designs side by side`);
}

// 3n. discovery: search, filters, command palette, Interactions page
await go("/components/");
await page.waitForSelector(".card");
ok(/57 of 57/.test(await page.locator(".gal-count").innerText()), "the gallery starts with all 57 components");
await page.fill("#gal-q", "modal"); await page.waitForTimeout(150);
const modalCards = await page.locator(".card").count();
ok(modalCards >= 1 && modalCards < 10 && (await page.locator(".card b a", { hasText: "Modal Dialog" }).count()) === 1, `searching “modal” finds the dialog (${modalCards} cards)`);
ok(new URL(page.url()).searchParams.get("q") === "modal", "the search is kept in the URL");
await page.fill("#gal-q", "zzzzzz"); await page.waitForTimeout(150);
ok((await page.locator(".card").count()) === 0 && (await page.getByRole("button", { name: "Clear filters" }).count()) === 1, "an empty search shows a way back");
await page.fill("#gal-q", "");
await page.getByRole("button", { name: "Form controls" }).click(); await page.waitForTimeout(100);
const formCards = await page.locator(".card").count();
ok(formCards >= 7 && formCards < 20 && (await page.locator(".card", { hasText: "Switch" }).count()) === 1, `the Form controls filter narrows the gallery (${formCards})`);
await page.getByRole("button", { name: "Form controls" }).click();
await page.getByRole("button", { name: "Pointer-reactive" }).click(); await page.waitForTimeout(100);
ok((await page.locator(".card").count()) === 2 && (await page.locator(".card", { hasText: "Magnetic" }).count()) === 1, "the Pointer-reactive filter shows the two pointer CTAs");
await page.getByRole("button", { name: "Clear all" }).click(); await page.waitForTimeout(100);
ok((await page.locator(".card").count()) === 57, "Clear all restores every component");
await page.goto(`${BASE}/components/?kind=overlay%7Cscroll&variants=1`); await page.waitForSelector(".card"); await page.waitForTimeout(200);
const urlCards = await page.locator(".card").count();
ok(urlCards >= 1 && urlCards < 20 && (await page.getByRole("button", { name: "Overlays and layers" }).getAttribute("aria-pressed")) === "true", `filters can be opened from a shared link (${urlCards} cards)`);
await go("/");
await page.keyboard.press("Control+k"); await page.waitForSelector("#cmd-q", { state: "visible" });
await page.fill("#cmd-q", "modal"); await page.waitForTimeout(100);
ok((await page.locator('#cmd-list [role="option"]').count()) >= 1, "Ctrl+K opens the search and lists results");
await page.keyboard.press("Enter"); await page.waitForURL(/\/components\/DLG-001\/?$/);
ok(true, "Enter opens the first result (Modal Dialog)");
await go("/interactions/");
ok((await page.locator("section[id]").count()) === 7 && (await page.locator(".card").count()) >= 30, "the Interactions page groups components by behaviour");
ok((await page.locator("#pointer .card").count()) === 2 && (await page.locator("#overlay .card").count()) >= 5, "pointer and overlay behaviours list the right components");

// 3l. atoms render their real structure
await go("/components/ICN-001/");
ok((await cstage().locator("svg path").count()) === 1 && (await cstage().locator('svg[aria-hidden="true"]').count()) === 1, "ICN-001 draws a decorative icon");
await go("/components/BDG-001/"); await page.selectOption("#p-design", "solid");
ok((await cstage().locator('[data-design="solid"]').count()) === 1, "BDG-001 applies the solid design");
await go("/components/BDG-002/");
await cstage().locator("button[aria-pressed]").first().click();
ok((await cstage().locator('button[aria-pressed="true"]').count()) === 1, "BDG-002 toggles a chip");
await go("/components/AVT-001/");
ok((await cstage().locator('[role="img"][aria-label]').count()) === 1 && /AM/.test(await cstage().innerText()), "AVT-001 shows initials with an accessible name");
await go("/components/LDR-002/");
ok((await cstage().locator('[role="progressbar"][aria-valuenow="64"]').count()) === 1, "LDR-002 reports its value");
await go("/components/TXT-001/"); await page.selectOption("#p-design", "bar");
ok((await cstage().locator('h2[data-design="bar"]').count()) === 1, "TXT-001 renders a heading with the bar design");

// 4. Brand UI Kit: add on component pages, read it on the Brand Design Systems page
await go("/components/CTA-001/");
await page.waitForSelector(".stages");
await page.selectOption("#brand", "finova");
await page.click("text=Add to Kit");
await page.waitForFunction(() => /1 component\b/.test(document.querySelector(".ctx")?.textContent ?? ""));
ok(/Brand UI Kit · 1 component/.test(await page.locator(".ctx").innerText()), "the top bar counts the Brand UI Kit");
await go("/brands/");
const pre = page.locator('pre[aria-label="kit.config.json"]');
await pre.waitFor();
const kit = JSON.parse(await pre.innerText());
ok(kit.instances.length === 1 && kit.instances[0].ref === "CTA-001@1.0.0" && kit.instances[0].skin === "solid-accent", `kit JSON is a valid instance (${JSON.stringify(kit)})`);
await go("/components/CTA-002/");
await page.waitForSelector(".stages");
await page.click("text=Add to Kit");
await go("/brands/");
const kit2 = JSON.parse(await page.locator('pre[aria-label="kit.config.json"]').innerText());
ok(kit2.instances.map((i) => i.ref).join() === "CTA-001@1.0.0,CTA-002@1.0.0", "kit persists across component pages");
await page.reload(); await page.waitForSelector('pre[aria-label="kit.config.json"]');
ok(JSON.parse(await page.locator('pre[aria-label="kit.config.json"]').innerText()).instances.length === 2, "kit survives reload");
await page.getByRole("button", { name: "Remove CTA-002@1.0.0" }).click();
ok((await page.locator(".kit-list li").count()) === 1, "a component can be removed from the kit");
ok(/master generate --brand brands\/finova\.json/.test(await page.locator(".cmd").innerText()), "the page shows the exact generate command");
await go("/c/CTA-003/"); await page.waitForURL(/\/components\/CTA-003\/?$/);
ok(true, "old /c/ID URL forwards to /components/ID");

// 3o. component detail page sections (P3)
await go("/components/CTA-001/");
ok((await page.locator("nav.subnav > a").allInnerTexts()).join("|") === "Preview|Interactions|Usage|Code|Technical", "a component without variants has Preview, Interactions, Usage, Code, Technical in the sub-nav");
await go("/components/TAB-001/");
ok((await page.locator("nav.subnav > a").allInnerTexts()).join("|") === "Preview|Variants|Interactions|Usage|Code|Technical", "a component with variants also has a Variants link");
for (const id of ["preview", "variants", "interactions", "usage", "code", "technical"]) ok((await page.locator(`section#${id}`).count()) === 1, `section #${id} exists`);
ok((await page.locator("fieldset.tb-group legend").allInnerTexts()).join("|").toLowerCase() === "component options|preview as", "controls are grouped as Component options and Preview as");
ok((await page.locator('fieldset.tb-group:has(legend:text-is("Component options")) #p-design').count()) === 1 && (await page.locator('fieldset.tb-group:has(legend:text-is("Preview as")) #brand').count()) === 1, "Variant sits in Component options, Brand in Preview as");
ok((await page.locator("#usage li").count()) >= 3, "Usage lists use-cases, avoid-when and accessibility notes from the manifest");
ok((await page.locator('#usage a[href^="/components/"]').count()) >= 1, "Usage links to components that pair well");
ok((await page.locator("#interactions .chips-static li").count()) >= 4, "Interactions lists the supported states");
await page.selectOption("#p-design", "vertical");
const inst = JSON.parse(await page.locator('pre[aria-label="kit instance"]').innerText());
ok(inst.instances[0].ref.startsWith("TAB-001@") && inst.instances[0].props.design === "vertical", "the Code section shows the instance for the current selection");
ok(/master generate/.test(await page.locator('pre[aria-label="generate command"]').innerText()), "the Code section shows the generate command");
await page.click('nav.subnav a[href="#usage"]'); await page.waitForTimeout(500);
ok((await page.locator("section#usage").evaluate((e) => e.getBoundingClientRect().top)) < 300, "clicking Usage in the sub-nav scrolls to the Usage section");
await go("/components/ICN-001/");
ok((await page.locator("#variants .icon-cell").count()) >= 30, "the icons component lists all icons under Variants");

// 3p. brand workflow: Explore -> Select -> Customise -> Generate (P4)
await go("/brands/new/");
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector(".steps-bar");
ok((await page.locator(".steps-bar .step-btn").allInnerTexts()).map((t) => t.replace(/^\d\s*/, "").trim()).join("|") === "Explore|Select|Customise|Generate", "the workflow has the four steps in order");
ok((await page.locator(".preset").count()) === 4, "Explore offers four starting kits");
await page.click('[data-preset="saas"] button'); await page.waitForTimeout(300);
ok((await page.locator('.step-btn[aria-current="step"]').innerText()).includes("Select") && (await page.locator(".sel-list li").count()) === 10, "choosing a starting kit moves to Select with its 10 components");
await page.click('.sel-list li:first-child button:has-text("Remove")'); await page.waitForTimeout(200);
ok((await page.locator(".sel-list li").count()) === 9 && /9 components in kit/.test(await page.locator(".steps-meta").innerText()), "Remove takes a component out of the kit");
ok((await page.locator(".gaps li").count()) >= 1, "Select suggests a missing basic group (the header was removed)");
await page.click('.gaps li button'); await page.waitForTimeout(200);
ok((await page.locator(".sel-list li").count()) === 10, "adding the suggestion puts it back in the kit");
await page.click('.wf-nav button:has-text("Next: Customise")'); await page.waitForSelector("#kit-preview .stage");
ok((await page.locator("#kit-preview .stage").count()) === 10, "Customise previews every kit component");
ok(/all \d+ pairs pass/.test(await page.locator("#contrast-result").innerText()), "the starting colours pass the contrast check");
await page.fill("#seed-primary", "#12"); await page.waitForTimeout(200);
ok(/valid primary colour/.test(await page.locator("#contrast-result").innerText()), "an invalid colour is reported instead of silently accepted");
await page.fill("#seed-primary", "#e8e84a"); await page.waitForTimeout(300);
ok(/fail|pass/.test(await page.locator("#contrast-result").innerText()), "a custom colour runs the contrast gate");
await page.fill("#seed-primary", "#1f4fd8"); await page.waitForTimeout(200);
await page.check('input[name="strategy"][value="pill"]');
ok((await page.locator("#kit-preview .stage").first().evaluate((e) => e.style.getPropertyValue("--ds-cta-radius"))) === "9999px", "the corner choice changes the live preview");
await page.check('input[name="strategy"][value="sharp"]');
await page.fill("#b-name", "Aurora Labs");
await page.click('.wf-nav button:has-text("Next: Generate")'); await page.waitForSelector("#gen-summary");
ok(/Aurora Labs/.test(await page.locator("#gen-summary").innerText()) && (await page.locator("#gen-ready").count()) === 1, "Generate shows the summary and says the brand and kit are valid");
ok(/--brand aurora-labs\.brand\.json --kit aurora-labs\.kit\.json/.test(await page.locator("#gen-cmd").innerText()), "the generate command uses the brand's file names");
const downloads = []; page.on("download", (d) => downloads.push(d));
await page.click('button:has-text("Download brand and kit files")'); await page.waitForTimeout(1500);
ok(downloads.map((d) => d.suggestedFilename()).sort().join("|") === "aurora-labs.brand.json|aurora-labs.kit.json", "Generate downloads the brand file and the kit file");
await page.reload(); await page.waitForSelector(".steps-bar");
ok((await page.locator('.step-btn[aria-current="step"]').innerText()).includes("Generate") && /10 components in kit/.test(await page.locator(".steps-meta").innerText()), "the project (step, brand, kit) survives a reload");
await page.click(".step-btn:has-text('Select')"); await page.evaluate(() => localStorage.clear());
await go("/brands/");
ok((await page.locator('a[href="/brands/new/"]').count()) >= 1, "the Brand Design Systems page links to the workflow");

// 3q. brand settings: icons, type scale, effects level (P5)
await go("/brands/new/");
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector(".steps-bar");
await page.click('[data-preset="marketing"] button'); await page.waitForTimeout(300);
await page.click('.wf-nav button:has-text("Next: Customise")'); await page.waitForSelector("#brand-samples");
const iconStroke = () => page.locator("#brand-samples svg.ds-icn-001").first().evaluate((e) => { const c = getComputedStyle(e); return `${parseFloat(c.strokeWidth)}|${c.strokeLinecap}`; });
ok((await iconStroke()) === "1.75|round", "icons start at the Master look (1.75, round)");
await page.selectOption("#i-stroke", "bold"); await page.selectOption("#i-cap", "square");
ok((await iconStroke()) === "2.25|square", "icon weight and line ends change the live sample");
const headSize = () => page.locator("#brand-samples h2, #brand-samples h1, #brand-samples h3").first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
const before = await headSize();
await page.selectOption("#t-scale", "large");
ok((await headSize()) > before, "a larger type scale makes the sample heading bigger");
await page.selectOption("#t-scale", "compact");
ok((await headSize()) < before, "a compact type scale makes it smaller");
await page.selectOption("#t-scale", "large");
await page.selectOption("#b-effects", "minimal");
ok((await page.locator("#effects-flags li").count()) >= 1 && /expressive/.test(await page.locator("#effects-hint").innerText()), "effects level minimal flags the expressive components in the kit");
await page.click('.wf-nav button:has-text("Next: Generate")'); await page.waitForSelector("#gen-summary");
ok((await page.locator("#gen-blockers li").allInnerTexts()).some((t) => /too expressive/.test(t)) && (await page.locator('button:has-text("Download brand and kit files")').isDisabled()), "Generate is blocked while an expressive component is above the effects level");
await page.click('.step-btn:has-text("Customise")'); await page.selectOption("#b-effects", "full");
await page.click('.wf-nav button:has-text("Next: Generate")'); await page.waitForSelector("#gen-ready");
const dl = []; page.on("download", (d) => dl.push(d));
await page.click('button:has-text("Download brand and kit files")'); await page.waitForTimeout(1500);
const brandFile = dl.find((d) => d.suggestedFilename().endsWith(".brand.json"));
const bj = JSON.parse(await (await import("node:fs/promises")).readFile(await brandFile.path(), "utf8"));
ok(bj.icons?.stroke === "bold" && bj.icons?.cap === "square" && bj.typeScale === "large" && bj.effects === undefined, "the brand file carries the icon and type-scale choices (and omits the default effects level)");
await page.evaluate(() => localStorage.clear());

// 3r. patterns, registry.json, llms.txt (P6)
await go("/patterns/");
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector(".pattern");
ok((await page.locator(".pattern").count()) === 4 && (await page.locator(".pattern .pat-cell").count()) === 37, "Patterns shows the 4 starting kits with all their components (9+10+9+9)");
await page.selectOption("#pat-brand", "lifestyle");
ok((await page.locator(".pattern .pat-stage").first().evaluate((e) => e.getAttribute("data-brand"))) === "lifestyle", "the Patterns brand switch applies");
const patDl = []; page.on("download", (d) => patDl.push(d));
await page.click('[data-pattern="dashboard"] button:has-text("Download kit.config.json")'); await page.waitForTimeout(800);
ok(patDl.some((d) => d.suggestedFilename() === "dashboard.kit.json"), "a pattern's kit file can be downloaded");
await page.click('[data-pattern="saas"] a.pat-use'); await page.waitForSelector(".steps-bar");
ok(/10 components in kit/.test(await page.locator(".steps-meta").innerText()), "“Use this kit” fills the Brand UI Kit and opens the workflow");
await page.evaluate(() => localStorage.clear());
const reg = await page.evaluate(async () => (await fetch("/registry.json")).json());
ok(reg.components.length === 57 && reg.presets.length === 4 && ["finova", "lifestyle", "master-yellow", "corporate"].every((s) => reg.brands.some((b) => b.slug === s)), "registry.json lists 57 components, 4 presets and the reference brands");
const refs = new Set(reg.components.map((c) => c.ref));
ok(reg.presets.every((p) => p.components.every((r) => refs.has(r))), "every preset component in registry.json exists");
ok(["icons", "typeScale", "effects"].every((k) => k in reg.schemas.brandConfig.properties) && reg.options.effects.join() === "minimal,subtle,full", "registry.json carries the brand schema and the allowed option values");
ok(reg.components.every((c) => Array.isArray(c.styles) && c.styles.length > 0 && c.discovery), "every component in registry.json has styles and usage metadata");
const llms = await page.evaluate(async () => (await fetch("/llms.txt")).text());
ok(reg.components.every((c) => llms.includes(c.ref)) && /master generate/.test(llms) && /## Components/.test(llms), "llms.txt names every component and says how to generate");

// 4b. navigation
await go("/");
ok((await page.locator("nav.toc details.toc-sec").count()) === 6, "the left contents has Overview, Foundations, Components, Interactions, Patterns, Brand Design Systems");
for (const href of ["/patterns/", "/interactions/", "/brands/", "/foundations/", "/palettes/", "/system/"]) { await go(href); ok((await page.locator("main h1").count()) >= 1, `${href} renders`); }

// 5. a11y of the gallery chrome itself
const axe = await new AxeBuilder({ page }).analyze();
for (const v of axe.violations) ok(false, `axe ${v.id}: ${v.help} (${v.nodes.length})`);
n++;
ok((await page.goto(`${BASE}/components/NOPE-999/`)).status() === 404, "unknown component -> 404");
ok(errors.filter((e) => !/404/.test(e)).length === 0, `no console errors (${errors.filter((e) => !/404/.test(e)).join(" | ")})`);

await browser.close();
console.log(bad ? `gallery: ${bad} FAILED of ${n}` : `gallery: ${n}/${n} pass`);
process.exit(bad ? 1 : 0);
