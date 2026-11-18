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

_None._

## Queue (Ready for Next Run)
_none._

### P0 — Multi-Page & Scroll Fixes

- [ ] P0: Fix mobile multi-page preview scroll jitter and prevent resume pages from scrolling behind/above the Preview header (`src/components/editor/EditorWorkspace.tsx`, `src/components/preview/LiveCanvasViewport.tsx`, `src/components/preview/TouchPanCanvas.tsx`).
  1. **Separate the Preview header from the scroll container:** On mobile (`< lg`), make `#panel-preview` a `flex h-full min-h-0 flex-col` container where the Preview header (`Preview` title, `Visual`/`ATS text` toggle, `PageOverflowBanner`, and `N pages` pill) sits in a `shrink-0 bg-background z-10` top block **outside** the scrollable canvas, and only the canvas viewport below it has `min-h-0 flex-1 overflow-y-auto overscroll-contain`. This guarantees scrolled pages are cleanly clipped at the bottom edge of the Preview header and can never bleed behind or above it.
  2. **Eliminate mobile scroll jitter:** When the preview is at default fit-to-width scale (not pinched/zoomed in), let native browser vertical scrolling (`touch-action: pan-y`) handle multi-page scrolling directly without `TouchPanCanvas` intercepting `touchmove` or running `scrollPageBy` handoffs, and ensure `TransformWrapper` does not apply competing transforms during normal vertical page scrolls.

### P1 — Visual Consistency, Mobile Drawer & Editor UX

- [ ] P1: Fix mobile `EntryDrawer` keyboard overlap and horizontal overflow in `src/components/editor/EntryDrawer.tsx` and `src/components/editor/useVisualViewportOffset.ts`. Subtract `viewportOffset` from `Drawer.Content` max-height (`maxHeight: calc(95dvh - ${viewportOffset}px)`) so opening the mobile keyboard never pushes the drawer header off-screen, and add `overflow-x-hidden min-w-0` to the scrollable body and inner wrapper.

- [ ] P1: Fix Launcher capsule tap-blink, uneven heights, missing Recent Resumes / Blank start, and Paste parser bugs in `src/components/launcher/Launcher.tsx` and `src/lib/import/` (paste parser).
  1. Add `h-full` to preset `<li>` / `<button>` cards so row heights match, span/center the 5th card cleanly, and only show a loading state on the tapped card (`creatingId === archetype.id`) without dimming siblings (`opacity-60`).
  2. Fix disabled `"Create resume from text"` button inner-box styling and immediate `onChange` enablement (no blur delay).
  3. Surface `"Start blank"` and the Dexie-backed `"Recent resumes"` list (open, rename, delete) on `/`.
  4. Fix the paste-to-parse logic so commas inside institution names (e.g., `University of California, Berkeley`) are not split into separate fields and `Skills` sections are preserved.

- [ ] P1: Standardize white input backgrounds, unified Month/Year date pickers, and sidebar layout in `src/components/editor/RichTextField.tsx`, `src/components/editor/SectionFormControls.tsx`, and `src/components/editor/EditorWorkspace.tsx`.
  1. Add `bg-surface` (`#ffffff`) to `RichTextField` containers (removing the beige `#f5f3ee` bleed-through) and improve placeholder contrast on optional inputs.
  2. Replace native `<input type="month">` scroll popups and inconsistent text date inputs with one unified Month + Year selector component across Experience, Education, Certifications, Awards, and Publications.
  3. Fix horizontal clipping of inputs and the Rich Text `Redo` button inside the `22rem` desktop Content column, prevent sidebar scroll-to-top jumps when reordering entries (`Move up` / `Move down`), and make desktop `#panel-preview` and `#panel-design` `lg:sticky` with independent scrolling.

- [ ] P1: Fix editor micro-interactions and Design panel controls in `src/components/editor/BasicsForm.tsx`, `src/components/editor/RichTextField.tsx`, `src/components/editor/DesignPanel.tsx`, and `src/components/editor/JdMatchDrawer.tsx`.
  1. Update `Name` preview live on `onChange` (not only on blur) and show a clean fallback/validation state when `Picture URL` fails to load.
  2. Prepend a leading space when inserting an action-verb chip after non-whitespace text (e.g., `...merges. Built `).
  3. Add explicit `htmlFor`/`id` and full-card clickability to `DesignPanel` paper-size cards (`A4` / `Letter`), verify `Studio Sidebar` renders its two-column layout on Page 1, and ensure `"Match to a job description"` is wired and opens `JdMatchDrawer` on desktop and mobile.

