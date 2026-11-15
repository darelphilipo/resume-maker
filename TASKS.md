# Resume Maker — Autonomous Task Queue

> **Read order for every run:** `AGENTS.md` → this file → `CONTEXT.md`.
> `CONTEXT.md` holds the durable gotchas (mobile scroll container, canvas
> gestures, print title, static-export limits). Read it before touching code.
>
> **Before you finish:** append a Session Log entry to `CONTEXT.md`. If you
> learned something expensive, promote it into *Decisions & Gotchas*.
>
> **One task per run.** Implement, test, move the item to *Done*, stop.

## Inbox (User Ideas — Add New Requests Here)
_Empty. Drop new raw ideas here; promoting one to *Queue* means adding file
paths and a testable acceptance criterion._

## In Progress (OpenCode Updates This)
_None yet._

## Queue (Ready for Next Run)

### P0 — Bugs and correctness
- [ ] P0: Show saved Dexie resumes (`src/lib/store/db.ts`) on `/` in `Launcher.tsx` with Open, Duplicate, and Delete actions; sort by last-edited. Users currently cannot find a draft without bookmarking `?id=`.
- [ ] P0: Add a "Blank Resume" card on `/` and rename the preset group to "Start from a role sample" (`Launcher.tsx`). All 5 presets currently load sample data, so the "Start from scratch" label is misleading.
- [ ] P0: Fix preview zoom + `Fit` in `LiveCanvasViewport.tsx` — `+` clips left/right edges with no horizontal scroll, and `Fit` does not restore the initial unclipped scale. Recalculate against container width on Fit; allow horizontal overflow past 100%. Must not regress mobile scrolling (see `CONTEXT.md` #3).
- [ ] P0: Add independent scroll panes for Content/Preview/Design at `lg:` in `EditorWorkspace.tsx`, keeping `MobileBottomNav` behaviour on mobile. Expanding a tall section currently pushes Preview and Design off-screen.
- [ ] P0: Verify and complete live preview on typing — `BasicsForm.tsx` should update on input with ~100 ms debounce. `useDebouncedCommit.ts` already exists; find the fields that still update only on blur and fix those.
- [ ] P0: Standardize dates — `Certifications` uses free text (`2023-11`) instead of the month/year picker, and narrow two-column date fields truncate `October 2023` to `October 20...`. Format narrow inputs as `Oct 2023`.
- [ ] P0: Add the trust badge above the fold on `/`: `100% Free · No Sign-Up · Works Offline in Your Browser` (`Launcher.tsx`). Free/local export is the product's main differentiator.

### P1 — High-value features
- [ ] P1: Enable "Fit to 1 Page" in `PageOverflowBanner.tsx` using `OnyxTemplate` CSS variables, and add `break-inside: avoid` to experience/project entries so roles stop splitting mid-bullet across pages. Show a "Spills onto 2 pages" badge.
- [ ] P1: Add an ATS Plain-Text View toggle to the Preview pane showing the exact linear text order a parser extracts from the current template.
- [ ] P1: Add a client-side JD keyword matcher drawer — paste a job description, highlight Matched vs Missing keywords against the resume. Regex/token heuristics only, no API calls.
- [ ] P1: Remove the `LevelInput` slider from `SkillsForm.tsx`; ATS ignores 1–5 ratings. Use Category + comma-separated keywords (`Languages: Python, SQL`).
- [ ] P1: Tuck `Awards`, `Languages`, `Interests`, `Volunteer`, `Publications`, `References` behind `+ Add optional section` in `SectionList.tsx` so the default list is short.
- [ ] P1: Expose UI to add/delete `customSections` and rename section headings in `SectionList.tsx`. `CustomSectionForm.tsx` exists — verify what is wired and finish the UI.
- [ ] P1: Simplify contact inputs — auto-detect network and icon from a pasted profile URL (`github.com/user` → GitHub) and drop the manual `Icon` and `Website label` fields (`BasicsForm.tsx`).
- [ ] P1: Add an optional one-line Work Auth / Notice Period tag to `Basics` (`Immediate Joiner`, `Authorized to work in US`).
- [ ] P1: Show a one-line mobile print tip to uncheck "Headers and footers" in the print dialog (`PrintTriggerButton.tsx`), so browser URLs and dates stay out of the PDF.
- [ ] P1: Add client-side Paste-to-Parse import — a textarea on `Launcher.tsx` that parses raw pasted text (PDF/LinkedIn/ChatGPT output) into Basics, Experience, Education, Skills via section-heading heuristics.
- [ ] P1: Add client-side PDF text extraction with `pdf.js` feeding the same parser; flip `PDF_IMPORT_ENABLED` in `src/lib/features.ts` only when the parser is real.
- [ ] P1: Reframe JSON import/export as a secondary "Backup & Restore" menu on `/` rather than the primary entry point.
- [ ] P1: Add action-verb and metric helper chips to `RichTextField.tsx` (Built, Reduced, Led, Automated) with an `[Action] + [What] + [Result by X%]` prompt.

### P2 — Larger work
- [ ] P2: Add a template system in `src/templates/registry.ts` with 6 single-column-first templates — Engineering Classic (Jake), Ivy/Executive (Harvard), Modern Accent, Compact 1-Pager, Hybrid Skills-First, and a two-column Studio Sidebar labelled "Best for direct/human review". Show an ATS-Safe badge on single-column options.
- [ ] P2: Add 4 design controls to `DesignPanel.tsx`: template selector, accent color (5–6 curated swatches + monochrome), font pairing (Sans/Serif/Classic), density (Compact/Normal/Relaxed).
- [ ] P2: Add client-side `.docx` export for single-column templates (e.g. `docx` package) for legacy ATS portals.
- [ ] P2: Add lazy-loaded DOCX import (`mammoth`) and LinkedIn Data Export ZIP/CSV import (`jszip`).
- [ ] P2: Support the open JSON Resume schema for import/export to avoid vendor lock-in.
- [ ] P2: Add PWA offline caching so the app works on spotty mobile connections.

## Done
<!-- Move completed items here with YYYY-MM-DD, 1-line summary, and files touched -->

- [x] 2026-11-15 — Mobile shell: tab bar moved into normal flow, `<main>` is the sole mobile scroll container, `dvh` sizing, `viewport-fit=cover`. Removed the 112px-for-57px dead band. Files: `EditorWorkspace.tsx`, `MobileBottomNav.tsx`, `EditorLoading.tsx`, `src/app/layout.tsx`, `e2e/mobile.spec.ts`.
- [x] 2026-11-15 — Multi-page preview scrolling: pan/pinch disabled on coarse pointers plus `touch-action: pan-y`; a one-finger swipe now scrolls instead of being swallowed. Files: `LiveCanvasViewport.tsx`, `e2e/mobile.spec.ts`.
- [x] 2026-11-15 — PDF filename is now `{name}-{headline}-{YYYY-MM-DD}-resume` (lowercase-kebab, local date, 1.2 s title grace on touch). Files: `src/lib/print/printDocument.ts`, `PrintTriggerButton.tsx`, `e2e/print.spec.ts`.
- [x] 2026-11-15 — Autonomous development bootstrap: OpenCode autopilot workflow (6-hourly, one task, verify-gated commit, checkpoint branch), `opencode.json` permissions, `TASKS.md`, `CONTEXT.md`. Files: `.github/workflows/opencode-autopilot.yml`, `opencode.json`, `TASKS.md`, `CONTEXT.md`.
- [x] 2026-11-14 — GitHub Pages deployment of the static export. Files: `next.config.ts`, `.github/workflows/deploy.yml`.
- [x] 2026-11-14 — Cursor-anchored multiplicative wheel zoom on the canvas. Files: `src/lib/zoom/wheelZoom.ts`, `LiveCanvasViewport.tsx`.
