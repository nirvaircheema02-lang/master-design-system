import { build } from "esbuild";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Manifest } from "@master-ds/contracts";

const here = dirname(fileURLToPath(import.meta.url));

/** Convention: CTA-001 -> export `Cta001` from Component.tsx. */
export function exportName(m: Manifest): string {
  const [cat, num] = m.id.split("-") as [string, string];
  return cat[0] + cat.slice(1).toLowerCase() + num;
}

/**
 * Server-render the REAL component source (not a hand-copied fixture). CSS imports are stubbed out
 * because the harness links the stylesheet files itself, exactly as a site would.
 */
export async function renderComponent(componentDir: string, m: Manifest, props: Record<string, string> = {}, children = "Get started"): Promise<string> {
  const work = mkdtempSync(join(tmpdir(), "master-ssr-"));
  const entry = join(work, "entry.tsx");
  const name = exportName(m);
  const { writeFileSync } = await import("node:fs");
  writeFileSync(entry, `
    import { createElement } from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import { ${name} as C } from ${JSON.stringify(join(componentDir, "Component.tsx"))};
    export const html = renderToStaticMarkup(createElement(C, ${JSON.stringify(props)}, ${JSON.stringify(children)}));
  `);
  const out = join(work, "out.mjs");
  mkdirSync(work, { recursive: true });
  await build({
    entryPoints: [entry], outfile: out, bundle: true, platform: "node", format: "esm",
    jsx: "automatic", loader: { ".css": "empty" }, logLevel: "silent",
    nodePaths: [join(here, "../node_modules")], absWorkingDir: here,
    banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  });
  const mod = await import(pathToFileURL(out).href);
  return mod.html as string;
}

/**
 * Bundle the REAL component with react-dom/client into a browser script. The harness mounts it with real props and
 * real handlers (so "loading ignores activation" is testable). CSS imports are stubbed: the page links the files.
 */
export async function bundleClient(componentDir: string, m: Manifest, headlessDir?: string): Promise<string> {
  const work = mkdtempSync(join(tmpdir(), "master-client-"));
  const entry = join(work, "entry.tsx");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(entry, `
    import { createElement } from "react";
    import { flushSync } from "react-dom";
    import { createRoot } from "react-dom/client";
    import { ${exportName(m)} as C } from ${JSON.stringify(join(componentDir, "Component.tsx"))};
    const root = createRoot((document.getElementById("slot") ?? document.getElementById("stage"))!);
    (window as any).__clicks = 0;
    (window as any).__key = 0; // bump it (see arch-common fresh) to remount the component with fresh internal state
    (window as any).__mount = (props: Record<string, unknown> = {}) => {
      const { children, ...rest } = props;
      flushSync(() => root.render(createElement(C as any, { ...rest, key: (window as any).__key, onClick: () => { (window as any).__clicks++; } }, children as string | undefined)));
    };
  `);
  const r = await build({
    entryPoints: [entry], write: false, bundle: true, platform: "browser", format: "iife", jsx: "automatic", minify: true,
    loader: { ".css": "empty" }, logLevel: "silent", nodePaths: [join(here, "../node_modules")], absWorkingDir: here,
    define: { "process.env.NODE_ENV": '"production"' },
    ...(headlessDir ? { alias: { "@master-ds/headless": join(headlessDir, "index.ts") } } : {}),
  });
  return r.outputFiles[0]!.text;
}
