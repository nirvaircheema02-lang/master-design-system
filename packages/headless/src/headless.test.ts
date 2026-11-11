import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Node cannot load .tsx directly: bundle the adapter once (dependencies stay external so React is not duplicated).
const here = dirname(fileURLToPath(import.meta.url));
const tmp = mkdtempSync(join(here, "../.tmp-"));
await build({ entryPoints: [join(here, "index.ts")], outfile: join(tmp, "index.mjs"), bundle: true, packages: "external", format: "esm", platform: "node", jsx: "automatic", logLevel: "silent" });
const { Tabs, Dialog, Menu, Accordion, Popover, Tooltip, useThemeContainer } = await import(pathToFileURL(join(tmp, "index.mjs")).href);
rmSync(tmp, { recursive: true, force: true });

test("every adapter exposes the parts components rely on", () => {
  for (const p of ["Root", "List", "Trigger", "Content"] as const) assert.ok(Tabs[p], `Tabs.${p}`);
  for (const p of ["Root", "Trigger", "Portal", "Overlay", "Content", "Title", "Description", "Close"] as const) assert.ok(Dialog[p], `Dialog.${p}`);
  for (const p of ["Root", "Trigger", "Portal", "Content", "Item", "Label", "Separator", "Group"] as const) assert.ok(Menu[p], `Menu.${p}`);
  for (const p of ["Root", "Item", "Header", "Trigger", "Content"] as const) assert.ok(Accordion[p], `Accordion.${p}`);
  for (const p of ["Root", "Trigger", "Portal", "Content", "Close"] as const) assert.ok(Popover[p], `Popover.${p}`);
  for (const p of ["Provider", "Root", "Trigger", "Portal", "Content"] as const) assert.ok(Tooltip[p], `Tooltip.${p}`);
});

test("the theme-scope hook is exported (portalled layers must stay inside data-brand)", () => { assert.equal(typeof useThemeContainer, "function"); });

test("tabs: the state attribute contract holds (data-state, data-orientation) and activation is explicit", () => {
  const html = renderToStaticMarkup(
    h(Tabs.Root, { activation: "manual", defaultValue: "a" },
      h(Tabs.List, null, h(Tabs.Trigger, { value: "a" }, "A"), h(Tabs.Trigger, { value: "b" }, "B")),
      h(Tabs.Content, { value: "a" }, "pa")));
  assert.match(html, /role="tab"[^>]*data-state="active"/);
  assert.match(html, /role="tab"[^>]*data-state="inactive"/);
  assert.match(html, /data-orientation="horizontal"/);
  const panel = html.match(/<div[^>]*role="tabpanel"[^>]*>/)![0];
  assert.match(panel, /data-state="active"/);
});

test("accordion: the heading wraps the only button and state is data-state", () => {
  const html = renderToStaticMarkup(
    h(Accordion.Root, { type: "single", collapsible: true, defaultValue: "a" },
      h(Accordion.Item, { value: "a" }, h(Accordion.Header, null, h(Accordion.Trigger, null, "T")), h(Accordion.Content, null, "c"))));
  assert.match(html, /<h3[^>]*><button[^>]*aria-expanded="true"[^>]*data-state="open"/);
  assert.match(html, /role="region"[^>]*data-state="open"|data-state="open"[^>]*role="region"/);
  assert.match(html, /--_content-height:var\(--radix-accordion-content-height\)/);
});

test("menu: closed trigger advertises the menu popup", () => {
  const html = renderToStaticMarkup(h(Menu.Root, null, h(Menu.Trigger, null, "Actions")));
  assert.match(html, /aria-haspopup="menu"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /data-state="closed"/);
});

test("popover and tooltip: closed triggers carry the contract attributes", () => {
  const pop = renderToStaticMarkup(h(Popover.Root, null, h(Popover.Trigger, null, "Info")));
  assert.match(pop, /aria-haspopup="dialog"/); assert.match(pop, /aria-expanded="false"/); assert.match(pop, /data-state="closed"/);
  const tip = renderToStaticMarkup(h(Tooltip.Provider, null, h(Tooltip.Root, null, h(Tooltip.Trigger, null, "Help"))));
  assert.match(tip, /data-state="closed"/);
});
