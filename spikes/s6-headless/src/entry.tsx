import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import * as RTabs from "@radix-ui/react-tabs";
import * as RDialog from "@radix-ui/react-dialog";
import { Tabs as BTabs } from "@base-ui/react/tabs";
import { Dialog as BDialog } from "@base-ui/react/dialog";

const panels = ["Panel one", "Panel two", "Panel three"];

const radixTabs = () => h(RTabs.Root, { defaultValue: "a", className: "tabs" },
  h(RTabs.List, { "aria-label": "Sections", className: "list" }, ["a", "b", "c"].map((v, i) => h(RTabs.Trigger, { key: v, value: v, className: "tab" }, "Tab " + (i + 1)))),
  ["a", "b", "c"].map((v, i) => h(RTabs.Content, { key: v, value: v, className: "panel" }, panels[i])));

const baseTabs = () => h(BTabs.Root, { defaultValue: "a", className: "tabs" },
  h(BTabs.List, { "aria-label": "Sections", className: "list" }, ["a", "b", "c"].map((v, i) => h(BTabs.Tab, { key: v, value: v, className: "tab" }, "Tab " + (i + 1)))),
  ["a", "b", "c"].map((v, i) => h(BTabs.Panel, { key: v, value: v, className: "panel" }, panels[i])));

const body = () => h("div", null, h("a", { href: "#x", id: "outside-link" }, "outside link"), h("button", { id: "outside-btn" }, "outside button"), h("div", { style: { height: 2000 } }, "tall content"));
const form = (Title: any, Desc: any, Close: any) => [
  h(Title, { key: "t", className: "title" }, "Edit profile"),
  h(Desc, { key: "d" }, "Make changes here."),
  h("label", { key: "l1" }, "Name ", h("input", { id: "f1", defaultValue: "Ada" })),
  h("label", { key: "l2" }, "Handle ", h("input", { id: "f2", defaultValue: "@ada" })),
  h(Close, { key: "c", className: "close" }, "Close"),
];
const radixDialog = () => h("div", null, body(), h(RDialog.Root, null,
  h(RDialog.Trigger, { id: "open", className: "btn" }, "Open dialog"),
  h(RDialog.Portal, null, h(RDialog.Overlay, { className: "rx-overlay" }), h(RDialog.Content, { className: "rx-popup" }, ...form(RDialog.Title, RDialog.Description, RDialog.Close)))));
const baseDialog = () => h("div", null, body(), h(BDialog.Root, null,
  h(BDialog.Trigger, { id: "open", className: "btn" }, "Open dialog"),
  h(BDialog.Portal, null, h(BDialog.Backdrop, { className: "bu-overlay" }), h(BDialog.Popup, { className: "bu-popup" }, ...form(BDialog.Title, BDialog.Description, BDialog.Close)))));

const views: Record<string, () => any> = { "radix-tabs": radixTabs, "base-tabs": baseTabs, "radix-dialog": radixDialog, "base-dialog": baseDialog };
let root: ReturnType<typeof createRoot> | null = null;
(window as any).__mount = (name: string) => { root?.unmount(); root = createRoot(document.getElementById("app")!); flushSync(() => root!.render(views[name]!())); };
