import "./globals.css";
import type { ReactNode } from "react";
import { loadBrands, loadManifests } from "../lib/registry";
import { Sidebar } from "../components/Sidebar";
import { buildNav } from "../lib/nav";
import { ContextChip } from "../components/ContextChip";
import { CommandPalette, type PaletteEntry } from "../components/CommandPalette";
import { groupOf } from "../lib/nav";

export const metadata = { title: "Master Gallery", description: "Browse, preview and customise Master components" };

export default function RootLayout({ children }: { children: ReactNode }) {
  const brands = loadBrands();
  const manifests = loadManifests();
  const nav = buildNav(manifests);
  const entries: PaletteEntry[] = [
    ...[["/", "Start here", "Overview"], ["/components/", "Browse all components", "Components"], ["/foundations/", "Foundations: type, space, radius, motion", "Foundations"], ["/palettes/", "Colour palettes", "Foundations"], ["/interactions/", "Interactions", "Browse by behaviour"], ["/patterns/", "Patterns", "Page patterns"], ["/brands/", "Brand Design Systems and my Brand UI Kit", "Brand Design Systems"], ["/system/", "How it works", "Overview"]].map(([href, label, hint]) => ({ href: href!, label: label!, hint: hint!, search: `${label} ${hint}`.toLowerCase() })),
    ...manifests.map((m) => ({ href: `/components/${m.id}/`, label: m.name, hint: `${groupOf(m.id)} · ${m.id}`, search: [m.id, m.name, m.description, groupOf(m.id), ...(m.discovery?.tags ?? []), ...(m.discovery?.useCases ?? [])].join(" ").toLowerCase() })),
  ];
  return (
    <html lang="en">
      <head>
        {/* every brand theme is present, scoped by [data-brand]; switching brand = switching an attribute */}
        {brands.map((b) => b.themeCss && <style key={b.config.slug} data-brand-theme={b.config.slug} dangerouslySetInnerHTML={{ __html: b.themeCss }} />)}
      </head>
      <body>
        <header className="top"><a className="brand-mark" href="/">Master Design System</a><CommandPalette entries={entries} /><ContextChip /></header>
        <div className="shell">
          <Sidebar sections={nav} />
          <main className="page">
            {brands.some((b) => !b.themeCss) && <p className="panel">Theme CSS missing: run <code>pnpm build:tokens</code> and reload.</p>}
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