### P2 — Automated Multi-Viewport Regression Gate

- [ ] P2: Add `e2e/layout-consistency.spec.ts` testing both `390x844` (mobile) and `1280x800` (desktop) viewports for: equal preset card heights & no sibling blink on tap, white `RichTextField` backgrounds, no `<input type="month">`, non-overlapping page-count badge, multi-page pagination filling Page 1 before breaking, normal mouse-wheel scrolling without unintended zoom, and sticky desktop Preview/Design panels.

### P2 — Larger work
- [ ] P2: Add 4 design controls to `DesignPanel.tsx`: template selector, accent color (5–6 curated swatches + monochrome), font pairing (Sans/Serif/Classic), density (Compact/Normal/Relaxed).
- [ ] P2: Support the open JSON Resume schema for import/export to avoid vendor lock-in.

## Done
<!-- Move completed items here with YYYY-MM-DD, 1-line summary, and files touched -->

- [x] 2026-11-18 — Moved the preview toolbar above the canvas and made
  "Fit to 1 Page" readable: the page-count pill plus **Reset fit** / Reset zoom
  now render in the sticky `[data-canvas-toolbar]` above `<TransformWrapper>`,
  so they can never cover the candidate's name; zoom visibility is mirrored
  through `onTransform` and resets use a `ReactZoomPanPinchContentRef`.
  `MIN_FIT_SCALE` is now `0.78`, `usePageLayout` reports `fitBlockedReason`
  (`too-tall` / `page-break`), and `PageOverflowBanner` shows explanatory copy
  instead of shrinking to microscopic type. A **Reset fit** pill calls
  `onFit(1)` whenever the applied `metadata.page.fitScale` is below 1.
  Verified `npm run typecheck`, `npm test` (522 pass), `npm run build` (static
  export; the security-advisory nudge needed the usual second run). Playwright
  is blocked in this sandbox; `npm run e2e -- e2e/layout-consistency.spec.ts`
  still needs a browser-enabled run at `390x844` / `1280x800`. Files:
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `PageOverflowBanner.tsx` (+ test), `CanvasResetButton.tsx` (+ test),
  `src/lib/pagination/fitScale.ts` (+ test), `usePageLayout.ts` (+ test),
  `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-18 — Stopped mid-word line breaking in resume prose: the `.onyx`
  root now uses `overflow-wrap: break-word; word-break: normal;` instead of
  `overflow-wrap: anywhere`, so normal paragraphs and bullets wrap only at word
  boundaries; `overflow-wrap: anywhere` is kept on a dedicated `.onyx a` rule so
  long URLs/links still break anywhere. `variants.css` and `studio.css` had no
  root wrap override to change. Added a raw-CSS unit test guarding both rules,
  plus a short README preview bullet. Verified `npm run typecheck`, `npm test`
  (517 pass), `npm run build` (static export; the Next.js security-advisory nudge
  needed the usual second run). Playwright is blocked in this sandbox (`npm run
  e2e` is rejected), so `npm run e2e -- e2e/layout-consistency.spec.ts` at
  `390x844` / `1280x800` still needs a browser-enabled run. Files:
  `src/templates/onyx/onyx.css`, `src/templates/onyx/onyx-css.test.ts` (new),
  `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-18 — Fixed the 80%-blank Page 1 bug: multi-entry sections are now
  measured and packed entry by entry instead of as one indivisible block, with
  each heading fused to its first entry (`keep-with-next`) so Page 1 fills
  naturally. `getSectionPlans`/`planBlockKeys` keep summaries, `keepTogether`
  and multi-column sections atomic; new encoded entry ids preserve the existing
  `pages: string[][]` contract across all templates and print; `SectionRenderer`
  groups consecutive entry blocks back into one `<section>` so grid gaps,
  columns and CSS break rules still apply. `startOnNewPage`, canonical order,
  zero-height filtering and ATS text are unchanged. Also removed the stale
  wheel-scroll Queue item (already in Done from 2026-11-18). Verified
  `npm run typecheck`, `npm test` (515 pass), `npm run build` (static export;
  the usual Next.js security-advisory nudge needed a second run). Files:
  `src/lib/pagination/blockIds.ts` (+ test, new), `sectionPlans.ts` (+ test,
  new), `computePages.ts` (+ test), `index.ts`,
  `src/templates/shared/sectionData.ts` (new), `SectionRenderer.tsx` (+ test),
  `MeasureLayer.tsx` (+ test), `StudioSidebarTemplate.tsx`, `usePageLayout.ts`
  (+ test), `README.md`, `CONTEXT.md`, `TASKS.md`. Playwright remains blocked in
  this sandbox; `npm run e2e -- e2e/layout-consistency.spec.ts` should be run
  with a browser.

