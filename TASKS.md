# Resume Maker — Autonomous Task Queue

> **Read order for every run:** `AGENTS.md` → this file → `CONTEXT.md`.
> `CONTEXT.md` holds the durable gotchas (mobile scroll container, canvas
> gestures, print title, static-export limits). Read it before touching code.
>
> **Before you finish:** append a Session Log entry to `CONTEXT.md`. If you
> learned something expensive, promote it into *Decisions & Gotchas*. Also
> update `README.md` whenever the task adds or changes a user-visible feature:
> extend the **Key features** tour in user language, never with a changelog or
> run log.
>
> **One task per run.** Implement, test, move the item to *Done*, stop.

## Inbox (User Ideas — Add New Requests Here)

_empty

## In Progress (OpenCode Updates This)
_None yet._

## Queue (Ready for Next Run)

### P1 — High-value features
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
- [ ] P2: Support the open JSON Resume schema for import/export to avoid vendor lock-in.

## Done
<!-- Move completed items here with YYYY-MM-DD, 1-line summary, and files touched -->

- [x] 2026-11-15 — Role-preset samples now match the categorized Skills model: each archetype ships three `Category` rows with keyword lists (e.g. Languages / Backend / Cloud & DevOps), and legacy 1–5 levels are no longer used in samples. Added category-shape and ATS-output tests. Files: `src/lib/presets/archetypes.ts`, `src/lib/presets/archetypes.test.ts`, `README.md`, `CONTEXT.md`.

