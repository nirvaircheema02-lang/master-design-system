"use client";
export const KIT_KEY = "master-kit-v0";
export const KIT_EVENT = "master-kit-change";
export interface KitInstance { ref: string; skin: string; props: Record<string, string> }

export function readKit(): KitInstance[] {
  try { return JSON.parse(localStorage.getItem(KIT_KEY) ?? "[]"); } catch { return []; }
}
export function writeKit(next: KitInstance[]) {
  try { localStorage.setItem(KIT_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(KIT_EVENT));
}

/** One kit entry for a component with its first style and the same default props the component page starts with. */
export function defaultInstance(m: { id: string; version: string; skins: Array<{ id: string }>; props: Record<string, string[]> }): KitInstance {
  return { ref: `${m.id}@${m.version}`, skin: m.skins[0]!.id, props: Object.fromEntries(Object.entries(m.props).map(([k, v]) => [k, v[k === "design" ? 0 : Math.min(1, v.length - 1)]!])) };
}
