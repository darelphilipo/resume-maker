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

### P1 — Remaining & Newly Uncovered UI/UX Fixes

- [ ] P1: Sync live `Name` edits (`onChange`) to the main Preview canvas and top editor header (`src/components/editor/BasicsForm.tsx`, `src/components/editor/EditorWorkspace.tsx`). Debounce-commit `basics.name` on `onChange` (e.g., 150ms) instead of waiting for `onBlur`, so the center resume header and top bar title update in real time alongside `NAME PREVIEW`.

- [ ] P1: Surface the **"Match to a job description"** trigger in the editor UI (`src/components/editor/EditorWorkspace.tsx`, `src/components/editor/JdMatchDrawer.tsx`). Wire a clear button in the Content panel header (or top toolbar) that opens `JdMatchDrawer` on both desktop and mobile, and add a Playwright check verifying clicking it opens the drawer and scores pasted JD keywords.

### P2 — Larger work
- [ ] P2: Support the open JSON Resume schema for import/export to avoid vendor lock-in.

## Done
<!-- Move completed items here with YYYY-MM-DD, 1-line summary, and files touched -->

- [x] 2026-11-19 — Fixed the Content-column scroll-to-top jump when reordering
  entries. All six entry forms already keyed their `EntryCard`s by `item.id`, so
  React moves the existing DOM nodes rather than remounting them; the remaining
  cause was the focus/scroll churn when the clicked Move button is reinserted
  (`activeElement` falls back to `body` and the nearest scroller can clamp to 0).
  The shared `EntryActions` now records the nearest scrollable ancestor's
  `scrollTop` and the clicked button before the move and restores both in a
  layout effect keyed on a local `moveTick`, re-focusing with `preventScroll` so
  the browser cannot jump the column. Added a `SectionFormControls` regression
  test (simulated scroll reset + blur) and an `ExperienceForm` case proving the
  reordered card keeps the same input node and the moved button stays focused.
  Verified `npm run typecheck`, `npm test` (583 pass), `npm run lint`. Files:
  `src/components/editor/SectionFormControls.tsx` (+ test),
  `src/components/editor/ExperienceForm.test.tsx`, `README.md`, `CONTEXT.md`,
  `TASKS.md`. (The Queue's accent-swatch item was a stale duplicate of the
  2026-11-19 Done entry and was removed.)

- [x] 2026-11-19 — Fixed clipped accent-color names in the Design panel. The
  swatch grid now stays `grid-cols-2` at every width (dropped `sm:grid-cols-3`,
  which gave ~100px cells inside the 20rem desktop sidebar), and each card wraps
  so the radio and color dot share one row while the full name renders on its
  own `w-full whitespace-nowrap` row with no `truncate` — so `Monochrome` and
  `Terracotta` are never cut off at 390px or on desktop. Added a `DesignPanel`
  unit test guarding the two-column grid and untruncated labels. Verified
  `npm run typecheck`, `npm test` (581 pass). Files:
  `src/components/editor/DesignPanel.tsx` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-19 — Fixed `Studio Sidebar` two-column pagination on multi-page
  resumes. Packing is one shared single-column sequence (`main` then `sidebar`),
  so a tall main column pushed `Skills`/`Certifications` onto a Page 2 whose main
  side was empty. `StudioSidebarTemplate` now gathers every sidebar block id
  across all pages and anchors them to Page 1's sidebar column (including split
  entry blocks); later pages carry only main-column overflow and render
  full-width through a new `studio-layout--full` CSS modifier, so no orphaned
  blank column remains. Added multi-page / full-width / no-sidebar unit tests and
  a CSS-rule guard. Verified `npm run typecheck`, `npm test` (580 pass),
  `npm run lint`. Files: `src/templates/studio/StudioSidebarTemplate.tsx`
  (+ test), `src/templates/studio/studio.css`, `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-19 — Fixed keyword-only `Skills` rows disappearing from Visual
  Preview. Visibility now treats a skills row as real content when either its
  category (`name`) or at least one non-empty keyword is present, through the
  shared `sectionData` resolver, the ATS text renderer, and the editor's
  `selectVisibleSectionIds`, so preview, measurement, ATS text, and editor state
  agree. `SkillEntry` omits the bold category `<h3>` when the category is blank
  and still renders keywords as pills or the comma list per `keywordLayout`.
  Added a parser + renderer integration test proving pasted unlabeled skill
  lists (`SKILLS` → `SQL, Excel` → `Python`) appear immediately. Verified
  `npm run typecheck`, `npm test` (578 pass), `npm run lint`. Files:
  `src/templates/shared/sectionData.ts`,
  `src/templates/shared/SectionRenderer.tsx` (+ test),
  `src/lib/ats/atsText.ts` (+ test), `src/lib/store/selectors.ts` (+ test),
  `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-19 — Finished the P2 Design-panel controls item: the template
  selector already existed, so this run added **accent color** (six curated
  swatches + monochrome), **font pairing** (Sans/Serif/Classic) and **density**
  (Compact/Normal/Relaxed) as mobile-first radio cards. New pure
  `designOptions.ts` owns the presets; the panel writes into existing fields
  (`design.colors.primary`, both `typography.*.fontFamily`, `page.gapX/gapY` +
  `body.lineHeight`, and a new `design.density` enum) so preview, measurement
  and print stay aligned with no new renderer. Verified `npm run typecheck`,
  `npm test` (574 pass), `npm run lint`. Files: `src/lib/design/designOptions.ts`
  (+ test, new), `src/lib/schema/resume.schema.ts` (+ test),
  `src/components/editor/DesignPanel.tsx` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-19 — Finished the P2 multi-viewport regression gate:
  `e2e/layout-consistency.spec.ts` now covers all seven listed behaviours at
  `390x844` and `1280x800`. Six were already present (preset height + no sibling
  blink, white TipTap fields, no `input[type=month]`, non-overlapping page-count
  badge, plain-wheel not hijacked by zoom, desktop Preview sticky); this run
  added the two gaps — a **multi-page pagination** case that imports 8 long
  Experience entries and asserts Page 1 keeps the heading, packs ≥2 entries,
  fills most of the page, and spills the rest onto later pages (guarding the
  80%-blank Page 1 bug), and an extension of the sticky case to assert **both**
  `#panel-preview` and `#panel-design` stay in viewport while Content scrolls.
  Verified `npm run typecheck`, `npm test` (567 pass). Playwright remains
  blocked in this sandbox, so the new cases are typechecked but browser-unverified.
  Files: `e2e/layout-consistency.spec.ts`, `TASKS.md`, `CONTEXT.md`.

