import { PaletteBrowser } from "../../components/PaletteBrowser";
import { PALETTES, PALETTE_GROUPS } from "../../lib/palettes";

export const metadata = { title: "Palettes · Master Gallery" };

export default function PalettesPage() {
  return (
    <>
      <p style={{ color: "var(--g-muted)" }}>{PALETTES.length} ready-made colour palettes. Each one is a complete theme (every component), checked for readable contrast in light and dark mode. Pick one, see real components in it, then fine-tune the seed colours.</p>
      <PaletteBrowser palettes={PALETTES} groups={PALETTE_GROUPS} />
    </>
  );
}