- [x] 2026-11-15 — Tucked empty Awards, Languages, Interests, Volunteer, Publications, and References behind a `+ Add optional section` disclosure; added four SectionList tests and kept Move actions on visible rows. Files: `src/components/editor/SectionList.tsx`, `src/components/editor/SectionList.test.tsx`, `README.md`, `CONTEXT.md`.
- [x] 2026-11-15 — Skills are now category + comma-separated keywords: removed the 1–5 `LevelInput` slider from the skills form, relabeled `Name` as `Category`, stopped printing proficiency bars on skill entries (levels stay in the schema for import compatibility), and added form/rendering tests. Files: `src/components/editor/SkillsForm.tsx`, `src/components/editor/SkillsForm.test.tsx`, `src/templates/shared/SectionRenderer.tsx`, `src/templates/shared/SectionRenderer.test.tsx`, `README.md`.
- [x] 2026-11-15 — Added a client-side JD keyword matcher drawer: paste a job description and see Matched vs Missing keyword chips with a coverage bar, using local regex/token heuristics (stopwords, frequency ranking, dotted/plural variants) against the same ATS text the parser reads. Files: `src/lib/keywords/jdMatch.ts`, `src/lib/keywords/jdMatch.test.ts`, `src/components/editor/JdMatchDrawer.tsx`, `src/components/editor/JdMatchDrawer.test.tsx`, `src/components/editor/EditorWorkspace.tsx`, `src/components/editor/EditorWorkspace.test.tsx`, `README.md`.
- [x] 2026-11-15 — Added an ATS Plain-Text View toggle to the Preview pane that renders the exact linear text a parser reads from the current template, mirroring Onyx's header/section order, hidden-item filtering, dates, keywords, and rich-text bullets. Files: `src/lib/ats/atsText.ts`, `src/lib/ats/atsText.test.ts`, `src/components/preview/AtsTextView.tsx`, `src/components/preview/AtsTextView.test.tsx`, `src/components/preview/LiveCanvasViewport.tsx`, `src/components/editor/EditorWorkspace.tsx`, `src/components/editor/EditorWorkspace.test.tsx`, `README.md`.
- [x] 2026-11-15 — Added a user-facing `README.md` covering the free/no-AI goal, privacy model, feature tour, PDF steps, and local commands; made README feature updates a standing finish step in `TASKS.md` and `CONTEXT.md`. Files: `README.md`, `TASKS.md`, `CONTEXT.md`.
- [x] 2026-11-15 — Project dates now use native month pickers in a full-width pair (matching Experience/Education) instead of compact text fields, with ISO imported dates normalized to `YYYY-MM`. Files: `src/components/editor/ProjectsForm.tsx`, `src/components/editor/ProjectsForm.test.tsx`.
- [x] 2026-11-15 — Enabled "Fit to 1 Page": multi-page previews show a "Spills onto N pages" badge, the action applies a computed `metadata.page.fitScale` through the Onyx `--resume-*` CSS variables, and experience/project entries stay together across print breaks. Files: `src/lib/schema/resume.schema.ts`, `src/lib/pagination/fitScale.ts`, `src/lib/pagination/usePageLayout.ts`, `src/components/preview/PageOverflowBanner.tsx`, `src/components/preview/LiveCanvasViewport.tsx`, `src/components/preview/MeasureLayer.tsx`, `src/components/editor/EditorWorkspace.tsx`, `src/templates/onyx/OnyxTemplate.tsx`, `src/templates/onyx/onyx.css`, `src/templates/shared/SectionRenderer.tsx`, `src/styles/print.css`, `src/lib/pagination/fitScale.test.ts`, `src/lib/pagination/usePageLayout.test.tsx`, `src/components/preview/PageOverflowBanner.test.tsx`, `src/components/preview/LiveCanvasViewport.test.tsx`, `src/components/preview/MeasureLayer.test.tsx`, `src/templates/onyx/onyx.test.tsx`, `src/templates/shared/SectionRenderer.test.tsx`, `src/lib/schema/defaults.test.ts`.
- [x] 2026-11-15 — Added the `100% Free · No Sign-Up · Works Offline in Your Browser` trust badge as the first, wrapping element above the launcher cards on `/`, with a test asserting the phrases, non-interactivity, and DOM order. Files: `src/components/launcher/Launcher.tsx`, `src/components/launcher/launcher.test.tsx`.
- [x] 2026-11-15 — Standardized dates: certifications/awards/publications/custom dates use month pickers, shared month helpers normalize imported `YYYY-MM-DD`, and the narrow project date pair shows compact `Oct 2023` while storing `YYYY-MM`. Files: `src/lib/date/month.ts`, `SectionFormControls.tsx`, `ProjectsForm.tsx`, `sectionFields.ts`, `CustomSectionForm.tsx`, `src/templates/shared/DateRange.tsx`, `src/lib/date/month.test.ts`, `src/components/editor/MonthInput.test.tsx`, `src/components/editor/sectionFields.test.ts`.
- [x] 2026-11-15 — Mobile shell: tab bar moved into normal flow, `<main>` is the sole mobile scroll container, `dvh` sizing, `viewport-fit=cover`. Removed the 112px-for-57px dead band. Files: `EditorWorkspace.tsx`, `MobileBottomNav.tsx`, `EditorLoading.tsx`, `src/app/layout.tsx`, `e2e/mobile.spec.ts`.
- [x] 2026-11-15 — Multi-page preview scrolling: pan/pinch disabled on coarse pointers plus `touch-action: pan-y`; a one-finger swipe now scrolls instead of being swallowed. Files: `LiveCanvasViewport.tsx`, `e2e/mobile.spec.ts`.
- [x] 2026-11-15 — PDF filename is now `{name}-{headline}-{YYYY-MM-DD}-resume` (lowercase-kebab, local date, 1.2 s title grace on touch). Files: `src/lib/print/printDocument.ts`, `PrintTriggerButton.tsx`, `e2e/print.spec.ts`.
- [x] 2026-11-15 — Autonomous development bootstrap: OpenCode autopilot workflow (6-hourly, one task, verify-gated commit, checkpoint branch), `opencode.json` permissions, `TASKS.md`, `CONTEXT.md`. Files: `.github/workflows/opencode-autopilot.yml`, `opencode.json`, `TASKS.md`, `CONTEXT.md`.
- [x] 2026-11-14 — GitHub Pages deployment of the static export. Files: `next.config.ts`, `.github/workflows/deploy.yml`.
- [x] 2026-11-14 — Cursor-anchored multiplicative wheel zoom on the canvas. Files: `src/lib/zoom/wheelZoom.ts`, `LiveCanvasViewport.tsx`.
