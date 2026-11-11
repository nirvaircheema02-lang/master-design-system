# License register (Phase 0 / S5)

Policy: clean-room by default. Code is reused only from a verified permissive license, with a `NOTICE` entry.
Verification date: 2026-11-05. "Verified" = read from the project's own repository/site, not a summary.
This is an engineering register, not legal advice; get legal sign-off before the first code reuse.

| Source | Finding | Status | Allowed use now |
|---|---|---|---|
| Radix UI Primitives | MIT, "Copyright (c) 2022 WorkOS" — raw `LICENSE` read | Verified | Use as dependency |
| Base UI (mui/base-ui) | MIT, "Copyright (c) 2019 Material-UI SAS" — raw `LICENSE` read | Verified | Use as dependency |
| Magic UI | MIT (rendered `LICENSE.md` on GitHub). Site says "Free. Open Source." Paid tier not checked | Verified (code) | Code reuse with NOTICE; skip any paid/Pro items |
| Motion (motiondivision/motion) | MIT for the library (rendered `LICENSE.md`). **Motion+** (paid examples/source) is licensed separately; terms at motion.dev/plus not read | Verified (library) | Use library; never copy Motion+ material |
| shadcn/ui | MIT shown on repo page; full `LICENSE.md` fetch failed (504) | Partly verified | Registry *format* and ideas OK; re-read full text before copying code |
| Motion Primitives | Earlier web search says MIT; primary LICENSE could not be fetched (404/504) | **Unverified** | Inspiration only until read |
| React Bits | Sources conflict (MIT vs MIT + Commons Clause); primary LICENSE could not be fetched | **Unverified** | Inspiration only until read. Commons Clause would forbid selling the software, which matters for a product that redistributes components |
| Aceternity UI | **Proprietary.** `/licence` page: end products may be sold, but you "cannot sell, resell, or distribute the Item or derivative works" on a marketplace or as a template. `/terms` is stricter ("personal use", no sub-licensing). Pages disagree; free-vs-paid scope not stated; FAQ not readable | Read, ambiguous | **Inspiration only. Do not copy code or visuals.** A Master Library that is redistributed to other sites is exactly the "derivative work" risk |

## Actions before Phase 1 capture starts
1. Open the primary `LICENSE` of React Bits and Motion Primitives in a browser (the fetch tool got 404/504) and record the text here.
2. Read motion.dev/plus terms and the Aceternity FAQ ("commercial projects"); ask the Aceternity owner in writing if we want to adapt anything.
3. Legal review of the clean-room policy and of redistribution through the copy-in generator (our output is a derivative of our own code only if we never copy third-party source).
4. Create `NOTICE` at repo root when the first third-party code lands (none yet).