- [x] 2026-11-18 — Fixed preview scroll hijacking and sticky chrome: plain wheel
  and two-finger scrolling now pass through to the page scroller while only
  Ctrl/⌘ + wheel zooms (`isZoomWheel`); the touch pan-to-scroll hand-off eases
  in over the first four at-bound moves instead of snapping (`dampHandoffScroll`);
  and the `Visual`/`ATS text`, page-count/Reset, and overflow banner chrome now
  form a sticky header that stays above Page 1 in normal flow. Verified
  `npm run typecheck`, `npm test` (497 pass), `npm run build` (static export;
  the Next.js security-advisory nudge needed the usual second run). Files:
  `src/lib/zoom/wheelZoom.ts` (+ test), `src/lib/zoom/canvasGestures.ts` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `src/components/preview/TouchPanCanvas.tsx` (+ test),
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `e2e/layout-consistency.spec.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.
  Playwright could not run in this sandbox (shell rejects `npm run e2e`); the two
  new viewport cases are typechecked but browser-unverified — next run with a
  browser should execute `npm run e2e -- e2e/layout-consistency.spec.ts`.

- [x] 2026-11-18 — Registered all six templates with user-facing metadata and an
  ordered picker list. Engineering Classic (Jake), Ivy/Executive (Harvard),
  Modern Accent, Compact 1-Pager, and Hybrid Skills-First are single-column CSS
  variants of the shared Onyx DOM and carry an **ATS-Safe** badge; the two-column
  Studio Sidebar splits sections into a main column plus sidebar and is badged
  **Best for direct/human review**. `DesignPanel` now lists all six as
  mobile-first radio cards. Verified `npm run typecheck`, `npm test` (485 pass),
  `npm run lint`, `npm run build` (static export). Files: `src/templates/registry.ts`,
  `src/templates/shared/templateTheme.ts` (new),
  `src/templates/shared/TemplateBadge.tsx` (new),
  `src/templates/shared/SectionRenderer.tsx`,
  `src/templates/variants/Variants.tsx` + `variants.css` (new),
  `src/templates/studio/StudioSidebarTemplate.tsx` + `studio.css` (new),
  `src/templates/onyx/OnyxTemplate.tsx` (+ test), `registry.test.tsx` (new),
  `Variants.test.tsx` (new), `TemplateBadge.test.tsx` (new),
  `src/components/editor/DesignPanel.tsx` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-17 — Added `e2e/layout-consistency.spec.ts`, a Playwright regression spec
  over six previously-fixed visual/layout behaviours. It follows the `a11y.spec.ts`
  pattern with a `VIEWPORTS` loop (`390x844` mobile, `1280x800` desktop): preset cards
  in a shared grid row have equal heights and clicking one leaves sibling computed
  opacity unchanged; Summary/Experience/Education `.tiptap` surfaces compute to
  white; no `input[type="month"]` remains in dated sections; the page-count badge
  never overlaps `.resume-name`; a desktop-only case scrolls Content and asserts
  `#panel-preview` stays in-viewport; and the `Letter` card body plus the JD Match
  trigger hit their targets (radio checked / dialog open). Verified
  `npm run typecheck`, `npm test` (467 pass). Files: `e2e/layout-consistency.spec.ts`,
  `TASKS.md`, `CONTEXT.md`. Playwright execution was not available in this sandbox
  (shell restricted); next run with browser access should execute
  `npm run e2e -- e2e/layout-consistency.spec.ts` against a dev server.