- [x] 2026-11-19 — Finished the P1 editor micro-interactions item: Basics now
  shows a live **Name preview** that follows every keystroke and a picture
  thumbnail that swaps to a readable message when the URL cannot load; the
  resume header drops a broken avatar and lets the name use the full width.
  Action-verb chips prepend a space after non-whitespace (`...merges. Built `)
  instead of gluing words together. Sub-point 3 was already delivered on
  2026-11-17, so this run locked it in with a Studio Sidebar Page 1 test
  (main/sidebar markup plus the two-column stylesheet) and a both-viewport e2e
  geometry case; the existing DesignPanel and JdMatchDrawer tests already cover
  the full-card paper radios and drawer trigger. Verified `npm run typecheck`,
  `npm test` (567 pass), `npm run lint`. Playwright is still blocked in this
  sandbox, so the new `390x844` / `1280x800` case needs a browser-enabled run.
  Files: `src/components/editor/BasicsForm.tsx` (+ test),
  `src/components/editor/RichTextField.tsx` (+ test),
  `src/lib/richtext/actionVerbs.ts` (new) + test,
  `src/components/editor/EditorWorkspace.test.tsx`,
  `src/templates/shared/AvatarSlot.tsx` (+ test),
  `src/templates/shared/HeaderSlot.tsx`,
  `src/templates/studio/StudioSidebarTemplate.test.tsx` (new),
  `e2e/layout-consistency.spec.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-18 — Finished the P1 visual-consistency item: **Month + Year**
  pickers, white fields, and the sticky desktop Preview/Design columns had
  already landed (2026-11-17); this run closed the remaining narrow-column and
  reorder work. The `RichTextField` toolbar now wraps (`flex flex-wrap`) so all
  eight controls, including **Redo**, stay visible in the `22rem` Content column
  instead of hiding behind an invisible horizontal scroll strip; the TipTap
  surface breaks long words, and shared inputs carry `min-w-0` so intrinsic
  control widths cannot push a cell sideways. Moving a section up or down no
  longer throws the desktop Preview back to Page 1: new `usePreservedScroll`
  records the preview panel's offset and restores it after the re-measure
  placeholder clamps it to 0. Verified `npm run typecheck`, `npm test`
  (557 pass), `npm run lint`. Playwright remains blocked in this sandbox, so the
  new both-viewport toolbar-overflow case in
  `e2e/layout-consistency.spec.ts` is browser-unverified. Files:
  `src/components/editor/RichTextField.tsx` (+ test),
  `src/components/editor/SectionFormControls.tsx` (+ test),
  `src/components/preview/usePreservedScroll.ts` (new) + test,
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `e2e/layout-consistency.spec.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-18 — Finished the launcher item: **Start with a blank resume** and a
  Dexie-backed **Recent resumes** list (open, inline rename to `basics.name`,
  two-step delete) now live inside the existing "Start from scratch" card, so
  `/` still has exactly three entry regions. Added `listRecentResumes`,
  `deleteResume`, and `renameResume` to `src/lib/store/db.ts` plus a pure
  `recentResumes.ts` label/timestamp helper. Paste-to-parse now keeps
  `University of California, Berkeley` as one school (no invented location),
  recognises `Skills & Expertise`-style headings, and reads all-caps inline
  `SKILLS: Python, SQL` headings without mistaking title-case categories such as
  `Languages: ...` for a new section. Added a `data-preset-list` hook and
  narrowed the e2e preset selector so recent-resume buttons are not treated as
  preset cards. Verified `npm run typecheck`, `npm test` (553 pass),
  `npm run lint`. Playwright still cannot run in this sandbox. Files:
  `src/components/launcher/Launcher.tsx` (+ test),
  `src/lib/store/db.ts` (+ test, new), `src/lib/store/recentResumes.ts`
  (+ test, new), `src/lib/import/pasteResume.ts` (+ test),
  `e2e/layout-consistency.spec.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-18 — Fixed pinch-to-zoom resetting and the preview jitter/freeze:
  `FitTransform` re-applied `setTransform(0, 0, fitScale, 0)` from an effect
  keyed on `[fitScale, setTransform]`, but `react-zoom-pan-pinch`'s
  `useControls()` rebuilds every control closure on each render, so the first
  pinch frame snapped the canvas back to fit (and the aborted gesture left
  `touch-action: none`, so page scrolling worked only sometimes). Fit is now
  applied once per fit-scale change through the new `useFitTransform` ref guard,
  with a unit test proving an unrelated re-render does not re-fit. Verified
  `npm run typecheck`, `npm test` (532 pass). Playwright is blocked in this
  sandbox; a browser-enabled run should pinch, pan, and scroll a multi-page
  preview at `390x844` (`npm run e2e -- e2e/layout-consistency.spec.ts`). Files:
  `src/components/preview/useFitTransform.ts` (new) + test,
  `src/components/preview/LiveCanvasViewport.tsx`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-18 — Fixed the mobile `EntryDrawer` keyboard overlap and sideways
  scroll: `Drawer.Content` now sets `maxHeight: calc(95dvh -
  ${viewportOffset}px)` alongside the existing `bottom` keyboard lift, so
  focusing a field in a 95dvh sheet keeps the drag handle, title, and X on
  screen. The scrollable body and its children wrapper gained `min-w-0
  overflow-x-hidden` so wide TipTap fields and long URLs cannot create a
  horizontal scroll strip. Also repaired the stale `EditorWorkspace` preview
  test (it asserted `flex` while the Content tab was active, so the panel
  legitimately had `hidden`; it now taps Preview first). Verified
  `npm run typecheck`, `npm test` (528 pass). Playwright remains blocked in this
  sandbox; a browser-enabled run should check the sheet above a real keyboard at
  `390x844`. Files: `src/components/editor/EntryDrawer.tsx` (+ test),
  `src/components/editor/useVisualViewportOffset.test.ts`,
  `src/components/editor/EditorWorkspace.test.tsx`, `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-18 — Fixed mobile multi-page preview scrolling: the preview tab is
  now a fixed-height flex column (`<main>` is `flex flex-col`,
  `#panel-preview` is `flex min-h-0 flex-1 flex-col`) whose mode header and
  `PreviewChrome` (overflow banner + page-count/`Reset fit`/Reset pills) are
  `shrink-0` rows **outside** a dedicated `[data-canvas-scroll]`
  (`min-h-0 flex-1 overflow-y-auto overscroll-contain`), so pages are clipped at
  the chrome's bottom edge and the controls never scroll away.
  `TouchPanCanvas` gained an `isZoomed` prop and only attaches its non-passive
  `touchmove` listener while zoomed, so a fitted multi-page preview scrolls
  natively with `touch-action: pan-y` and no `scrollPageBy` hand-off. All new
  utilities are `lg:`-reverted, preserving the sticky desktop columns. Verified
  `npm run typecheck`, `npm test` (525 pass), `npm run lint`, `npm run build`
  (static export; the security-advisory nudge needed the usual second run).
  Playwright is blocked in this sandbox; a browser-enabled run should execute
  `npm run e2e -- e2e/layout-consistency.spec.ts` at `390x844` / `1280x800`.
  Files: `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `src/components/preview/TouchPanCanvas.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`.

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
