import type { ComponentType } from "react";
import { Cta001, Cta002, Cta003, Cta004, Cta005, Cta006, Cta007, Cta008, Cta009, Cta012, Cta013, Cta010, Cta011, Cta014, Crd002, Crd003, Crd004, Inp001, Frm001, Acc002, Nav001, Nav002, Tab001, Acc001, Nav003, Dlg001, Dlg003, Nav008, Nav009, Nav006, Nav007, Tst001, Nav005, Nav004, Dlg002, Tip001, Inp003, Inp004, Inp005, Inp006, Inp007, Crd005, Nav010, Tbl001, Txt001, Txt002, Txt003, Txt004, Icn001, Bdg001, Bdg002, Avt001, Lay001, Lay002, Lay003, Ldr001, Ldr002 } from "@master-ds/components";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Preview = ComponentType<any>;

/** id -> real component. Hand-listed for now; generated from the registry in a later phase. */
export const PREVIEWS: Record<string, Preview> = { "CTA-001": Cta001, "CTA-002": Cta002, "CTA-003": Cta003, "CTA-004": Cta004, "CTA-005": Cta005,
  "CTA-006": Cta006, "CTA-007": Cta007, "CTA-008": Cta008, "CTA-009": Cta009, "CTA-012": Cta012, "CTA-013": Cta013,
  "CTA-010": Cta010, "CTA-011": Cta011, "CTA-014": Cta014,
  "CRD-002": Crd002, "CRD-003": Crd003, "CRD-004": Crd004, "INP-001": Inp001, "FRM-001": Frm001, "ACC-002": Acc002, "NAV-001": Nav001, "NAV-002": Nav002,
  "TAB-001": Tab001, "ACC-001": Acc001, "NAV-003": Nav003, "DLG-001": Dlg001, "DLG-003": Dlg003,
  "NAV-008": Nav008, "NAV-009": Nav009, "NAV-006": Nav006, "NAV-007": Nav007, "TST-001": Tst001,
  "NAV-005": Nav005, "NAV-004": Nav004, "DLG-002": Dlg002, "TIP-001": Tip001,
  "INP-003": Inp003, "INP-004": Inp004, "INP-005": Inp005, "INP-006": Inp006, "INP-007": Inp007, "CRD-005": Crd005, "NAV-010": Nav010, "TBL-001": Tbl001,
  "TXT-001": Txt001, "TXT-002": Txt002, "TXT-003": Txt003, "TXT-004": Txt004, "ICN-001": Icn001, "BDG-001": Bdg001, "BDG-002": Bdg002, "AVT-001": Avt001, "LAY-001": Lay001, "LAY-002": Lay002, "LAY-003": Lay003, "LDR-001": Ldr001, "LDR-002": Ldr002,
};
