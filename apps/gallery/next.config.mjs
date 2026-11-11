/** @type {import('next').NextConfig} */
export default {
  // workspace packages ship TypeScript source (and CSS imports): let Next compile them
  transpilePackages: ["@master-ds/components", "@master-ds/contracts", "@master-ds/headless", "@master-ds/tokens"],
  eslint: { ignoreDuringBuilds: true },
  // a dev server can run beside a build/export (e.g. while `pnpm check:all` runs) by pointing it at its own output folder
  ...(process.env.GALLERY_DIST ? { distDir: process.env.GALLERY_DIST } : {}),
  // `GALLERY_EXPORT=1 pnpm build` writes a static site to out/ (used by verify.mjs; also deployable anywhere)
  ...(process.env.GALLERY_EXPORT ? { output: "export", trailingSlash: true } : {}),
};