- [x] 2026-11-17 — Fixed the three visual/UX rough edges in the editor: the
  `RichTextField` toolbar and entry actions now sit on one compact row (36px
  targets on fine pointers, 44px on touch, horizontal scroll fallback), paper
  size cards are fully clickable via `htmlFor`/`id` and `w-full`, and the JD
  Match trigger is rendered through vaul's `Drawer.Trigger asChild` so the
  portal opens reliably with correct dialog ARIA wiring. Verified
  `npm run typecheck`, `npm test` (467 pass), `npm run lint`. Files:
  `src/components/editor/RichTextField.tsx` (+ test),
  `src/components/editor/SectionFormControls.tsx` (+ test),
  `src/components/editor/DesignPanel.tsx` (+ new test),
  `src/components/editor/EntryDrawer.tsx` (+ test),
  `src/components/editor/JdMatchDrawer.tsx` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-17 — Tidied the haphazard section controls and gave drawers an X:
  `SectionList` now puts Hide, Move up, Move down, Open section editor, and
  (for custom sections) Delete in one ordered `grid-cols-2 lg:grid-cols-3` with
  shared equal-width 44px buttons; `EntryDrawer` gained a fixed top-right
  **Close drawer** button next to the title that calls `onOpenChange(false)`
  while swipe-down and Escape keep working; `RichTextField` action-verb chips
  are compact (`min-h-9`, tighter padding/gap). Verified `npm run typecheck`,
  `npm test` (461 pass), `npm run lint`. Files:
  `src/components/editor/SectionList.tsx` (+ test), `EntryDrawer.tsx` (+ test),
  `RichTextField.tsx` (+ test), `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-17 — Fixed the multi-second freeze when opening a section editor
  (Summary, Profiles, Experience, and every other section): the expanded list
  row was mounting a second copy of the form behind the drawer, so a 12-entry
  Experience initialized 24 TipTap editors at once. `EditorWorkspace` now passes
  `openSectionId` to `SectionList`, which unmounts that row's inline form while
  the drawer owns it, and `RichTextField` memoizes its TipTap `extensions` and
  `editorProps` so `useEditor` no longer rebinds the view on every transaction.
  Verified `npm run typecheck`, `npm test` (458 pass). Files:
  `src/components/editor/EditorWorkspace.tsx`, `SectionList.tsx`,
  `RichTextField.tsx`, `SectionList.test.tsx`,
  `sectionEditorDrawer.test.tsx` (new), `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-17 — Kept the desktop Preview and Design columns in view while a long Content section scrolls: `panelClass()` in `EditorWorkspace` now opts those two tabpanels into `lg:sticky lg:top-[var(--header-height,3.5rem)] lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:overscroll-contain`, so each sticks under the header and scrolls on its own while Content keeps normal page flow. Mobile keeps the single-tab layout and the existing `lg:items-start` grid needed for sticky. Verified `npm run typecheck`, `npm test` (452 pass), `npm run lint`, `npm run build` (static export). Files: `src/components/editor/EditorWorkspace.tsx`, `src/components/editor/EditorWorkspace.test.tsx`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-17 — Restored page scrolling from a pinch-zoomed multi-page preview: `TouchPanCanvas` now clamps vertical drags to the library's `instance.bounds` and hands the leftover delta to the nearest page scroller once the canvas hits its top/bottom edge, so dragging down at the canvas top scrolls the editor back up to Reset and Save PDF instead of forcing a zoom-out. New `resolveVerticalPanHandoff` (pure), `findScrollableAncestor`/`scrollPageBy` (DOM), plus 16 tests. Verified `npm run typecheck`, `npm test` (451 pass), `npm run lint`. Files: `src/lib/zoom/canvasGestures.ts`, `src/lib/zoom/canvasGestures.test.ts`, `src/lib/zoom/touchScroll.ts`, `src/lib/zoom/touchScroll.test.ts`, `src/components/preview/TouchPanCanvas.tsx`, `src/components/preview/TouchPanCanvas.test.tsx`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-17 — Lifted the page-count pill and Reset out of the resume into a normal-flow `[data-canvas-toolbar]` row above the transform canvas, so preview chrome can never cover the candidate's name/header at any zoom level or paper size, and made a pinch-zoomed touch preview pan freely on both axes: `TouchPanCanvas` calls `panBy(deltaX, deltaY, 0)` past the 8px slop, `canvasTouchAction` returns `pan-y` at fit (page still scrolls) and `none` while zoomed (the browser cannot steal the vertical drag), and `hasClearedTouchSlop` replaces the old axis lock. `HorizontalTouchPan` is now a deprecated re-export shim. Verified `npm run typecheck`, `npm test` (435 pass), `npm run lint`. Files: `src/components/preview/LiveCanvasViewport.tsx`, `src/components/preview/LiveCanvasViewport.test.tsx`, `src/components/preview/TouchPanCanvas.tsx`, `src/components/preview/TouchPanCanvas.test.tsx`, `src/components/preview/HorizontalTouchPan.tsx`, `src/components/preview/HorizontalTouchPan.test.tsx`, `src/lib/zoom/canvasGestures.ts`, `src/lib/zoom/canvasGestures.test.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-17 — Replaced every native month picker with one fast Month + Year selector: new `MonthSelect` pairs a Jan–Dec select with a four-digit numeric year field on the shared white `min-h-11` surface, stores canonical `YYYY-MM`, offers a **Present** toggle on Experience and Education end dates (disabling the picker while current), and is wired through Experience, Education, Projects, Custom sections, Certifications, Awards, Publications, and Volunteer. The `TextInput` month branch is gone, so no browser year-scroll popup is reachable. Verified `npm run typecheck`, `npm test` (432 pass), `npm run lint`, `npm run build` (static export). Files: `src/components/editor/SectionFormControls.tsx`, `src/components/editor/SectionFormControls.test.tsx`, `src/components/editor/ProjectsForm.test.tsx`, `src/components/editor/ExperienceForm.tsx`, `src/components/editor/EducationForm.tsx`, `src/components/editor/ProjectsForm.tsx`, `src/components/editor/CustomSectionForm.tsx`, `src/components/editor/GenericSectionForm.tsx`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-17 — Gave every editor field a clear white input surface and readable hints: the `RichTextField` shell is now `bg-surface` with a `bg-surface-muted` toolbar strip and white TipTap area, `TextInput`/`MonthInput` placeholders use `text-muted` with `placeholder:opacity-100` (Firefox-safe) and disabled fields fall back to `bg-surface-muted`, hint text dropped the 60% opacity wash, entry cards are tinted so nested white inputs stand out, and the empty `.tiptap` placeholder now uses `--brand-muted` (5.5:1 on white). Verified `npm run typecheck`, `npm test` (424 pass), `npm run lint`, `npm run build` (static export). Files: `src/components/editor/RichTextField.tsx`, `src/components/editor/RichTextField.test.tsx`, `src/components/editor/SectionFormControls.tsx`, `src/components/editor/SectionFormControls.test.tsx`, `src/app/globals.css`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-17 — Aligned the launcher role-preset cards and fixed the tap blink: each preset row now stretches to a shared height, the odd 5th card (`Fresh Graduate`) spans both columns at `sm+`, and only the clicked preset shows a pending state (`aria-busy` + spinner) while siblings become `pointer-events-none` without the old all-buttons `opacity-60` dim. The disabled "Create resume from text" CTA now uses explicit disabled tokens (border, background, text) so its icon and label share the button surface. Verified `npm run typecheck`, `npm test` (418 pass), `npm run lint`. Files: `src/components/launcher/Launcher.tsx`, `src/components/launcher/launcher.test.tsx`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-17 — Made the pinch-zoomed preview pannable left/right on touch: a new `HorizontalTouchPan` axis-locks one-finger drags (8px slop, ties prefer page scroll) and moves the canvas with `panBy(deltaX, 0, 0)` only while the scale is above the fit scale. Vertical drags are never `preventDefault()`ed, so the editor keeps scrolling natively; lifting one finger of a pinch re-anchors the drag without a jump. Pinch, `touch-action: pan-y`, desktop wheel/drag, and the Reset-only chrome are unchanged. Verified `npm run typecheck`, `npm test` (415 pass), `npm run lint`, `npm run build` (static export). Files: `src/lib/zoom/canvasGestures.ts`, `src/lib/zoom/canvasGestures.test.ts`, `src/components/preview/HorizontalTouchPan.tsx`, `src/components/preview/HorizontalTouchPan.test.tsx`, `src/components/preview/LiveCanvasViewport.tsx`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-17 — Replaced the preview zoom/pan toolbar with pinch-to-zoom and one small floating reset control: the in-flow toolbar (live percentage, Fit, four pan arrows) is gone so the resume starts at the top of the pane; two-finger pinch now zooms while one-finger swipes still scroll the page, and a compact `Reset` pill appears only once the preview is zoomed. A pointer-transparent page-count chip floats over the page margin. Verified `npm run typecheck`, `npm test` (401 pass), `npm run lint`, `npm run build` (static export). Files: `src/lib/zoom/canvasGestures.ts`, `src/lib/zoom/canvasGestures.test.ts`, `src/components/preview/CanvasResetButton.tsx`, `src/components/preview/CanvasResetButton.test.tsx`, `src/components/preview/LiveCanvasViewport.tsx`, `src/components/preview/LiveCanvasViewport.test.tsx`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-17 — Added preview zoom and movement buttons for touch: the toolbar (zoom out / live percentage / zoom in / Fit and four bounds-aware pan arrows) is now visible at every width instead of desktop-only, with 44px mobile targets, disabled arrows while the page fits, and unchanged swipe-to-scroll and desktop wheel/drag behaviour. Verified `npm run typecheck`, `npm test` (395 pass), `npm run lint`, `npm run build` (static export). Files: `src/components/preview/CanvasControls.tsx`, `src/components/preview/CanvasControls.test.tsx`, `src/components/preview/LiveCanvasViewport.tsx`, `src/components/preview/LiveCanvasViewport.test.tsx`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-17 — Applied the home-page paper/navy theme to every page (shared `--brand-*` tokens, white panel cards, serif headings, warm borders, themed loading/empty/drawer/form/preview surfaces), collapsed the three trust capsules into one nowrap promise line, and made the editor header one `flex-nowrap` row where the resume name and Save PDF stay together on phones. Verified `npm run typecheck`, `npm test` (387 pass), `npm run lint`, `npm run build` (static export). Files: `src/app/globals.css`, `src/app/page.tsx`, `src/components/launcher/Launcher.tsx`, `src/components/launcher/launcher.test.tsx`, `src/components/editor/EditorWorkspace.tsx`, `src/components/editor/EditorWorkspace.test.tsx`, `src/components/editor/EditorLoading.tsx`, `src/components/editor/EntryDrawer.tsx`, `src/components/editor/MobileBottomNav.tsx`, `src/components/editor/SectionFormControls.tsx`, `src/components/editor/DesignPanel.tsx`, `src/components/preview/PrintTriggerButton.tsx`, `src/components/preview/AtsTextView.tsx`, `src/components/shared/ExportJsonButton.tsx`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-16 — Added opt-in action-verb chips (Built, Reduced, Led, Automated) and an `[Action] + [What] + [Result by X%]` prompt to `RichTextField`, enabled for Experience and Projects descriptions; chips insert the verb at the cursor, helpers are screen-reader linked, and tests cover hidden/enabled/insert behaviour. Verified `npm run typecheck`, `npm test` (386 pass), `npm run lint`. Files: `src/components/editor/RichTextField.tsx`, `src/components/editor/RichTextField.test.tsx`, `src/components/editor/ExperienceForm.tsx`, `src/components/editor/ProjectsForm.tsx`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-16 — Redesigned the home page around three obvious entry points: a warm paper/navy editorial hero with the `Resume Maker` wordmark as the only h1, a `Choose one way to start` heading above the launcher cards, icon-led cards with a filled paste action, a calmer PDF dropzone, scannable preset rows, and a muted `Backup & Restore` disclosure. The trust promises are now three separate icon pills whose labels never wrap mid-phrase. Verified `npm run typecheck`, `npm test` (383 pass), `npm run lint`. Files: `src/app/page.tsx`, `src/app/page.test.tsx`, `src/components/launcher/Launcher.tsx`, `src/components/launcher/launcher.test.tsx`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-16 — Reframed JSON as a secondary path: `/` now leads with Paste your resume, Upload a PDF, and Start from scratch, while JSON restore moved into a collapsed `Backup & Restore` disclosure that points to Download JSON backup in the editor; upload, backup, and preset errors are now separate. Verified `npm run typecheck`, `npm test` (381 pass), `npm run lint`. Files: `src/components/launcher/Launcher.tsx`, `src/components/launcher/launcher.test.tsx`, `src/app/page.tsx`, `src/app/page.test.tsx`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-16 — Added client-side PDF import: `pdfjs-dist` is lazy-loaded, its worker runs in-thread (no extra static asset or CDN), text items are rebuilt into lines and paragraphs, and the result feeds the existing paste parser. The launcher now accepts PDFs and explains unreadable or scanned files; `PDF_IMPORT_ENABLED` is on. Files: `src/lib/import/pdfResume.ts`, `src/lib/import/pdfResume.test.ts`, `src/types/pdfjs-worker.d.ts`, `src/components/launcher/Launcher.tsx`, `src/components/launcher/launcher.test.tsx`, `src/lib/features.ts`, `package.json`, `package-lock.json`, `README.md`, `CONTEXT.md`, `TASKS.md`.
- [x] 2026-11-16 — Moved the print “Headers and footers” reminder out of the header layout and into an absolutely positioned tooltip on Save PDF (hover/focus on desktop, tap-toggle info button on touch), so Undo/Redo/JSON/print stay on one aligned 44px row; the header title now lets the action group wrap as a unit instead of squeezing the name. Files: `src/components/preview/PrintTriggerButton.tsx`, `src/components/preview/PrintTriggerButton.test.tsx`, `src/components/editor/EditorWorkspace.tsx`, `README.md`, `CONTEXT.md`, `TASKS.md`.
- [x] 2026-11-16 — Added a Paste-to-Parse launcher card: pasted PDF/LinkedIn/other-tool text is split by section headings into Basics, summary, Experience, Education, and Skills, with contact/profile/website detection, month-normalized date ranges, rich-text bullets, and local tests. Files: `src/lib/import/pasteResume.ts`, `src/lib/import/pasteResume.test.ts`, `src/components/launcher/Launcher.tsx`, `src/components/launcher/launcher.test.tsx`, `README.md`, `CONTEXT.md`.
- [x] 2026-11-16 — Show a one-line touch print tip under Save PDF: on coarse pointers the editor header now says “Turn off ‘Headers and footers’ in the print dialog,” linked to the button with `aria-describedby`, so browser URLs and dates stay out of the PDF without adding desktop clutter. Files: `src/components/preview/PrintTriggerButton.tsx`, `src/components/preview/PrintTriggerButton.test.tsx`, `README.md`, `CONTEXT.md`.
- [x] 2026-11-16 — Added an optional one-line Work Auth / Notice Period tag to Basics: `basics.workAuth` defaults to empty, the form offers `Authorized to work in US` / `Immediate Joiner` one-tap chips (tap again to clear), and the header prints a compact seal-icon tag between location and website. The ATS contact line mirrors the same order. Files: `src/lib/schema/resume.schema.ts`, `src/components/editor/BasicsForm.tsx`, `src/components/editor/BasicsForm.test.tsx`, `src/templates/shared/HeaderSlot.tsx`, `src/templates/shared/AvatarSlot.test.tsx`, `src/templates/onyx/onyx.css`, `src/lib/ats/atsText.ts`, `src/lib/ats/atsText.test.ts`, `src/lib/schema/resume.schema.test.ts`, `README.md`, `CONTEXT.md`.
- [x] 2026-11-15 — Simplified contact inputs: a pasted profile URL now fills `network`, `username`, and `icon` from a known-host table (`github.com/ada` → GitHub), the manual `Icon` field is gone (kept as a hidden pass-through for imports), and the `Website label` input was removed in favour of a derived `example.com/path` label with a live hint. Hand-typed networks/usernames are preserved. Files: `src/lib/links/contactLinks.ts`, `src/lib/links/contactLinks.test.ts`, `src/components/editor/sectionFields.ts`, `src/components/editor/GenericSectionForm.tsx`, `src/components/editor/GenericSectionForm.test.tsx`, `src/components/editor/BasicsForm.tsx`, `src/components/editor/BasicsForm.test.tsx`, `README.md`.
- [x] 2026-11-15 — Custom sections can be created and deleted from SectionList, and standard section headings renamed: an inline Add custom section form appends to `customSections` plus `layout.pages[0].main`, a two-step Delete confirm strips the id from every page, and a debounced Section heading field updates standard/summary titles. Files: `src/components/editor/SectionList.tsx`, `src/components/editor/SectionList.test.tsx`, `README.md`, `CONTEXT.md`.

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
