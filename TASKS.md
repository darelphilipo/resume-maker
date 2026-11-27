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

_empty

## Queue (Ready for Next Run)

- [ ] P1: Fix desktop zoom `+` button jumping under `Reset` on click and snap zoom steps to clean 25% increments (`src/components/preview/LiveCanvasViewport.tsx`, `src/components/preview/CanvasResetButton.tsx`).
  1. **Keep `- | % | +` anchored in place:** Render the conditional `Reset` button to the **left** of `[- | 100% | +]` (with `tabular-nums` and fixed `min-w-[3rem]` on the percentage readout) so `-` and `+` never shift a single pixel horizontally when `Reset` appears or disappears—preventing rapid `+` clicks from hitting `Reset`.
  2. **Clean symmetric zoom steps:** Step desktop `+` / `-` zoom in clean `25%` increments relative to `fitScale` (`100%`, `125%`, `150%`, `175%`, `200%`, `225%`) so zooming down lands directly on `100%` without a stray `102%` step.

- [ ] P1: Compact `Content` header pills (`Tidy` + `Match JD`) onto one row, redesign the bullet-check modal into scannable cards, and fix Indian `5+5` phone parsing (`src/components/editor/EditorWorkspace.tsx`, `src/components/editor/ResumeLintPopover.tsx`, `src/lib/import/pasteResume.ts`).
  1. **Single-row `Content` header (`EditorWorkspace.tsx`, `ResumeLintPopover.tsx`):** Rename `"Bullet polish"` to **`Tidy`** (modal title `"Tidy bullets"`, compact count badge `4`) and tighten both `Tidy` and `Match JD` to `h-8 text-xs px-2.5 whitespace-nowrap` so `Content`, `Tidy 4`, and `Match JD` sit on **one clean horizontal row** at `390px` with zero 2-row wrapping.
  2. **Card-based `Tidy bullets` modal (`ResumeLintPopover.tsx`):**
     - Replace the developer-facing intro (*"A deterministic check..."*) with plain copy (*"Quick local checks to tidy your bullets."*).
     - Wrap each category in a crisp bordered card (matching `Review tools`): put the **`Remove periods` / `Add periods`** buttons **directly inside** the `Mixed bullet periods` card at the top, and group repeated verbs into one compact card (`Collected ×2`, `Maintained ×2`, `Documented ×2`) with a clickable jump-to-entry link instead of long walls of quoted text.
  3. **Fix Indian `5+5` phone parsing (`pasteResume.ts`):** Update `PHONE_PATTERN` so `+91 63699 40501` (`+91` followed by `5+5` spaced digits) matches all 10 digits instead of stopping at 9 digits and leaking the trailing `1` into `basics.headline`.




- [ ] P1: Anchor `Visual | ATS` on the left of the Preview bar so it never jumps horizontally when `Review` badges change (`src/components/editor/EditorWorkspace.tsx`, `src/components/preview/LiveCanvasViewport.tsx`).
  1. Use `justify-between` in the Preview header bar so `[Visual | ATS]` stays anchored to a fixed left position (beside the `Preview` title on desktop, flush-left on mobile) while `N pages` / `Fit 1p` / `Review ▾` sit on the right—preventing `Visual | ATS` from sliding left/right when switching `Visual` ↔ `ATS` or toggling `Anonymize` / `6s Scan`.
- [ ] P1: Polish desktop 3-column proportions, Preview top alignment, and thin Windows scrollbars (`src/components/editor/EditorWorkspace.tsx`, `src/components/preview/LiveCanvasViewport.tsx`, `src/app/globals.css`).
  1. **Slim, subtle scrollbars (`globals.css`):** Add a reusable `.subtle-scroll` utility (`scrollbar-width: thin; scrollbar-color: rgba(30, 58, 95, 0.18) transparent;` plus `6px` `::-webkit-scrollbar` with transparent track and soft rounded thumb darkening slightly on hover) and apply it to the 3 desktop scrolling columns (`#panel-content`, `#panel-preview`, `#panel-design`) so Windows Chrome/Edge no longer displays 3 chunky gray scrollbar rails.
  2. **Widen center Preview & align top baseline (`EditorWorkspace.tsx`, `LiveCanvasViewport.tsx`):** Slightly trim the desktop sidebars (`lg:grid-cols-[20.5rem_minmax(0,1fr)_18rem]`) and outer horizontal padding so the center `Preview` gains ~70–90px of width and visually dominates the screen. Align the `Preview` header row to the exact same top vertical baseline as `Content` and `Design`, and tighten the vertical gap above Page 1 so the live resume starts higher and feels balanced with both sidebars.
### P2 — Parser, Fit Math & Review-Tools Polish

- [ ] P2: Polish `6s Scan` & `Trim tips` accuracy and Preview chrome (`src/lib/preview/scanMetrics.ts`, `src/lib/lint/bulletMetrics.ts`, `src/components/preview/LiveCanvasViewport.tsx`, `src/components/editor/ReviewMenu.tsx`).
  1. **`6s Scan` currencies & 1-tap exit (`scanMetrics.ts`, `LiveCanvasViewport.tsx`):** Support global currency prefixes (`$`, `₹`, `€`, `£`), Indian shorthand (`L`, `Cr`), and trailing `+` (`1,000+`, `11+`, `₹10L`, `₹2Cr`, `€500K`) in `METRIC_PATTERN`, and show a slim 1-line active bar above Visual Preview (*"6s Scan: showing what pops in a quick skim"*) with a compact **`Turn off`** button.
  2. **`Trim tips` accuracy & calm 1-page badge (`bulletMetrics.ts`, `ReviewMenu.tsx`):** Track words by match index instead of `!line.words.includes(word)` so repeated words on the same line aren't undercounted; scale `LINE_TOP_TOLERANCE_PX` proportionally to the active canvas scale (`Math.max(0.5, 2 * scale)`); fix `summarizeBulletIssues` so `> 3 lines` bullets under 240 chars say `"long bullets (4+ lines)"` and only count `reclaimableLines` when `lines > 3` or orphan-wrapped; and only show the yellow numeric badge on `Review ▾` when `pageCount > 1`.
- [ ] P2: Render a section heading when an overflowed `Studio Sidebar` entry spills onto Page 2 beneath a different section (`src/templates/shared/SectionRenderer.tsx`).
  1. When rendering a continuation entry block (e.g. `certifications:entry:4` spilling from Page 1's sidebar onto Page 2 after `awards`) whose `sectionId` differs from the immediately preceding block on that page, render its section heading (e.g. `Certifications` or `Certifications (cont.)`) so overflowed sidebar items never appear as entries under the previous section (`Awards`). Add a unit test covering a 5th certification overflowing from `Studio Sidebar` Page 1 onto Page 2 below `Awards`.

- [ ] P2: Rename `⋮ More` to `Export ▾` on desktop and fix the button's clipped hover/background box (`src/components/editor/EditorWorkspace.tsx`).
  1. Replace the fixed square width on desktop (`w-11 lg:w-auto lg:px-3 gap-1.5`) so the button's background, focus ring, and hover highlight cleanly wrap the full icon + label with balanced horizontal padding.
  2. Rename the desktop label from `"More"` to **`"Export"`** (with a subtle chevron `▾` or download/file icon, keeping the compact `⋮` icon on mobile `< lg`), and place a subtle divider above `"Clear sample data"` inside the menu so export actions stay cleanly grouped.

## Done
<!-- Move completed items here with YYYY-MM-DD, 1-line summary, and files touched -->

- [x] 2026-11-27 — Fit-to-1-page now keeps resumes larger and fuller, reclaims
  vertical margin, and releases itself. The fit curve uses a damped 0.72 height
  ratio instead of the linear ratio, the readable floor is
  `max(0.78, 8 / bodyFontSize)`, and `computeFitMarginY` scales the printed
  `--page-margin-y` down to a 32pt floor (never inflating the 12pt default)
  across preview, print, and the packing budget. `usePageLayout` reports
  `autoResetFit` once the fitted stack would fit at 100%, so `EditorWorkspace`
  drops the scale back automatically, and both Reset controls show the active
  percentage (`Reset fit (85% → 100%)`). Verified `npm run typecheck`,
  `npm test` (1233 pass, 107 files), `npm run lint`. Files:
  `src/lib/pagination/fitScale.ts` (+ test),
  `src/lib/pagination/usePageLayout.ts` (+ test),
  `src/templates/shared/templateTheme.ts`,
  `src/components/preview/PageStack.tsx`,
  `src/components/preview/PrintPortal.tsx`,
  `src/components/preview/LiveCanvasViewport*.test.tsx`,
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/editor/ReviewMenu.tsx` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-27 — Hardened PDF & paste parsing against real-world LaTeX, Word,
  Canva, and Indian resume edge cases. Sub-items 1–3 were already implemented in
  the tree from earlier checkpoints, so this run audited them and added the
  missing regressions: NFKC ligatures (`ﬁ`→`fi`), smart quotes/dashes,
  decorative bullets (`➢ ✓ ◆` → `•`), wide skill phrase gaps → `, `, PDF `Link`
  annotations (profile hosts only, `unsafeUrl` fallback, dedupe, non-`Link`
  skip), letter-spaced and parenthetical headings, `KEY PROJECT`,
  `ACHIEVEMENTS & EXTRACURRICULARS`, combined `CERTIFICATIONS & EDUCATION`
  routing, `2019–21`, season dates, `3 Months`, `Senior Engineer –Infosys`,
  `CGPA:7.6`, `12th –92.0%`, page-2 headerless bullets, and skill phrase gaps.
  Fixed the one real gap: NFKC decomposed the non-breaking hyphen (U+2011) to
  U+2010 before the wrap check, so `Soft\u2011` + `ware` never rejoined; the
  normalizer now preserves U+2011 around each NFKC segment. Verified
  `npm run typecheck`, `npm test` (1220 pass, 107 files), `npm run lint`. Files:
  `src/lib/import/pdfLayout.ts` (+ test),
  `src/lib/import/pdfResume.test.ts`, `src/lib/import/pasteResume.test.ts`,
  `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-27 — Closed the remaining `Anonymize` PII leaks. Review mode now
  redacts `awards.awarder` (its own `Organization A/B…` namespace), volunteer
  `organization`, and clears `picture.url` while forcing the picture hidden.
  A new longest-first, boundary-aware term map built from the document's own
  name/email/phone, employers, schools, volunteer organizations, and award
  issuers rewrites **text nodes only** in `summary.content` and every rich-text
  entry field, so prose like "at Wells Fargo" becomes "at Company A" while tags,
  attributes, and longer words (`Acmeology`) stay untouched; terms under 3
  characters are skipped and one combined alternation prevents re-scrubbing.
  Verified `npm run typecheck`, `npm test` (1198 pass, 107 files),
  `npm run lint`. Files:
  `src/lib/privacy/anonymizeDoc.ts` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-27 — Fixed `Bullet polish` period removal and tightened `Match JD`.
  `removeTrailingPeriod` now matches only a single final period with
  `(?<!\.)\.` and keeps the whole trailing closing-tag sequence in one capture
  group, so `<strong><em>Shipped APIs.</em></strong></p>` loses only the period
  and an ellipsis (`...`) is left untouched. `FIRST_PERSON_PATTERN` excludes
  `i.e.`, `I/O`, and Roman-numeral contexts (`Phase I`, `Part I`, `Section I`,
  …) while still flagging a real "I built". `Match JD` tokenizes slash-joined
  tech names (`CI/CD`, `UI/UX`, `TCP/IP`, `A/B`) as one keyword while splitting
  prose pairs such as `and/or`, no longer strips a plural `s` from dotted names
  (`node.js` no longer gains `node.j`), and drops degree/pay/equal-opportunity
  boilerplate (`bachelor`, `degree`, `equal`, `salary`, `benefits`, plus pronoun
  and `w/o`/`n/a` noise). Verified `npm run typecheck`, `npm test` (1194 pass,
  107 files), `npm run lint`. Files: `src/lib/lint/resumeLint.ts` (+ test),
  `src/lib/keywords/jdMatch.ts` (+ test), `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-26 — Closed the P0 blank-PDF fix: **Save PDF** from the mobile
  `Content`/`Design` tab now always captures a non-empty resume. `EditorWorkspace`
  renders `layout.measureLayer` once outside the `display: none` mobile tabs, so
  pagination measures immediately on editor load; `PrintPortal.printablePages()`
  falls back to `[HEADER_BLOCK_ID, ...selectVisibleSectionIds({ doc })]` when the
  page list is empty or every page is blank; `resumeDocumentTitle()` emits an
  ASCII-safe underscore slug (`Divya_Prakash_Resume`) guarded by
  `isPrintTitleActive()` so the editor title effect cannot stomp the PDF filename
  during the mobile spool grace. Unit tests and the 390×844 mobile e2e
  (Content tab → Save PDF without visiting Preview) cover it. This run verified
  the already-implemented tree end to end: `npm run typecheck` clean, `npm test`
  (1186 pass, 107 files), `npm run lint` clean. Files:
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx`,
  `src/components/preview/PrintPortal.tsx` (+ test),
  `src/lib/print/printDocument.ts` (+ test), `e2e/helpers.ts`,
  `e2e/mobile.spec.ts`, `e2e/print.spec.ts`, `README.md`, `CONTEXT.md`,
  `TASKS.md`. Playwright remains sandbox-blocked, so the mobile e2e and real
  Android spool filename are browser-unverified.

- [x] 2026-11-26 — Aligned the collapsed `Basics` row with the section cards and
  finished the homepage parity pass. In the Content panel, Basics now uses the
  same `min-h-11` row, `px-2 sm:px-3` padding, `gap-1`/`bg-background`/
  `border-black/10` surface as a section row, and a subtle `User` icon occupies
  the `⋮⋮` drag-handle width so `v Basics` lines up with `v Profiles` and
  `v Experience`; the `Basics` label is `shrink-0 whitespace-nowrap` while the
  candidate name keeps `min-w-0 truncate`, and Basics + `SectionList` share an
  8px `gap-2` wrapper so the gap below Basics matches the section gaps. (The
  row stays `min-h-11` = 44px, identical to the real section rows, rather than
  the queue's `min-h-[58px]`; the existing 44px regression stays green.) On the
  homepage, Recent Resume Delete buttons use the muted-red
  `text-red-700/80 hover:bg-red-50` cue, the title area reveals a subtle
  `Open →` arrow on row hover, `Target company` is a solid
  `border-[#e3ddd2]` field instead of dashed, and **Backup & restore** is
  sentence case with its icon in the same circular tinted badge as
  **Upload a PDF**. Verified `npm run typecheck`, `npm test` (1183 pass, 107
  files), `npm run lint`. Files:
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/launcher/Launcher.tsx` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`. Playwright remains sandbox-blocked, so the 390px row alignment
  and hover geometry are browser-unverified.

- [x] 2026-11-26 — Separated Preview status from actions and polished the review
  chrome. The page count (`1 page` / `2 pages`) is now borderless `text-muted`
  status text; a spilled resume gains a compact tinted **Fit 1p** pill with a
  compress icon, and an applied fit gains a tinted **Reset** pill, so the
  one-row bar stays short enough for **Review** at 390px. The active
  **Visual | ATS** segment now uses the Design panel's solid navy fill with
  white text. **Review tools** gives **Trim tips (N)** a right `›` chevron and
  hover tint, all four modal titles (`Bullet polish`, `Job description
  keywords`, `Review tools`, `Trim tips`) share the serif heading font, and
  **Fit to 1 page** uses sentence case. The header `⋮` trigger now reads
  **More** with an **Export & options** tooltip/name, and its items are
  **Download backup (.json)** / **Export JSON Resume**. Verified
  `npm run typecheck`, `npm test` (1182 pass, 107 files), `npm run lint`. Files:
  `src/components/preview/PageOverflowBanner.tsx` (+ test),
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/editor/ReviewMenu.tsx` (+ test),
  `src/components/editor/ResumeLintPopover.tsx` (+ test),
  `src/components/editor/JdMatchDrawer.test.tsx`,
  `src/components/preview/TrimTipsDialog.tsx` (+ test),
  `src/components/shared/ExportJsonButton.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`. Playwright remains sandbox-blocked, so the 390px
  row geometry is browser-unverified.

- [x] 2026-11-26 — Finished the Design panel micro-polish. The `Accent color`
  legend now shows the active swatch name inline (`Accent color · Indigo`), each
  swatch keeps its `title`/`aria-label`, and the swatch focus target is
  `rounded-full` so its ring matches the circular dot. The `Studio Sidebar`
  badge is now the short `Human review`, registry copy uses US spelling
  (`centered`, `Brand-colored`), `Classic` reads "Serif headings over sans-serif
  body.", and the `Design` heading pins at the top of its own desktop column
  while the options scroll underneath. Verified `npm run typecheck`, `npm test`
  (1182 pass, 107 files), `npm run lint`. Files:
  `src/components/editor/DesignPanel.tsx` (+ test),
  `src/templates/registry.ts` (+ test),
  `src/templates/shared/TemplateBadge.test.tsx`,
  `src/lib/design/designOptions.ts`,
  `src/components/editor/EditorWorkspace.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`. Playwright remains sandbox-blocked, so the real
  sticky/scroll geometry is browser-unverified.

- [x] 2026-11-26 — Closed the Page 2 consistency follow-up. `Anonymize` now
  redacts References `name` / `company` / `position` / `phone` / `email` with
  stable placeholders (blank values stay blank), so Visual, ATS, and print never
  leak reference contact details. The desktop Preview gained a floating
  `− | 100% | +` zoom pill (`hidden lg:flex`, bottom-right, fit-relative
  percentage, `Reset` while zoomed), while the mobile pinch + floating Reset is
  unchanged (`lg:hidden`). `Trim tips` now scrolls directly to the owning
  `RichTextField`, focuses it, and briefly highlights it instead of stopping at
  the section row. `6s Scan` keeps `p95`/`p99` latency tokens and `3.8 GPA`
  figures at full contrast. Verified `npm run typecheck`, `npm test` (1180 pass,
  107 files), `npm run lint`. Files:
  `src/lib/privacy/anonymizeDoc.ts` (+ test),
  `src/components/preview/CanvasZoomControls.tsx` (new, + test),
  `CanvasResetButton.tsx`, `LiveCanvasViewport.tsx` (+ test),
  `src/components/editor/SectionList.tsx` (+ test), `RichTextField.tsx`,
  `src/lib/preview/scanMetrics.ts` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`. Playwright remains sandbox-blocked, so the 390px/desktop zoom
  geometry and real focus scroll are browser-unverified.
- [x] 2026-11-26 — Finished the Page 2 section-consistency sweep. `Clear sample
  data` now requires both the `metadata.sampleData` flag and actual content in
  that section, and is gone entirely from custom sections, so newly revealed
  optional sections and imported/blank resumes never show a disabled clear-all.
  `SectionRenderer` strips scheme/`www.` from Project and custom URL labels via
  one shared `urlLabel` helper; Projects gained a `current` flag with an End-date
  **Present** toggle (mirrored in Visual, ATS, and sorting). Placeholders are
  now `Paste GitHub or LinkedIn URL` / `City, Country`, **Collapse all** counts
  and closes the Basics accordion too, `Match JD` shows one keyword per stemmed
  root, and the Languages level slider reads `None — Native`. Verified
  `npm run typecheck`, `npm test` (1172 pass, 106 files), `npm run lint`. Files:
  `src/components/editor/SectionFormControls.tsx` (+ test), `SectionList.tsx`
  (+ test), `EditorWorkspace.tsx` (+ test), `ProjectsForm.tsx` (+ test),
  `SummaryForm.tsx`, `ExperienceForm.tsx` (+ test), `EducationForm.tsx`,
  `SkillsForm.tsx`, `GenericSectionForm.tsx` (+ test), `CustomSectionForm.tsx`,
  `sectionFields.ts`, `src/templates/shared/SectionRenderer.tsx` (+ test),
  `allFieldsWiring.test.tsx`, `src/lib/schema/resume.schema.ts`,
  `src/lib/presets/archetypes.ts`, `src/lib/schema/jsonResume.ts`,
  `src/lib/import/pasteResume.ts`, `src/lib/keywords/jdMatch.ts` (+ test),
  `README.md`, `CONTEXT.md`, `TASKS.md`. Playwright remains sandbox-blocked, so
  the 390px layout is browser-unverified.
- [x] 2026-11-26 — Upgraded `RichTextField`: Link now opens an inline URL bar
  (Apply / Remove link, Enter/Escape) instead of `window.prompt`; all eight
  toolbar buttons stay on one row (32px fine-pointer targets, 40px touch targets
  in a nowrap scroll strip), `Writing helpers` starts collapsed, impact-formula
  chips start a new bullet at the end of a finished bullet via the pure
  `shouldStartNewBullet` guard plus `splitListItem("listItem")`, and every
  rich-text field has a visible label. Verified `npm run typecheck`, `npm test`
  (1163 pass, 106 files), `npm run lint`. Files:
  `src/components/editor/RichTextField.tsx` (+ test),
  `src/lib/richtext/bulletFormulas.ts` (+ test),
  `src/components/editor/ProjectsForm.tsx` (+ test),
  `src/components/editor/EducationForm.tsx` (+ test),
  `src/components/editor/GenericSectionForm.tsx` (+ test),
  `src/components/editor/CustomSectionForm.tsx` (+ new test), `README.md`,
  `CONTEXT.md`, `TASKS.md`. Playwright remains sandbox-blocked, so the 390px
  toolbar geometry and the real TipTap list split are browser-unverified.
- [x] 2026-11-26 — Closed the bookkeeping for the P1 homepage (`/`) polish. All
  four sub-items were already implemented in the tree from the prior checkpoint
  (single dashed Backup dropzone with *"Restore a single-resume JSON backup"* /
  *top-right menu* copy; instant-on-type-and-paste import CTAs with no colour
  fade; Recent Resume title hover cue plus spinner/`aria-busy` single-flight
  guard; compact **Preview prompt** disclosure below **Copy prompt**) with their
  regressions and README tour already updated, so this run verified them end to
  end and moved the item to Done. Verified `npm run typecheck`, `npm test`
  (1149 pass, 105 files). Files: `src/components/launcher/Launcher.tsx` (+ test),
  `README.md`, `CONTEXT.md`, `TASKS.md`. Playwright remains sandbox-blocked, so
  the 390px hover/pending geometry is browser-unverified.
- [x] 2026-11-26 — Finished the final mobile UX polish. The collapsed Basics
  header now reads Title Case at section-title weight; `EntryActions` is one
  nowrap row (icon-only eye/up/down left, labelled `Delete` right) and footer
  buttons never wrap their label mid-phrase; `ClearSectionButton` only renders
  for `metadata.sampleData` resumes, so imported/blank resumes no longer show a
  misleading clear-all; Education placeholders are region-neutral
  (`City, Country`, `3.8 GPA / 8.5 CGPA`); every clickable Trim tip shows a `›`
  chevron plus an active highlight, and the capped list gained a `Show all (N)`
  / `Show fewer` toggle. Added a Studio Sidebar regression proving a two-item
  `Awards` section with a positive measured height lands on Page 2. Verified
  `npm run typecheck`, `npm test` (1145 pass, 105 files). Files:
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/editor/SectionFormControls.tsx` (+ test),
  `src/components/editor/SectionList.tsx`,
  `src/components/editor/EducationForm.tsx` (+ test),
  `src/components/editor/ExperienceForm.test.tsx`,
  `src/components/preview/TrimTipsDialog.tsx` (+ test),
  `src/templates/studio/StudioSidebarTemplate.test.tsx`, `README.md`,
  `CONTEXT.md`, `TASKS.md`. Playwright remains sandbox-blocked, so the 390px
  geometry is browser-unverified.
- [x] 2026-11-26 — Retired the leftover `__scratch.test.ts` exploration harness by
  folding its two realistic 8-bullet Studio Sidebar (`gengar`) regressions into
  the existing `computePages` "narrow Page 1" describe. The moved cases reuse a
  shared `EIGHT_BULLETS` fixture, `studioEightBulletDoc(extraExperience)`, and a
  `fragmentHeights(fragments, first, rest)` helper, so the first role still fills
  the narrow main column and continues at a bullet boundary on full-width Page 2,
  and the following role still lands on Page 2 instead of a third page. The
  scratch file is now a comment-only stub excluded from Vitest discovery, the
  same pattern already used for `__explore.test.tsx` (file deletion is
  unavailable in this runner). Inbox and Queue were empty, so this run picked up
  the test-hygiene debt the 2026-11-24 checkpoint explicitly deferred. Verified
  `npm run typecheck`, `npm test` (1142 pass, 105 files), `npm run lint`. Files:
  `src/lib/pagination/computePages.test.ts`,
  `src/lib/pagination/__scratch.test.ts`, `vitest.config.ts`, `CONTEXT.md`,
  `TASKS.md`.
- [x] 2026-11-25 — Replaced the section-header `↑` / `↓` buttons with a touch-first
  `⋮⋮` drag handle plus the existing Hide eye, and matched the Basics header to
  the same uniform 44px row. The handle uses Pointer Events with guarded
  `setPointerCapture` and `touch-none`, shows drag/drop rings, and keeps
  `ArrowUp`/`ArrowDown` reorder for keyboards. New pure `sectionOrder.ts` moves
  visible ids while tucked optional rows keep their exact layout slot, so a drag
  never lands on a hidden row; the title/count pair truncates instead of
  overlapping at 390px. The implementation and tests were already in the tree
  from the prior checkpoint, so this run verified them end to end and closed the
  bookkeeping. Verified `npm run typecheck`, `npm test` (1142 pass). Files:
  `src/lib/editor/sectionOrder.ts` (new, + test),
  `src/components/editor/SectionList.tsx` (+ test),
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `e2e/layout-consistency.spec.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.
  Playwright remains sandbox-blocked, so the 390px header geometry is
  browser-unverified.

- [x] 2026-11-25 — Finished the final mobile micro-polish from the device review.
  Every `Font pairing` label now carries an explicit `font-sans` / `font-serif`
  class beside its inline family, so `Sans` can never inherit the serif Design
  heading at 390px. The Preview scroller returns to the top when switching into
  `ATS`, and the ATS intro caption gained its own `pt-1` + `leading-relaxed`, so
  a scrolled paper can no longer leave the first line clipped at the scroller's
  top edge. The `Other ways to import` AI accordion is now titled **Import via AI
  prompt** (no `scanne…` ellipsis) with *For scanned or Canva PDFs* as the first
  sentence inside the expanded panel. The old `Min 78%` notice was already gone
  from `Review tools` (it is a disabled `Fit to 1 Page` row with plain-English
  copy), so that sub-item was verified rather than re-changed. Verified
  `npm run typecheck`, `npm test` (1131 pass), `npm run lint`. Files:
  `src/components/editor/DesignPanel.tsx` (+ test),
  `src/components/preview/AtsTextView.tsx` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `src/components/launcher/Launcher.tsx` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`. Playwright remains sandbox-blocked, so the 390px geometry is
  browser-unverified.

- [x] 2026-11-25 — Finished the `Trim tips` click-through, `Match JD` stemming,
  and `ATS` / `Review` discoverability polish (the implementation was already in
  the tree; verified end to end and closed the bookkeeping). Every trim tip is
  now a button that closes the dialog, switches to **Content**, expands the
  owning section, and smooth-scrolls to the entry card; `BulletIssue` carries
  `sectionId`/`entryId` read from the preview DOM (`data-section-id` /
  `data-entry-id` on `SectionRenderer`), and every bullet-bearing form tags its
  `EntryCard` with the matching `editor-entry-<id>`. `jdMatch` normalizes `-ing`/`-ed`/`-s`/`-es` roots (with
  doubled-consonant and silent-e variants) only for plain alphabetic words and
  adds `high`, `improve`, `reduce`, `junior`, `looking`, and `strong` to the
  stoplist. The ATS toggle titles `Plain text & one-click Workday copy`, and the
  Review pill titles its trim count. Verified `npm run typecheck`, `npm test`
  (1129 pass). Files: `src/lib/lint/bulletMetrics.ts` (+ test),
  `src/components/preview/TrimTipsDialog.tsx` (+ test),
  `src/components/editor/ReviewMenu.tsx` (+ test),
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/editor/SectionList.tsx` (+ test),
  `src/components/editor/SectionFormControls.tsx`,
  `src/components/editor/ExperienceForm.tsx`,
  `src/components/editor/EducationForm.tsx`,
  `src/components/editor/ProjectsForm.tsx`,
  `src/components/editor/GenericSectionForm.tsx`,
  `src/components/editor/SkillsForm.tsx`,
  `src/components/editor/CustomSectionForm.tsx`,
  `src/templates/shared/SectionRenderer.tsx`,
  `src/lib/keywords/jdMatch.ts` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-25 — Finished the section-header / Profiles / sample-clear polish:
  compact `Hide` and `↑`/`↓` icon buttons now sit on every section header (with
  `stopPropagation`, so they never toggle expansion) and the footer keeps only
  the labelled drawer/delete actions. Profiles no longer shows a dead
  `Section heading` input, and the `Profile URL` placeholder now says
  `Paste GitHub or LinkedIn URL — auto-fills below`. Starter presets carry a
  `metadata.sampleData` flag, so the editor's `⋮` menu offers a one-click
  `Clear sample data` that empties sample basics, summary, and every standard or
  custom section in a single undoable `patchDoc`. Verified `npm run typecheck`,
  `npm test` (1118 pass), `npm run lint`. Files:
  `src/components/editor/SectionList.tsx` (+ test),
  `src/components/editor/sectionFields.ts`,
  `src/components/editor/GenericSectionForm.test.tsx`,
  `src/components/shared/ExportJsonButton.tsx` (+ test),
  `src/lib/schema/resume.schema.ts`, `src/lib/presets/archetypes.ts` (+ test),
  `src/lib/presets/clearSampleData.ts` (new, + test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-25 — Finished the final pre-freeze UX/bug polish: Save PDF now
  releases its pending state on `afterprint` or a short fallback timer instead
  of staying dimmed when a print dialog is suppressed; a fitted resume shows
  `1 page · Reset` inline in the Preview bar and shares one `resetFit()` with
  Review; review mode keeps public certification issuer domains (Credly, AWS,
  Scrum, Coursera) while stripping personal badge paths; a single-block Summary
  shows only its section Copy in the ATS view; and the header `⋮` has an
  "Export / Backup" tooltip plus a desktop "Backup" label. Verified
  `npm run typecheck`, `npm test` (1105 pass), `npm run lint`. Files:
  `src/components/preview/PrintTriggerButton.tsx` (+ test),
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/lib/privacy/anonymizeDoc.ts` (+ test),
  `src/components/preview/AtsTextView.tsx` (+ test),
  `src/components/shared/ExportJsonButton.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`. Playwright remains sandbox-blocked, so the 390px
  bar geometry is browser-unverified.

- [x] 2026-11-25 — Finished the OpenResume-grade PDF parsing upgrade: PDF import
  now feeds structured `PdfLine[]` (bold text, font sizes, line gaps, column
  breaks) into the paste parser, where pure weighted feature scoring picks the
  name, job title vs company, school vs degree vs grade, and project name vs URL.
  Bold/gap boundaries and `getDescriptionsLineIdx` keep unbulleted paragraphs and
  bold metrics out of entry headers; all 13 sections, the unlabelled summary,
  and single dates such as `Completed in 2018` are covered by new regressions.
  Verified `npm run typecheck`, `npm test` (1100 pass), `npm run lint`. Files:
  `src/lib/import/featureScoring.ts` (new, + test), `src/lib/import/pasteResume.ts`
  (+ test), `src/lib/import/pdfResume.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.
  Playwright remains sandbox-blocked; the new cases are pure/unit-level.

- [x] 2026-11-25 — Removed the `Min 78%` suffix from the Preview spill pill so
  the one-row bar cannot clip `Review ▾` at 390px. A blocked fit now shows only
  `2 pages`, and `Review` renders a disabled `Fit to 1 Page` control with the
  plain-English reason ("Too long to shrink to 1 page cleanly — trim a few lines
  or try Compact density") beneath its label. Dropped the unused
  `MIN_FIT_LABEL` helper. Verified `npm run typecheck`, `npm test` (1075 pass),
  `npm run lint`. Files: `src/components/preview/PageOverflowBanner.tsx`
  (+ test), `src/components/editor/ReviewMenu.tsx` (+ test),
  `src/components/editor/EditorWorkspace.tsx`,
  `src/lib/pagination/fitCopy.ts` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`. Playwright remains blocked here, so the 390px geometry is
  browser-unverified.

- [x] 2026-11-24 — Preserved rich PDF line metadata and moved layout into a
  pure, testable module. New `src/lib/import/pdfLayout.ts` owns
  `PdfTextItem` → `PdfPhrase` → `PdfLine`
  (`y`, `text`, `phrases`, `isBoldLine`, `maxFontSize`, `lineGap`, `joinNext`,
  `breakBefore`), font-name weight detection, transform-based font sizes, the
  character-weighted modal body `typicalCharWidth`, OpenResume-style phrase
  merging with punctuation attach/space rules (`Skills:Python` becomes
  `Skills: Python`, `SQL,SAP` becomes `SQL, SAP`), two-column
  banner/sidebar/main ordering, and soft-hyphen wrap merging. `pdfResume.ts`
  now builds each page's operator list before resolving `commonObjs` font
  names (try/catch fallback to the id), keeps
  `extractPdfText`/`groupPdfTextItems` byte-compatible, exposes
  `extractPdfLines`, and returns `lines` on `PdfResumeResult`. Verified
  `npm run typecheck`, `npm test` (1076 pass), `npm run lint`. Files:
  `src/lib/import/pdfLayout.ts` (new, + test),
  `src/lib/import/pdfResume.ts`,
  `src/components/launcher/launcher.test.tsx`, `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-24 — Redesigned the launcher around **Upload a PDF** and added a
  paste-based **AI prompt rescue import** for scanned/Canva PDFs. New pure
  `src/lib/import/aiJsonImport.ts` holds the copy-ready prompt plus a forgiving
  parser that strips markdown fences, surrounding prose, and trailing commas
  before delegating to `parseResumeJson`, with friendly empty/incomplete/invalid
  errors. `Launcher` now renders **Recent resumes** first when saved, **Upload a
  PDF** as the full-width `Recommended` hero, **Start from scratch** below it,
  and one quiet `role="group"` **Other ways to import** strip with collapsed
  Paste / AI prompt / Backup disclosures. The AI panel offers **Copy prompt**, a
  JSON-reply textarea, and **Import resume**; a scanned/unreadable PDF error
  links straight to it. Unit tests cover fences, prose, trailing commas,
  truncated and non-resume replies, the new hierarchy, the copy/paste flow, and
  the PDF error link. Verified `npm run typecheck`, `npm test` (1061 pass), and
  `npm run lint`. Files: `src/lib/import/aiJsonImport.ts` (new, + test),
  `src/components/launcher/Launcher.tsx` (+ test), `src/app/page.test.tsx`,
  `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-24 — `Profiles` rows with only a Network and Username now match the
  Basics "shown in the header" copy: known networks get a derived canonical link
  (`GitHub` + `ada` → `github.com/ada`, `LinkedIn` → `linkedin.com/in/ada`), an
  unknown pair renders inline as `Network: username`, and a network-only draft
  stays in the body. The shared `headerProfileLinks` decision keeps the header,
  ATS contact line, and omitted `PROFILES` section in sync. The Content list also
  allows several open accordions and shows a subtle **Collapse all** text button
  once 2+ are expanded. Verified `npm run typecheck`, `npm test` (1045 pass).
  Files: `src/lib/links/contactLinks.ts` (+ test),
  `src/templates/shared/HeaderSlot.tsx`, `src/templates/shared/AvatarSlot.test.tsx`,
  `src/templates/shared/SectionRenderer.test.tsx`, `src/lib/ats/atsText.test.ts`,
  `src/components/editor/SectionList.tsx` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-24 — Removed two stacked duplicates in the Preview tools: the
  `Review tools` dialog no longer repeats the *"Review mode is on..."* notice
  (the `EditorWorkspace` banner above the canvas is now the single one), and
  `AtsTextView` omits the inner per-entry `Copy` button when a section has just
  one entry whose text equals the section's own copy output (e.g. a headingless
  Summary), keeping the section-level button that copies the same text. The new
  pure `shouldHideEntryCopy(section)` guard leaves headed and multi-entry
  sections untouched. Added a dialog-no-duplicate-notice regression plus ATS
  cases for headingless single-block, headed, and headingless multi-entry
  sections. Verified `npm run typecheck`, `npm test` (1034 pass). Files:
  `src/components/editor/ReviewMenu.tsx` (+ test),
  `src/components/preview/AtsTextView.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-24 — Cleaned up the stray `__explore.test.tsx` test hygiene debt:
  merged its live-name publication regression into the existing
  `describe("BasicsForm")` suite (reusing `setup()` and the fake timers from
  `beforeEach`), so one suite now guards both the immediate callback and the
  debounced store commit. File deletion remains blocked by the runner's shell
  permissions, so `__explore.test.tsx` is now a comment-only deprecation stub
  explicitly excluded from Vitest discovery instead of an empty test file that
  would fail with "No test suite found". Verified `npm run typecheck`,
  `npm test` (1031 pass), `npm run lint`. Files:
  `src/components/editor/BasicsForm.test.tsx`,
  `src/components/editor/__explore.test.tsx`, `vitest.config.ts`, `TASKS.md`,
  `CONTEXT.md`.

- [x] 2026-11-24 — Locked in all five extreme-QA scenarios with a permanent
  regression gate. New `src/lib/extremeCases/extremeCases.test.tsx` covers the
  A4↔Letter page box + `@page` switch, a 90-char URL / 36 skills / 6
  certifications stress doc rendered through all six templates, blank and
  all-sections-hidden resumes (ATS, JD `0%`/no `NaN%`, bullet polish, scan,
  anonymize, JSON export), and malformed years/paste/broken picture URL.
  `computePages.test.ts` gained an 18-bullet single-entry split case that
  asserts Page 1 is filled, all bullets appear exactly once and `overflowPx`
  is zero. `e2e/layout-consistency.spec.ts` gained three browser-geometry
  cases (18-bullet split + print-portal clipping, A4↔Letter paper box/rule,
  stress overflow across all six templates) whose assertions are typechecked
  but browser-unverified here (Playwright sandbox-blocked). Verified
  `npm run typecheck`, `npm test` (1031 pass), `npm run lint`. Files:
  `src/lib/extremeCases/extremeCases.test.tsx` (new),
  `src/lib/pagination/computePages.test.ts`, `e2e/layout-consistency.spec.ts`,
  `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-24 — Filled `Studio Sidebar`'s wasted Page 1 lower-left gap when
  the first Experience role is mid-size. Finishing the prior In Progress
  checkpoint: `packPages` split only at ≥35% of a page, so a role that missed
  Page 1's remaining space moved whole and blanked a quarter of the narrow main
  column beside a full sidebar. It now also splits at a bullet boundary when
  moving the role whole would waste at least 25% of the page
  (`FRAGMENT_SPLIT_WASTED_PAGE_RATIO`) and at least two complete fragments fit
  (`FRAGMENT_SPLIT_MIN_FITTING_FRAGMENTS`), while Page 1 keeps narrow heights
  and Page 2+ uses the full-width measurements (no `computePages.ts` change was
  needed; it already forwards `fullWidthHeights`). Fixed the template
  regression's injected summary (620 → 700 on A4's ~1090px content box) so it
  actually misses the 320px entry, and repurposed the leftover
  `__scratch.test.ts` exploration harness — file deletion is unavailable in
  this runner — into live 8-bullet single-entry and following-entry `gengar`
  regressions with a note to fold them into `computePages.test.ts` later.
  Verified `npm run typecheck`, `npm test` (1022 pass), `npm run lint`. Files:
  `src/lib/pagination/packPages.ts` (+ test),
  `src/lib/pagination/computePages.test.ts`,
  `src/lib/pagination/__scratch.test.ts`,
  `src/templates/studio/StudioSidebarTemplate.test.tsx`, `README.md`,
  `CONTEXT.md`, `TASKS.md`. Playwright remains blocked here, so the browser
  geometry is unverified.

- [x] 2026-11-24 — A zoomed phone Preview no longer freezes at a page break:
  `LiveCanvasViewport` now threads the exact `[data-canvas-scroll]` element
  through `CanvasSurface` into `TouchPanCanvas` as `scrollRef`, so the vertical
  pan hand-off scrolls the real paper box instead of walking ancestors to a
  non-scrolling `<main>`. `scrollPageBy` accepts that preferred element (falling
  back to the ancestor walk for wide coarse-pointer tablets), and the
  `dampHandoffScroll` ramp is gone, so 100% of the leftover delta reaches
  `scrollTop` on the first at-bound move. The gesture also tracks its own
  `panPositionY`, so a lagging library position cannot re-pan instead of
  scrolling. Added a phone-shape 2-page bottom-bound regression, a
  lagging-position hand-off case, preferred-scroller/ancestor-fallback scroll
  tests, and a viewport wiring test; removed the obsolete ramp cases. Verified
  `npm run typecheck`, `npm test` (1015 pass), `npm run lint`. Files:
  `src/components/preview/LiveCanvasViewport.tsx`,
  `src/components/preview/TouchPanCanvas.tsx`,
  `src/components/preview/TouchPanCanvas.test.tsx`,
  `src/components/preview/LiveCanvasViewport.touchWiring.test.tsx` (new),
  `src/lib/zoom/touchScroll.ts` (+ test),
  `src/lib/zoom/canvasGestures.ts` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`. Playwright remains blocked here, so the real touch geometry is
  browser-unverified.

- [x] 2026-11-24 — Fixed the `Studio Sidebar` Page 2+ width mismatch so
  `AWARDS` packs into Page 2 instead of stranding on Page 3. Page 1 keeps the
  narrow `.studio-main`/`.studio-sidebar` heights, while `MeasureLayer` now
  reports a full-width copy of **every** Studio block (main + sidebar + entry
  fragments). New `packPages` `options.fullWidthHeights` swaps to those heights
  only once Page 1 is full, and `computePages` forwards the map (dropping the
  old per-overflow re-height mapping). Verified `npm run typecheck`, `npm test`
  (1014 pass), `npm run lint`. Files: `src/lib/pagination/packPages.ts`
  (+ test), `src/lib/pagination/computePages.ts` (+ test),
  `src/lib/pagination/usePageLayout.test.tsx`,
  `src/components/preview/MeasureLayer.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`. Playwright remains blocked here, so the browser
  geometry is unverified.

- [x] 2026-11-24 — `MonthSelect` now rejects impossible resume years instead of
  printing `0000`/`9999`. New pure `MIN_RESUME_YEAR` (1950), `MAX_RESUME_YEAR`
  (2100), and `isResumeYearInRange` in `src/lib/date/month.ts` gate every
  commit, so a complete out-of-range draft stays local with an amber
  `aria-invalid` + `aria-describedby` note ("Enter a year between 1950 and
  2100") and never reaches the store, preview, or PDF; blur and Enter restore
  the stored year and month. Added validator boundary/malformed cases and
  MonthSelect block/overlong/letters/partial-draft/blur/Enter regressions.
  Verified `npm run typecheck`, `npm test` (1009 pass), `npm run lint`. Files:
  `src/lib/date/month.ts` (+ test),
  `src/components/editor/SectionFormControls.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-24 — The Preview canvas no longer sticks flush-left with a gray
  gap on the right after switching templates or returning from another mobile
  tab. `useFitTransform` now takes a `resetKey` as part of its applied-fit key,
  so a template switch (same fit scale/offset) or a visibility epoch bump
  re-applies `setTransform(fitOffsetX, 0, fitScale, 0)`. `LiveCanvasViewport`
  passes `${doc.metadata.template}:${fitEpoch}`, records a `clientWidth === 0`
  measurement as hidden, and bumps the epoch when the stage is measured again —
  the zoom library clamps its stored position to 0 while the `display: none`
  panel is 0×0. Added hook reset-key/hidden/template cases and a viewport wiring
  test (template switch + hidden tab). Added a tall-tablet Playwright case that
  switches template from Design and asserts the equal left/right gaps on return.
  Verified `npm run typecheck`, `npm test` (985 pass), `npm run lint`. Files:
  `src/components/preview/useFitTransform.ts` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx`,
  `src/components/preview/LiveCanvasViewport.fitReset.test.tsx` (new),
  `e2e/layout-consistency.spec.ts`, `CONTEXT.md`, `TASKS.md`. Playwright remains
  blocked here, so the real browser geometry is browser-unverified.

- [x] 2026-11-24 — The print dialog now uses the paper size picked in **Design**.
  New pure `printPageSizeCss` / `printPageSizeLabel` helpers in `printDocument.ts`
  map `a4` → A4 and `letter` → Letter. `PrintPortal` injects a runtime
  `<style data-print-page-size>` inside `#print-portal` so its `@page { size: …;
  margin: 0mm; }` rule wins over the A4 fallback left in `print.css`; the
  coarse-pointer **Save PDF** tip now says `Set Paper size to A4/Letter` alongside
  the headers-and-footers reminder, covering Android dialogs that default to
  Letter and would clip a nearly-full A4 page. Added helper, portal-rule, and
  tooltip regressions plus README print guidance. Verified `npm run typecheck`,
  `npm test` (980 pass), `npm run lint`. Files: `src/lib/print/printDocument.ts`
  (+ test), `src/components/preview/PrintPortal.tsx` (+ test),
  `src/components/preview/PrintTriggerButton.tsx` (+ test),
  `src/styles/print.css`, `README.md`, `CONTEXT.md`, `TASKS.md`. The real
  print-dialog geometry is browser-unverified here (Playwright blocked).

- [x] 2026-11-24 — Tall single Experience/Project entries now split at bullet
  boundaries instead of overflowing Page 1 and clipping in PDF print. A pure
  `bulletSlices` parser splits one top-level rich-text list into prefix/bullets/
  suffix; `__fragment:` block ids, `bulletFragments` plans, and `planMeasureKeys`
  let `MeasureLayer` measure every fragment and `buildPackBlocks` attach them to
  the whole entry. `packPages` splits only when a block cannot fit and is ≥35% of
  a page (or taller than a page), keeping the first fragment's header (and the
  section heading) and charging no page gap between fragments. `SectionRenderer`
  merges consecutive fragments, fringes the prefix/suffix, and renders later
  pages as headerless `.resume-entry-continuation` blocks. Preview and
  `@media print` share the same measured pages, so no bullet is clipped and Page
  1 never starts blank. Added fragment parser/id/planner/packer/computePages/
  MeasureLayer/SectionRenderer regressions. This run finalized the prior
  checkpoint by fixing one test-only TypeScript narrowing error in
  `sectionPlans.test.ts`. Verified `npm run typecheck`, `npm test` (972 pass),
  `npm run lint`. Files: `src/lib/richtext/bulletSlices.ts` (new, + test),
  `src/lib/pagination/{blockIds,sectionPlans,packPages,computePages,index,usePageLayout}.ts`
  (+ tests), `src/components/preview/MeasureLayer.tsx` (+ test),
  `src/templates/shared/SectionRenderer.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`. Playwright remains blocked here, so the real
  print/PDF split is browser-unverified.

- [x] 2026-11-23 — Cleared the last standing lint debt in the Preview viewport.
  Both Inbox and Queue were empty, so this run picked up the five
  `react-hooks/preserve-manual-memoization` errors that earlier Done notes kept
  deferring in `LiveCanvasViewport`. The four manual `useCallback` wrappers
  (`handleTransform`, `resetScroll`, `resetZoom`, `resetFit`) are now plain
  closures: they only feed `onTransform`, the Reset pill, or the imperative
  handle, so identity churn costs nothing, while the current-render
  `fitScale`/`fitOffsetX` reads keep a reset accurate after a resize. The
  imperative handle now relies on its default re-create-per-render behaviour.
  No behaviour or markup changed, so the existing reset/zoom/imperative-handle
  regressions cover it. Verified `npm run typecheck`, `npm test` (947 pass), and
  `npm run lint` (now clean, 0 errors). Files:
  `src/components/preview/LiveCanvasViewport.tsx`, `CONTEXT.md`, `TASKS.md`.
- [x] 2026-11-23 — Capped the Studio Sidebar's Page 1 side column and made
  `Save as PDF` print exactly the measured pages. `computePages` now splits
  pinned sidebar blocks and packs them against
  `contentHeight - headerHeight - gap`: only blocks that fit stay in `pages[0]`,
  and the rest join the main flow on Page 2+ (forced off Page 1 when the main
  column left room). A new optional `fullWidthHeights` record lets those
  spilled blocks be packed at the width they actually render.
  `StudioSidebarTemplate` reads the aside from `pages[0]` only, so a later-page
  sidebar block renders full-width instead of re-growing Page 1.
  `MeasureLayer` renders a hidden full-width copy of every sidebar block
  (`FULL_WIDTH_MEASURE_PREFIX` in `sidebarSections.ts`), and `usePageLayout`
  forwards those heights and computes the Studio fit height as
  `header + max(mainColumn, sidebarColumn)` rather than the sum. Finally,
  `@media print .resume-page` now has fixed
  `height`/`max-height: var(--page-height)` plus `overflow: hidden`, so mm/pt
  rounding can no longer fragment a packed page into a blank Page 1. Added
  sidebar-cap/overflow/full-width packing cases, a fit-max regression, the
  MeasureLayer full-width copy, template aside ownership and full-width spill
  tests, and a print-CSS contract. Verified `npm run typecheck`, `npm test`
  (947 pass). Files: `src/lib/pagination/computePages.ts` (+ test),
  `src/lib/pagination/usePageLayout.ts` (+ test),
  `src/components/preview/MeasureLayer.tsx` (+ test),
  `src/templates/studio/StudioSidebarTemplate.tsx` (+ test),
  `src/templates/studio/sidebarSections.ts`, `src/styles/print.css`,
  `README.md`, `CONTEXT.md`, `TASKS.md`. Playwright remains blocked here, so
  the visual/PDF check is browser-unverified.

- [x] 2026-11-23 — Stopped the Studio Sidebar stranding trailing main sections on
  a nearly empty extra page. `computePages` no longer packs sidebar-routed
  blocks in the shared main sequence: with `pinnedToFirstPage` set (gengar
  only), `packWithPinnedBlocks` splits them out, packs the main column with the
  full page budget, and appends every pinned block to Page 1 in canonical order
  (keeping the ids in `pages` so the template still finds them via
  `pages.flat()`). The interleaved default order no longer lets Skills and
  Certifications eat Page 2's budget and push Awards to Page 3. Updated the
  pinned-block `computePages` cases and added a gengar `usePageLayout`
  regression plus a multi-page `StudioSidebarTemplate` render test (Experience,
  Education, Skills, Certifications, Awards) asserting exactly two pages with
  Awards on Page 2 and the sidebar only on Page 1. Verified `npm run typecheck`,
  `npm test` (942 pass). Files: `src/lib/pagination/computePages.ts` (+ test),
  `src/lib/pagination/usePageLayout.test.tsx`,
  `src/templates/studio/StudioSidebarTemplate.test.tsx`, `README.md`,
  `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-23 — Wrapped the resume in the gray Preview backdrop and floated
  the zoom **Reset** so the one-row Preview bar never crowds **Review**. The
  new `canvasDeskHeight(stackHeightPx)` helper in `canvasFrame.ts` adds both
  `py-3` paddings (`CANVAS_SCROLL_PADDING_PX * 2`) to the scaled page-stack
  height, so `[data-canvas-desk]` starts above Page 1's edge and ends below the
  last page at every paper size and page count without becoming a full-panel
  void. `CanvasResetOverlay` renders the zoomed Reset as a pointer-transparent
  `absolute bottom-3 right-3 z-20` sibling of the scroller inside
  `LiveCanvasViewport`, which now owns the zoom bit locally; the lifted
  `onZoomChange` prop and `canvasZoomed` state were removed from
  `EditorWorkspace`. Added desk-height/padding helper cases, overlay placement
  and zoom-reset regressions, a mode-bar-without-Reset assertion, and a
  desktop-sheet geometry case that checks the desk wraps both paper edges.
  Verified `npm run typecheck`, `npm test` (939 pass). Files:
  `src/lib/pagination/canvasFrame.ts` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `src/components/preview/CanvasResetButton.tsx` (+ test),
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `e2e/layout-consistency.spec.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.
  Playwright remains blocked here, so the e2e case is browser-unverified;
  `npm run lint` still reports five pre-existing
  `react-hooks/preserve-manual-memoization` errors in `LiveCanvasViewport.tsx`
  (they persist with the original `onZoomChange` code, so they are not new).

- [x] 2026-11-23 — Collapsed the Preview chrome to one row and moved `Trim
  tips` / `Fit` / `Reset fit` into **Review**. The mode bar now holds only
  `Visual | ATS` (visible label short, `aria-label="ATS text"`), a quiet
  `1 page` label or one inline `PageOverflowBanner` pill (`2 pages · Fit` /
  `2 pages · Min 78%`, full reason in `title` + sr-only copy), a conditional
  `Reset` pill while zoomed, and the **Review** pill. `ReviewMenu` gained
  `Trim tips (N)` (opens the new `TrimTipsDialog`), `Fit to 1 Page`, and
  `Reset fit`, plus a trim-count badge and a reduced-fit dot. `LiveCanvasViewport`
  no longer renders `PreviewChrome`/`CanvasToolbar`: it reports
  `onBulletReport` / `onZoomChange` upward and exposes `resetZoom` / `resetFit`
  through `LiveCanvasViewportHandle`, while `EditorWorkspace` owns both states
  and the single `applyFitScale` patch. Shared `Min 78%` / blocked-fit copy
  lives in `src/lib/pagination/fitCopy.ts`. Added mode-row/no-second-row,
  Review trim/fit/reset/badge, pill, ref-reset, and workspace conditional-Reset
  regressions. Verified `npm run typecheck`, `npm test` (930 pass),
  `npm run lint`. Files: `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/editor/ReviewMenu.tsx` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `src/components/preview/PageOverflowBanner.tsx` (+ test),
  `src/components/preview/TrimTipsDialog.tsx` (+ test, new),
  `src/lib/pagination/fitCopy.ts` (new),
  `e2e/layout-consistency.spec.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.
  Playwright remains blocked here, so the updated e2e case is
  browser-unverified.

- [x] 2026-11-23 — Decluttered `Writing helpers` and kept the PDF filename alive.
  Removed the four duplicate single-word verb pills (**Built / Reduced / Led /
  Automated**) and the now-unused `actionVerbInsertion` helper, so the strip
  shows only the four impact-formula scaffolds. Each formula chip is now a
  `block w-full text-left` button inside a `flex flex-col` group, so wrapped
  lines align to the chip's left edge instead of indenting behind the bold verb.
  A new pure `resumeDocumentTitle(name)` returns `{name} - Resume` (or
  `Resume Maker` when blank), and `EditorWorkspace` keeps `document.title`
  synced to the displayed name through a `useEffect` covering live typing and
  **Anonymize**, restoring `Resume Maker` on unmount. That removes the Android
  Chrome async-print-spooler default filename; the slugified print title and its
  1200 ms coarse-pointer grace remain. Added formula-only/alignment/collapse,
  title-helper, and live/anonymized/unmount title regressions. Verified
  `npm run typecheck`, `npm test` (931 pass), `npm run lint`. Files:
  `src/components/editor/RichTextField.tsx` (+ test),
  `src/lib/richtext/actionVerbs.ts` (+ test),
  `src/lib/richtext/bulletFormulas.ts`,
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/lib/print/printDocument.ts` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-23 — Decluttered the Preview chrome and gave the resume page equal
  breathing room. The mode bar now holds only `Visual | ATS text`, an inline
  quiet **"1 page"** label when the resume fits, and one **Review** pill
  (`ReviewMenu.tsx`) whose `CenteredModal` contains the `6s Scan` and
  `Anonymize` switches with an `aria-hidden` active dot. Spilled resumes render
  one slim `[data-preview-header]` strip combining the count, `~N lines`,
  **Fit to 1 Page**, and **Trim tips (N)** instead of the tall yellow box plus a
  duplicate count row. `[data-canvas-scroll]` gained `py-3` and desktop-only
  `lg:[scrollbar-gutter:stable]`, and `LiveCanvasViewport` derives
  `centeredCanvasOffsetX` from the scroller's stabilized content width so left
  and right margins match. Updated the docked-chrome e2e case and added
  ReviewMenu, one-page label, slim-strip, gutter/padding, and centring
  regressions. Verified `npm run typecheck`, `npm test` (930 pass),
  `npm run lint`. Files: `src/components/editor/ReviewMenu.tsx` (+ test, new),
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `src/components/preview/PageOverflowBanner.tsx` (+ test),
  `e2e/layout-consistency.spec.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.
  Playwright remains blocked here, so the updated e2e case is browser-unverified.

- [x] 2026-11-23 — Upgraded the paste-import header, contact, date, location, and
  entry-block heuristics in `src/lib/import/pasteResume.ts`. A wrapped,
  unlabelled >120-char multi-sentence opening paragraph now becomes the summary
  when no Summary heading exists, and missing email/phone/profile URLs are
  recovered from the full text. Blank PDF paragraph gaps between bullets no
  longer split one role into several; `isDateAnchor` splits undated multi-role
  blocks, `Company as Title` overrides the generic header order, single dates
  (`Completed in 2018`, `Expected May 2027`, `Apr 2026`, `2014`) map to the
  correct start/end field, and locations accept `Bengaluru, Karnataka, India`
  and standalone global cities. Added three resume-archetype fixtures plus
  fallback, paragraph-gap, single-date, `Bengaluru` degree-abbreviation, and
  `+44` phone-prefix regressions. Verified `npm run typecheck`, `npm test`
  (922 pass), `npm run lint`. Files: `src/lib/import/pasteResume.ts` (+ test),
  `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-23 — Wired every remaining paste-import section and expanded
  `SECTION_ALIASES` in `src/lib/import/pasteResume.ts`. `parsePastedResume`
  now emits projects, certifications, awards, languages, interests, volunteer,
  publications, and references (profiles were already read from the header)
  instead of dropping recognised content. A `PROFILES` section is merged with
  the header links and de-duplicated. Compact sections share
  `splitCompactEntryBlocks` (blank blocks, all-bullet lists, then date/URL/
  separator-led lines) and `extractSingleDate` accepts `(2023)` / `Mar 2024`
  dates. New aliases cover `certifications & awards` / `certifications and
  awards`, `courses & certifications`, `education background`, internships,
  extracurricular headings, and contact blocks; `hard skills` / `soft skills`
  map through internal keys so `parseSkills` keeps the heading as the row
  category. `splitKeywords` treats every bullet glyph as a separator, so
  three-column `Python • SQL • Tableau` lines become individual keywords. Added
  full multi-section, hard/soft-skills, inline-bullet, and alias/contact
  regressions. Verified `npm run typecheck`, `npm test` (915 pass),
  `npm run lint`. Files: `src/lib/import/pasteResume.ts` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-23 — Added two-column PDF detection and broken-glyph cleanup to
  PDF import. Every extracted item drops Private Use Area icon glyphs and
  zero-width characters (PUA-only items disappear), and a trailing soft hyphen
  (`\u00AD`) or replacement glyph (`\uFFFD`) marks a wrapped word/URL whose next
  line is rejoined without a space; mid-word glyphs are simply removed.
  `detectColumnGutter` scores candidate x-gutters from empty vertical bands plus
  item end→next-start pairs (so a full-width banner covering the empty band is
  still handled), and accepts one only when each side owns ≥30% of the page's
  lines, both sides' line starts cluster, and the right side's starts cluster at
  least as tightly as its right edges — the last rule rejects single-column
  resumes with right-aligned dates. Accepted pages are emitted as full-width
  banner lines, then the left column, then the right column, each top-to-bottom
  with its own paragraph gaps, and a line with items on both sides is split so
  sidebar skills never interleave with Experience. Added PUA/zero-width,
  soft-hyphen/replacement-char, banner + exact two-column order,
  unaligned-column, and right-aligned-dates regressions. Verified
  `npm run typecheck`, `npm test` (911 pass), `npm run lint`. Files:
  `src/lib/import/pdfResume.ts` (+ test), `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-23 — Compacted the **Design** panel into segmented rows and a
  circular accent strip. **Paper size**, **Font pairing**, and **Density** no
  longer stack six tall full-width radio cards: each choice is one short
  `bg-surface-muted` track of flex-1 `min-h-9` segments
  (`pointer-coarse:min-h-11`) whose checked segment is a solid primary fill, and
  the card descriptions moved to `title` tooltips. Font labels still render in
  their own typeface. The eight accent cards became a
  `grid-cols-4 sm:grid-cols-8` strip of 28px circles; the color name lives on the
  label `title` and the radio `aria-label`, and the active circle wears a primary
  ring plus a centered white checkmark. Every `sr-only` radio stays inside a
  `relative` label, so mobile focus cannot scroll the locked shell. Updated the
  mobile shell-lock e2e to tap `label[for="accent-rose"]` since the swatch has no
  visible text (browser-unverified here). Verified `npm run typecheck`,
  `npm test` (906 pass), `npm run lint`. Files:
  `src/components/editor/DesignPanel.tsx` (+ test),
  `e2e/layout-consistency.spec.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-23 — Collapsed **Basics** by default and quietened the editor
  toolbars. The Content panel now opens with a compact **Basics** accordion
  (collapsed, showing the resume name) whose optional work-auth, website, and
  profile-link fields sit behind one **More contact details** disclosure; the
  **Picture URL** input disappears whenever **Hide picture** is checked, so
  Summary, Experience, Projects, Education, and Skills are visible immediately.
  In the header, **Save PDF** is the only filled CTA and JSON export moved to a
  quiet **⋮** backup menu beside it. **Bullet polish** and **Match JD** now share
  one muted pill treatment (`contentHeaderAction.ts`), and a hairline divider in
  the Preview toolbar separates `Visual | ATS text` from `6s Scan` and
  **Anonymize**. Updated the Profiles shortcut drawer test and e2e helpers to
  open the new disclosures. Verified `npm run typecheck`, `npm test` (906 pass),
  `npm run lint`. Files: `src/components/editor/BasicsForm.tsx` (+ test),
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/editor/contentHeaderAction.ts` (new),
  `src/components/editor/ResumeLintPopover.tsx` (+ test),
  `src/components/editor/JdMatchDrawer.tsx`,
  `src/components/editor/sectionEditorDrawer.test.tsx`,
  `src/components/shared/ExportJsonButton.tsx` (+ test),
  `src/components/launcher/Launcher.tsx` (+ test), `e2e/a11y.spec.ts`,
  `e2e/flow.spec.ts`, `e2e/helpers.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-23 — Made all six starter presets fit one page and gave
  **Recent resumes** its own home-page section. Every sample now stays within a
  one-page budget (two-sentence summary, two project bullets, three experience
  bullets): Product Manager lost its third summary sentence and two third
  project bullets, and the other five presets lost their third project bullet
  and any third summary sentence. **Recent resumes** moved out of the "Start
  from scratch" card into a standalone `<section aria-labelledby="launcher-recent-heading">`
  rendered only when saved rows or a list error exist, so the page still has
  exactly three primary regions before anything is saved and four once a resume
  is saved; the empty "Nothing saved yet" copy is gone. The hero dropped the
  header "Private by default" pill and the repeated "No account, no AI, no cost"
  sentence, leaving the single three-promise row as the only trust statement.
  Added archetype content-budget cases, launcher standalone/hidden-recent
  regressions, the single-trust page assertion, and a Playwright loop that opens
  all six presets and asserts the `1 page` pill (browser-unverified here).
  Verified `npm run typecheck`, `npm test` (900 pass), `npm run lint`. Files:
  `src/lib/presets/archetypes.ts` (+ test),
  `src/components/launcher/Launcher.tsx` (+ test), `src/app/page.tsx` (+ test),
  `e2e/flow.spec.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-22 — Fixed `Bullet polish` left-edge clipping and the `Match JD`
  two-click `X` close. A new shared `CenteredModal` portals short dialogs to the
  body and centres a `max-w-md` `role="dialog"` panel that closes on backdrop,
  X, or Escape; `ResumeLintPopover` now uses it at every width instead of the
  `absolute right-0` popover that clipped off the left edge of the narrow Content
  column on desktop. `JdMatchDrawer` keeps its non-snapped Vaul bottom sheet on
  phones but switches to a centred modal at `lg` via a mobile-first
  `useIsDesktop` hook, so one tap on X closes outright with no snap point to
  collapse back to; both paths share one `JdMatchBody`. Added modal, hook,
  clipping-contract, backdrop, and one-tap-close regressions. Verified
  `npm run typecheck`, `npm test` (892 pass), `npm run lint`. Files:
  `src/components/shared/CenteredModal.tsx` (+ test, new),
  `src/lib/responsive/useIsDesktop.ts` (+ test, new),
  `src/components/editor/ResumeLintPopover.tsx` (+ test),
  `src/components/editor/JdMatchDrawer.tsx` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-22 — Deduplicated promoted profile links and paginated Recent
  resumes. When every visible profile has a usable URL, the header contact line
  is now the only place it prints (visual preview and ATS text both skip the
  redundant Profiles section and add those links to the ATS contact line);
  **Manage profiles** in Basics now expands and smooth-scrolls to the Profiles
  card instead of opening a drawer. Dates accept a bare four-digit year
  (`2018` → `2018 — 2019`) in the Month + Year picker and DateRange, and Impact
  Formula chips get a real gap between the bold verb and placeholder. Recent
  resumes now page five at a time with **Prev** / **Page 1 of N** / **Next**,
  resetting to page 1 when the status filter changes. Added regressions for
  promoted/URL-less profiles, year-only dates, and pagination helpers. Verified
  `npm run typecheck`, `npm test` (883 pass), `npm run lint`. Files:
  `src/lib/links/contactLinks.ts`, `src/templates/shared/HeaderSlot.tsx`,
  `src/templates/shared/SectionRenderer.tsx` (+ test),
  `src/lib/ats/atsText.ts` (+ test),
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/editor/SectionList.tsx`,
  `src/components/editor/SectionFormControls.tsx` (+ test),
  `src/components/editor/RichTextField.tsx`, `src/lib/date/month.ts` (+ test),
  `src/templates/shared/DateRange.test.tsx`,
  `src/lib/store/recentResumes.ts` (+ test),
  `src/components/launcher/Launcher.tsx` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-22 — Compacted the mobile Preview chrome and made `ATS text` a
  single scroll area. The redundant `Preview` heading is hidden below `lg`, and
  `Visual | ATS text`, `6s Scan`, and `Anonymize` now share one compact
  `h-8 text-xs px-2.5` row that scrolls sideways without a visible scrollbar
  (new `.no-scrollbar` utility) instead of wrapping into stacked rows. The canvas
  root trims to `px-2 py-2` on phones (`lg:p-4`), `PreviewChrome` mirrors that
  bleed, and the page-count, `Trim tips`, `Reset fit`, and `Reset` pills form
  one compact `h-8` toolbar row. `AtsTextView` drops its inner
  `max-h-[70vh] overflow-auto` box, so the `Copy all` bar and every section
  scroll together in the Preview panel's single scroller. Added compact-row,
  padding, pill, and ATS no-nested-scroller regressions. Verified
  `npm run typecheck`, `npm test` (874 pass), `npm run lint`. Files:
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `src/components/preview/AtsTextView.tsx` (+ test),
  `src/components/preview/PageOverflowBanner.tsx`,
  `src/components/preview/CanvasResetButton.tsx` (+ test),
  `src/app/globals.css`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-22 — Added **open JSON Resume import/export** so resumes are
  portable outside Resume Maker. New pure `src/lib/schema/jsonResume.ts` detects
  JSON Resume files, maps every standard section into `ResumeDocument`
  (`highlights`/`courses` → bullets, ISO dates → `YYYY-MM`, missing end date →
  current), and maps a document back out with `YYYY-MM-01` dates, prose +
  `highlights`, and only visible sections/entries. `parseResumeJson` detects the
  standard format first, so the existing **Backup & Restore** picker imports it
  with no new UI. The editor's JSON header control is now a compact two-item menu
  (**Resume Maker backup** / **JSON Resume**) with Arrow-key, Escape, and
  outside-tap support, keeping one 44px action. Design, layout, custom sections,
  and other non-standard fields stay in the full backup. Verified
  `npm run typecheck`, `npm test` (870 pass), `npm run lint`. Files:
  `src/lib/schema/jsonResume.ts` (+ test, new),
  `src/lib/schema/serialize.ts` (+ test),
  `src/components/shared/ExportJsonButton.tsx` (+ test),
  `src/components/launcher/Launcher.tsx` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-22 — Turned the `RichTextField` writing hint into **tappable
  Zero-AI XYZ/STAR impact-bullet formulas**. The collapsible **Writing helpers**
  strip now opens with four fill-in chips (`Reduced [metric] by [X%] by
  [action]`, `Built [feature/system] for [N] users, improving [outcome]`,
  `Led [team/project] to deliver [result]`, `Automated [workflow], saving
  [N] hrs/wk`) instead of a static `[Action] + [What] + [Result by X%]`
  paragraph. A new pure `BULLET_FORMULAS` / `bulletFormulaInsertion` module
  inserts the full bracketed skeleton at the cursor with the shared leading-space
  rule, so the user only replaces placeholders; the existing verb chips keep
  their own compact row, so the strip does not gain another stacked row. Added
  formula data/insertion and component chip/insertion/spacing/collapse
  regressions. Verified `npm run typecheck`, `npm test` (850 pass),
  `npm run lint`. Files: `src/lib/richtext/bulletFormulas.ts` (+ test, new),
  `src/lib/richtext/actionVerbs.ts` (+ test),
  `src/components/editor/RichTextField.tsx` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-22 — Added **Application Status & Target Company tags** to
  **Recent resumes** on `/`. Saved rows now carry optional `status`
  (`master` | `draft` | `applied` | `interview` | `offer`) and `targetCompany`
  fields outside the resume document, so JSON backups stay portable and legacy
  Dexie rows read as **Master** with no company tag. Each recent row shows a
  status pill that is also a quick native selector, plus a compact editable
  target-company field; both stop row-click propagation, so tagging never opens
  the resume. When 2+ resumes exist, a compact **All / status (count)** filter
  row narrows the list, hiding statuses with no rows and falling back to All if
  the active status empties. `updateResumeMeta` deliberately leaves `updatedAt`
  alone (tagging is not an edit and must not reorder the list), while a new
  `saveResumeDoc` read-merge-writes every autosave so editor saves cannot erase
  the tags; duplicates inherit them. Added pure helper/default/filter cases, db
  meta + save/duplicate preservation cases, a store autosave regression, and
  Launcher tracking/filter interactions. Verified `npm run typecheck`,
  `npm test` (843 pass), `npm run lint`. Files:
  `src/lib/store/resumeTracking.ts` (+ test, new), `src/lib/store/db.ts`
  (+ test), `src/lib/store/useResumeStore.ts` (+ test),
  `src/components/launcher/Launcher.tsx` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-22 — Promoted **Profiles links into the resume header**. The new
  pure `profileHeaderLink` / `headerProfileIcon` helpers in `contactLinks.ts`
  reuse the existing `sections.profiles` rows (no `basics.links` duplicate),
  build a cleaned `label` from `websiteLabelFromUrl` (`https://` / `www.`
  stripped), an absolute `href` from `externalLinkHref`, and a curated icon:
  GitHub, GitLab, LinkedIn, Stack Overflow, X/Twitter, Dribbble, Behance, Medium,
  or DEV when the host or saved icon matches, otherwise a globe. `HeaderSlot`
  renders those visible, non-hidden links inline in the contact line after the
  website, with the existing separators and `hideIcons` still respected; the
  Profiles section and ATS text stay unchanged, so ATS output is not duplicated.
  `BasicsForm` gained a compact **Profile links** row whose **Manage profiles**
  button opens the existing Profiles drawer through `EditorWorkspace`, so there
  is still one editor and one data source. Updated `allFieldsWiring` for the
  second (header) profile link and added helper, HeaderSlot, BasicsForm, and
  drawer-shortcut regressions. Verified `npm run typecheck`, `npm test`
  (819 pass), `npm run lint`. Files: `src/lib/links/contactLinks.ts` (+ test),
  `src/templates/shared/HeaderSlot.tsx`, `AvatarSlot.test.tsx`,
  `src/components/editor/BasicsForm.tsx` (+ test),
  `src/components/editor/EditorWorkspace.tsx`,
  `src/components/editor/sectionEditorDrawer.test.tsx`,
  `src/templates/shared/allFieldsWiring.test.tsx`, `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-22 — Added **Grouped Promotions** to Experience. A section-level
  **Group promotions at the same company** checkbox writes
  `sections.experience.groupSameCompany` (default false, so existing saved rows
  stay flat) through one undoable `patchDoc`. A new pure
  `groupExperienceItems` groups only *consecutive* visible roles whose
  normalized company matches (trim/collapse/lowercase; blanks never join),
  unions unique locations, and builds the combined span from the earliest start,
  latest end, and any current role. `SectionRenderer` renders one
  `.resume-company-group` header (company + location + combined dates) with each
  promoted role keeping its own title, dates, bullets, and
  `resume-entry-keep-together`; a single role keeps the normal entry layout. All
  six templates share that renderer. Pagination now plans one measured/packed
  block per company group through `SectionPlan.blocks` and
  `encodeEntryGroup`, so a header can never separate from its roles;
  `decodeBlock` still accepts single-entry ids. ATS text is unchanged and
  linear. Added helper, renderer, form, planner, block-id, and ATS regressions.
  Verified `npm run typecheck`, `npm test` (808 pass), `npm run lint`. Files:
  `src/lib/experience/groupExperience.ts` (+ test, new),
  `src/lib/schema/resume.schema.ts`,
  `src/components/editor/ExperienceForm.tsx` (+ test),
  `src/templates/shared/SectionRenderer.tsx` (+ test),
  `src/templates/onyx/onyx.css`, `src/lib/pagination/blockIds.ts` (+ test),
  `src/lib/pagination/sectionPlans.ts` (+ test),
  `src/lib/pagination/index.ts`, `src/lib/ats/atsText.test.ts`, `README.md`,
  `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-22 — Added **one-click "Sort newest first"** and inline **date
  sanity warnings** to the dated sections. The pure
  `sortEntriesNewestFirst(items)` orders current/Present roles first, then by
  the latest effective end month (`endDate`, falling back to `startDate`), then
  by `startDate`, keeping completely undated entries last and preserving ties.
  `isNewestFirst` hides the compact shared **Sort newest first** button unless
  2+ entries are out of order; the Experience, Education, and Projects forms
  commit the new order through the existing debounced `patchDoc`, so one Zundo
  undo restores it. `MonthSelect` gained an amber, `aria-describedby`-linked
  `warning` caption, and `dateRangeWarning` shows **"End date is earlier than
  start date"** for non-current reversed ranges (blank, Present, and equal
  ranges stay quiet). Added pure helper cases plus Experience, Education,
  Projects, and MonthSelect regressions. Verified `npm run typecheck`,
  `npm test` (786 pass), `npm run lint`. Files:
  `src/lib/date/sortEntries.ts` (+ test, new),
  `src/components/editor/SectionFormControls.tsx` (+ test),
  `src/components/editor/ExperienceForm.tsx` (+ test),
  `src/components/editor/EducationForm.tsx` (+ new test),
  `src/components/editor/ProjectsForm.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-22 — Added the **6-Second Recruiter Scan** preview lens. A
  session-only **6s Scan** pill beside **Anonymize** dims body prose to a 28%
  colour mix while keeping the name, headline, section headings, job titles,
  companies, dates, `<strong>` spans, and numeric metrics (`$1.2M`, `40%`, `3x`,
  plain counts) at full contrast. The pure `highlightScanMetrics` helper wraps
  metric runs in `.scan-metric` spans without touching tags, attributes,
  entities, or digits inside words. The flag threads from `EditorWorkspace`
  through `LiveCanvasViewport` → `PageStack` → templates → `SectionRenderer`
  via `ScanHighlightContext`; `PrintPortal` and `MeasureLayer` never set it, so
  the PDF and measurements are unchanged. Added helper, renderer, page-stack,
  viewport-forwarding, toolbar-toggle, and print-safety tests. Verified
  `npm run typecheck`, `npm test` (768 pass), `npm run lint`. Files:
  `src/lib/preview/scanMetrics.ts` (+ test, new),
  `src/templates/shared/scanHighlightContext.tsx` (new),
  `src/templates/shared/SectionRenderer.tsx` (+ test),
  `src/templates/onyx/OnyxTemplate.tsx`,
  `src/templates/studio/StudioSidebarTemplate.tsx`,
  `src/templates/registry.ts`, `src/components/preview/PageStack.tsx` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `src/components/preview/preview.css`,
  `src/components/preview/PrintPortal.test.tsx`,
  `src/components/editor/EditorWorkspace.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-22 — Fixed one-click drawer close, right-edge date clipping, and
  entry-location leaks in Anonymize. The shared drawer X now renders inside
  Vaul's `Drawer.Close`, so a single tap runs the internal close path and resets
  the active snap point instead of leaving the sheet on a minimized bar; the
  compact Match JD sheet still opts out of snap points. Fit-to-width now uses
  the pure `computeWidthFitScale` helper, reserving the usual 32px preview
  padding plus a 12px right-edge safety margin, so right-aligned dates never
  clip after rounding or a scrollbar transition. `anonymizeResumeDoc` replaces
  non-blank experience/education/volunteer/custom-item locations with
  `ANONYMIZED_ENTRY_LOCATION` while blanks and absent optional values stay
  unchanged. Added drawer close/reopen regressions, fit-margin cases, viewport
  expected-scale wiring, and location redaction/ATS/immutability tests. Verified
  `npm run typecheck`, `npm test` (758 pass), `npm run lint`. Files:
  `src/components/editor/EntryDrawer.tsx` (+ test),
  `src/components/editor/JdMatchDrawer.test.tsx`,
  `src/lib/pagination/fitScale.ts` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `src/lib/privacy/anonymizeDoc.ts` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-22 — Stopped `Enter` in the `MonthSelect` year field from
  resetting the Content column. The year input now handles Enter, calls
  `preventDefault()` so the surrounding section `<form>` cannot implicitly
  submit (the cause of the scroll-to-top jump), commits a complete `YYYY-MM`
  value, and restores the stored year for an incomplete draft before blurring.
  The Launcher Paste half was already delivered on 2026-11-20; its existing
  change/paste enablement test was re-run instead of duplicating the fix. Added
  two `MonthSelect` regressions (valid Enter prevents submit and commits;
  incomplete Enter restores the stored year). Verified `npm run typecheck`,
  `npm test` (750 pass). Files:
  `src/components/editor/SectionFormControls.tsx` (+ test), `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-22 — Fixed `Match JD` whole-word matching and stray empty bullets.
  JD keywords are compared as complete tokens (never `String.includes`), so
  `rust` cannot match `trust` and `react` cannot match `reactive`; leading-dot
  tech names stay `.net`, match the `asp.net` suffix without matching bare
  `net`, and `hiring` is filtered as boilerplate. A new pure
  `stripEmptyListItems` removes `<li><p></p></li>` / whitespace-only / `<br>`-only
  items from the inside out and runs in `SectionRenderer` (Visual Preview and
  `PrintPortal`) plus `richTextToPlainText` for ATS text, without mutating the
  saved document. Added JD boundary/tech-token cases, helper cases, preview
  summary/entry coverage, print portal coverage, and an ATS empty-bullet case.
  Verified `npm run typecheck`, `npm test` (748 pass), `npm run lint`. Files:
  `src/lib/keywords/jdMatch.ts` (+ test),
  `src/lib/richtext/stripEmptyListItems.ts` (+ test, new),
  `src/templates/shared/SectionRenderer.tsx` (+ test),
  `src/lib/ats/atsText.ts` (+ test),
  `src/components/preview/PrintPortal.test.tsx`, `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-22 — Fixed Studio Sidebar + Compact pagination clipping the main
  column. `MeasureLayer` now renders the active template's real root class and
  `buildTemplateThemeStyle` variables, and routes `gengar` blocks through the
  same `.studio-layout` main/sidebar grid as the preview, so the narrow main
  column's line wraps are measured instead of the full page width. Empty sidebar
  plans still report zero and the grid collapses to `studio-layout--full` when
  no sidebar section has content. Shared `templateRootClassName`,
  `studioSectionIdOf`, and `isStudioSidebarBlock` helpers keep measurement and
  rendering in sync; packing needed no new mode because unpinned main overflow
  already keeps its own page. Added MeasureLayer tests for variant root/theme
  variables, Studio column routing, and the full-width fallback, plus a registry
  test that renders all six templates against the root-class map. Verified
  `npm run typecheck`, `npm test` (735 pass), `npm run lint`. Files:
  `src/components/preview/MeasureLayer.tsx` (+ test),
  `src/templates/shared/templateRoot.ts` (new),
  `src/templates/registry.test.tsx`,
  `src/templates/studio/sidebarSections.ts`,
  `src/templates/studio/StudioSidebarTemplate.tsx`, `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-21 — Made the bullet helpers mobile-safe and quieter. The
  Content-header **Check** trigger is now a quiet text button named **Bullet
  polish** (muted/amber text, no competing border), and its panel opens as a
  viewport-clamped overlay (`fixed inset-x-4` with a `lg:absolute lg:right-0`
  popover at desktop) with an explicit **Close bullet polish** X, so it can no
  longer clip off the left edge on phones or in the 22rem column. **Trim tips**
  no longer expands inline inside the `shrink-0` preview chrome: it is now a
  compact toolbar pill that opens a dismissible `role="dialog"` sheet with a
  clear X and Escape-to-close, leaving the resume preview fully accessible. The
  yellow spill banner no longer repeats the trim summary (the panel owns it),
  and the range formatter now reads `"1 word"` instead of `"1–1 word"` when the
  orphan max is one. Verified `npm run typecheck`, `npm test` (731 pass),
  `npm run lint`. Files: `src/components/editor/ResumeLintPopover.tsx` (+ test),
  `src/components/editor/EditorWorkspace.test.tsx`,
  `src/components/preview/PageOverflowBanner.tsx` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `src/lib/lint/bulletMetrics.ts` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-21 — Stopped the Preview canvas from "dancing". The fit scale and
  centring offset are derived from the observed stage width, so a scrollbar
  appearing narrowed the canvas, which hid the scrollbar again in an endless
  feedback loop. `#panel-preview` (desktop) and `[data-canvas-scroll]` (phones)
  now reserve the scrollbar space with `[scrollbar-gutter:stable]`, and a new pure
  `stabilizeObservedWidth` guard locks an A/B/A width alternation within 24px /
  150ms to the smaller width until a genuine resize releases it, so `setTransform`
  stops flipping between two scales and X offsets. Added 11 pure guard cases, a
  driven-`ResizeObserver` regression that alternates 326/311px and asserts the
  frame height and applied transform settle, plus gutter-class contracts for both
  scrollers. Verified `npm run typecheck`, `npm test` (727 pass), `npm run lint`.
  Files: `src/lib/zoom/stableWidth.ts` (+ test, new),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `src/components/editor/EditorWorkspace.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-21 — Added the **Zero-AI Resume Lint & one-click bullet period
  normalizer**. A compact **Check** popover sits beside **Match JD** in the
  Content header. A new pure `resumeLint.ts` walks the visible layout through
  `resolveSection` (hidden sections/entries excluded) and collects every
  rich-text bullet, flagging mixed trailing periods, first-person pronouns,
  filler adverbs, and repeated opening verbs within one role, with up to three
  opening-word snippets per finding. The same module exposes
  `standardizeBulletPeriods(doc, "add" | "remove")`, which clones the document,
  preserves inline markup, leaves `? ! ; :` endings alone, and returns a new
  doc; the popover commits it through `setDoc`, so one Zundo undo restores the
  original prose. The badge shows `Check (N)` in amber when findings exist and a
  quiet **Check** when clean; the panel closes on outside tap or Escape. Verified
  `npm run typecheck`, `npm test` (713 pass), `npm run lint`. Files:
  `src/lib/lint/resumeLint.ts` (+ test, new),
  `src/components/editor/ResumeLintPopover.tsx` (+ test, new),
  `src/components/editor/EditorWorkspace.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-21 — Added the **Orphan-Line & Bullet-Length Catcher**.
  `src/lib/lint/bulletMetrics.ts` measures the rendered preview `li` line
  boxes word by word, flags a wrapped bullet whose final line holds 1–3 words
  (one reclaimable line), and flags bullets that reach 240+ characters or run
  past three lines. `LiveCanvasViewport` scans the active page stack after each
  document/layout change and passes the report to the Preview chrome: a concise
  summary appears in the overflow banner when the resume spills, and a compact
  collapsible **Trim tips** popover in the toolbar lists the first five bullets
  with a plain-language reason and the opening words. No AI, no network, and no
  document mutation. Verified `npm run typecheck`, `npm test` (696 pass),
  `npm run lint`. Files: `src/lib/lint/bulletMetrics.ts` (+ test, new),
  `src/components/preview/PageOverflowBanner.tsx` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-21 — Fixed the tall/tablet Preview layout and bottom-nav gap.
  The fitted canvas is now centred with a transform X offset
  (`centeredCanvasOffsetX`) that survives resets and re-centres when only the
  leftover width changes; the preview stage is transparent and a
  `[data-canvas-desk]` backdrop is exactly as tall as the page frame, so a
  one-page resume no longer sits above a full-panel gray void. The mobile nav
  caps its safe-area padding at `min(env(safe-area-inset-bottom), 20px)`, and
  short Content/Design cards get balanced vertical space plus a `max-w-3xl`
  tablet cap (`lg` resets). Added unit coverage for the nav class, panel
  classes, centring helper, fit offset, and desk height, plus a `1023×1600`
  Playwright geometry case. Verified `npm run typecheck`, `npm test` (675 pass),
  `npm run lint`; Playwright remains blocked here, so the e2e case is
  typechecked but browser-unverified. Files:
  `src/components/editor/MobileBottomNav.tsx` (+ test),
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `src/components/preview/useFitTransform.ts` (+ test),
  `src/lib/pagination/canvasFrame.ts` (+ test),
  `e2e/layout-consistency.spec.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-21 — Locked the mobile editor shell so tapping Design accent
  cards (**Rose**) can no longer jump the bottom nav into mid-screen. The root
  wrapper is now `fixed inset-0 h-dvh … lg:static lg:h-dvh`, so the document
  cannot scroll and `<main>` remains the only mobile scroller; every Design
  option card and both Launcher file dropzones are `relative`, anchoring their
  clipped `sr-only` inputs so focus cannot scroll an ancestor; and
  `MeasureLayer` is a fixed `0×0 overflow-hidden` shell with an inner
  `contentWidthPx` Onyx column, so re-measuring never contributes document
  height while real widths (and the zero-width skip guard) are preserved. Added
  a `390x844` Playwright case that taps **Rose** and asserts `window.scrollY ===
  0`, no document overflow, and the mobile nav's bottom edge flush with
  `window.innerHeight`. Verified `npm run typecheck`, `npm test` (667 pass),
  `npm run lint`. Playwright remains blocked here, so the new e2e case is
  typechecked but browser-unverified. Files:
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/editor/DesignPanel.tsx` (+ test),
  `src/components/launcher/Launcher.tsx` (+ test),
  `src/components/preview/MeasureLayer.tsx` (+ test),
  `e2e/layout-consistency.spec.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-21 — Fixed expanded-section footer clipping, balanced the
  Launcher role grid, clarified the paste minimum, darkened disabled Undo/Redo,
  and highlighted the active mobile tab. The section footer is now
  `grid-cols-2` at every width (custom delete/confirm rows span both columns),
  so `↑ Move up` and `Move down` stay inside the 22rem desktop column and the
  390px card instead of clipping against the right border. A sixth **Data
  Analyst** preset fills the two-column role grid beside **Fresh Graduate**, and
  the paste box gained an `aria-describedby` hint that one line is enough.
  Disabled header actions use `disabled:text-text/80`, and `MobileBottomNav`
  gives the current tab `bg-primary/10 text-primary` plus an `aria-hidden` top
  indicator. Verified `npm run typecheck`, `npm test` (665 pass), `npm run lint`.
  Added a both-viewport Playwright action-row geometry case and a mobile tab
  indicator assertion; Playwright is still blocked here, so those are
  typechecked but browser-unverified. Files:
  `src/components/editor/SectionList.tsx` (+ test),
  `src/components/launcher/Launcher.tsx` (+ test),
  `src/lib/presets/archetypes.ts` (+ test),
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/editor/MobileBottomNav.tsx` (+ test),
  `e2e/layout-consistency.spec.ts`, `e2e/mobile.spec.ts`, `README.md`,
  `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-21 — Stopped **Anonymize** leaking entry URLs and fixed the
  **Match JD** one-click close and filler stopwords. `anonymizeResumeDoc` now
  redacts `url` on projects, certifications, publications, and custom-section
  items with `ANONYMIZED_ENTRY_URL` (blank stays blank, an absent optional URL
  stays absent), and an ATS regression proves no original username survives.
  The shared `EntryDrawer` X now carries `data-vaul-no-drag` and stops
  `pointerdown` propagation so vaul cannot treat the tap as a drag start and
  snap a snap-point sheet shorter instead of closing; `JdMatchDrawer` gained a
  single-click close test. `jdMatch.ts` filters filler/boilerplate such as
  `for`, `looking`, `seek`/`seeking`, `want`, `ideal`, `prefer`, `join`,
  `opportunity`, `within`/`without`, `per`/`via`, and month/week units. Verified
  `npm run typecheck`, `npm test` (660 pass), `npm run lint`. Files:
  `src/lib/privacy/anonymizeDoc.ts` (+ test),
  `src/components/editor/EntryDrawer.tsx` (+ test),
  `src/components/editor/JdMatchDrawer.test.tsx`,
  `src/lib/keywords/jdMatch.ts` (+ test),
  `e2e/layout-consistency.spec.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.
  The one-click e2e assertion is typechecked but was not run in this
  environment.

- [x] 2026-11-21 — Fixed the Studio Sidebar blank Page 2 and the `ATS text` spill-banner overlap.
  `computePages` gained a `pinnedToFirstPage` section-id set: a trailing run of
  pages holding only those blocks is folded back into Page 1 in canonical order
  (folding, not deleting, so `StudioSidebarTemplate` still recovers every
  sidebar block from `pages.flat()`). `usePageLayout` passes
  `STUDIO_SIDEBAR_SECTION_IDS` for the `gengar` template only, so the page
  count, canvas frame, print, and `"Spills onto N pages"` banner all agree that
  a main column which fits on Page 1 is one page. `PreviewChrome` now takes a
  `sticky` prop and `LiveCanvasViewport` passes `sticky={mode === "canvas"}`, so
  in `ATS text` mode the banner stays in normal flow above the ATS scroll
  container instead of overlaying the `"Copy all"` button and helper copy. Added
  computePages folding cases (single/multiple tail pages, split entry blocks,
  unpinned tails kept), `usePageLayout` gengar-vs-onyx cases, and a
  `LiveCanvasViewport` ATS non-sticky banner case. Verified `npm run typecheck`,
  `npm test` (654 pass), `npm run lint`. Files:
  `src/lib/pagination/computePages.ts` (+ test),
  `src/lib/pagination/usePageLayout.ts` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test),
  `src/templates/studio/StudioSidebarTemplate.tsx`,
  `src/templates/studio/sidebarSections.ts` (new), `README.md`, `CONTEXT.md`,
  `TASKS.md`. Playwright remains blocked here, so the `390x844` / `1280x800`
  visual check is browser-unverified.

- [x] 2026-11-21 — Wired the five dropped fields through Visual Preview/Print PDF
  and ATS text. URL-only Profiles rows now stay visible and show the cleaned URL
  as a clickable link; `basics.website.url` is a clickable header link labelled by
  `website.label` (falling back to the cleaned URL); Education `grade` prints in
  the entry subtitle; Certifications and Publications `url` render as clickable
  links. A shared `externalLinkHref` upgrades bare hosts to `https://` and rejects
  non-http schemes, while ATS text keeps the raw stored URL. Added an exhaustive
  `allFieldsWiring.test.tsx` covering every editable field in all 14 sections.
  Verified `npm run typecheck`, `npm test` (647 pass), `npm run lint`. Files:
  `src/templates/shared/allFieldsWiring.test.tsx` (new),
  `src/templates/shared/sectionData.ts`, `src/templates/shared/SectionRenderer.tsx`,
  `src/templates/shared/HeaderSlot.tsx`, `src/lib/ats/atsText.ts` (+ test),
  `src/lib/store/selectors.ts` (+ test), `src/lib/links/contactLinks.ts` (+ test),
  `src/templates/shared/AvatarSlot.test.tsx`, `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-21 — Stopped expanded section cards clipping off the right edge on
  phones. `EntryCard`'s `<fieldset>` now carries `w-full min-w-0 max-w-full`,
  overriding the browser's default `min-width: min-content`, and the
  `SectionList` row/body opt out of intrinsic widening (`min-w-0`). The four
  `EntryActions` buttons now `flex-wrap` (keeping `shrink-0` targets) instead of
  forcing the card wider on coarse-pointer phones, and `MonthSelect`'s two-track
  grid is clamped with `w-full min-w-0 max-w-full` +
  `minmax(0,1fr)/minmax(0,6rem)`. Added unit assertions for every class contract
  and a mobile-only Playwright case that expands Profiles/Experience/Education/
  Projects/Skills/Certifications at `390x844` and asserts every card, fieldset,
  input, and select right edge stays inside the card/viewport. Verified
  `npm run typecheck`, `npm test` (635 pass). Playwright remains blocked here, so
  the geometry case is typechecked but browser-unverified. Files:
  `src/components/editor/SectionFormControls.tsx` (+ test),
  `src/components/editor/SectionList.tsx` (+ test),
  `e2e/layout-consistency.spec.ts`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-21 — Added **Copy for Workday** actions to the `ATS text` tab. The
  ATS output is unchanged byte-for-byte: `buildAtsText` now derives from a new
  pure `buildAtsCopyBlocks(doc)` that exposes the contact header plus ordered
  section and entry copy blocks. `AtsTextView` renders those blocks as section
  cards with a top **Copy all plain text** CTA, per-section Copy buttons, and
  compact per-entry Copy buttons (entry labels use position/degree/name, or the
  first keyword for keyword-only skills). Every write goes through the shared
  `copyText` helper (async Clipboard API, then legacy `execCommand` fallback),
  shows **Copied** for 1.5 s, announces through `aria-live`, and disables
  copy-all on an empty resume; `InAppBrowserNotice` reuses the same helper.
  Verified `npm run typecheck`, `npm test` (633 pass), `npm run lint`,
  `npm run build` (static export; the security-advisory nudge needed the usual
  second run). Files: `src/lib/clipboard/copyText.ts` (+ test, new),
  `src/lib/ats/atsText.ts` (+ test),
  `src/components/preview/AtsTextView.tsx` (+ test),
  `src/components/preview/InAppBrowserNotice.tsx`, `README.md`, `CONTEXT.md`,
  `TASKS.md`. No new layout shell, so no e2e case was added; Playwright remains
  blocked here.

- [x] 2026-11-20 — Added **Anonymize for review** to Preview. A new
  `anonymizeResumeDoc(doc)` returns a display-only clone with `"Alex Taylor"`,
  placeholder email/phone/location/website, anonymized profile URLs/usernames,
  a hidden picture, and stable `Company A` / `University A` labels for
  experience companies and education schools. `EditorWorkspace` keeps a
  session-only toggle and passes the clone **only** to the preview and print
  button, so the header, saved Dexie row, undo history, and pagination keep the
  real document; Visual, ATS text, and the PDF filename all use the alias. The
  Preview header gained an **Anonymize** pill (`aria-pressed`) plus a compact
  active banner. Verified `npm run typecheck`, `npm test` (625 pass),
  `npm run lint`, `npm run build` (static export; the security-advisory nudge
  needed the usual second run). Files: `src/lib/privacy/anonymizeDoc.ts`
  (+ test, new), `src/components/editor/EditorWorkspace.tsx` (+ test),
  `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-20 — Added **Duplicate resume** on `/` and a per-entry
  **Hide/Show** eye toggle. `duplicateResume(id)` clones a saved Dexie row under
  a new id, appends ` (Copy)` to the current name (or `Untitled resume (Copy)`),
  and bumps `updatedAt` while leaving the original untouched; each **Recent
  resumes** row has a Duplicate icon button that stops row-click propagation and
  refreshes the list. Every entry form now exposes visibility through one
  compact eye button in `EntryActions` (Eye for visible, EyeSlash for hidden,
  `aria-pressed` plus Hide/Show labels) and dims the `EntryCard` while hidden,
  replacing the old "Hide entry" checkbox. Hidden-entry filtering was already
  shared by all six templates, `MeasureLayer`, and `AtsTextView` through
  `sectionData`/`atsText`, so the new regression tests lock that contract in.
  Verified `npm run typecheck`, `npm test` (619 pass), `npm run lint`. Files:
  `src/lib/store/db.ts` (+ test), `src/components/launcher/Launcher.tsx`
  (+ test), `src/components/editor/SectionFormControls.tsx` (+ test),
  `src/components/editor/ExperienceForm.tsx` (+ test),
  `src/components/editor/EducationForm.tsx`,
  `src/components/editor/ProjectsForm.tsx`,
  `src/components/editor/SkillsForm.tsx`,
  `src/components/editor/GenericSectionForm.tsx`,
  `src/components/editor/CustomSectionForm.tsx`, `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-20 — Polished the Launcher. **Create resume from text** now
  enables from a single `onChange` or `onPaste` (the paste handler derives the
  next value from the selection before the browser commits it), and the textarea
  is `resize-none`. The promise row is left-aligned with the hero, the
  hero-to-choices spacing is tighter, all five presets keep one width (Fresh
  Graduate no longer spans both columns), and **Start with a blank resume** is a
  quiet secondary outline CTA. **Recent resumes** rows open on a click anywhere
  while the Open button stays keyboard-accessible and Rename/Delete stop
  propagation; the list shows 5 first with **Show all (N)** / **Show fewer**, and
  the outer Backup & Restore shell is now solid instead of dashed. Verified
  `npm run typecheck`, `npm test` (611 pass). Files:
  `src/components/launcher/Launcher.tsx` (+ test), `src/app/page.tsx`,
  `README.md`, `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-20 — Polished the Design panel and fixed the missing **Density**
  highlight. Legacy Dexie rows saved before `design.density` existed had no
  enum value at runtime, so no Density card could be checked; a new pure
  `resolveDensityId` falls back through the applied spacing to `normal`, and the
  shared option-card active style is now a solid primary border + fill + ring.
  Accent swatches hide their radio (kept for a11y) and show an active border plus
  fixed checkmark, with a new eighth `rose` accent so the two-column grid has no
  orphaned card. Template badges always sit in one top-right
  `[data-template-title-row]` slot, and Sans/Serif/Classic names render in their
  own families. Verified `npm run typecheck`, `npm test` (605 pass),
  `npm run lint`. Files: `src/components/editor/DesignPanel.tsx` (+ test),
  `src/lib/design/designOptions.ts` (+ test), `README.md`, `CONTEXT.md`,
  `TASKS.md`.

- [x] 2026-11-20 — Fixed both live P1 bugs. **Name edits** now follow every
  keystroke: the 50 ms `useDebouncedCommit` timer was being reset by steady
  typing, so the store (and the header, preview canvas and print filename) only
  caught up at a pause/blur. `BasicsForm` publishes each keystroke through
  `onLiveNameChange`, and `EditorWorkspace` keeps a self-invalidating
  `{name, base}` override that produces a name-only `displayDoc` for the preview
  and print button without re-measuring or touching undo history (Decisions
  #53). **Entry Move up/down** no longer throws the Content column upward:
  `EntryActions` snapshots and restores every scrollable ancestor, re-focuses an
  enabled sibling with `preventScroll` when the clicked button hits a boundary
  and disables, and `#panel-content` disables scroll anchoring (Decision #54).
  Verified `npm run lint`, `npm run typecheck`, `npm test` (599 pass),
  `npm run build` (static export; the security-advisory nudge needed a second
  run). Files: `src/components/editor/BasicsForm.tsx` (+ test),
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `src/components/editor/SectionFormControls.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`. Playwright is blocked here, so the scroll fix still
  needs a real-browser check at `390x844` / `1280x800`. The new BasicsForm
  regression test lives in `src/components/editor/__explore.test.tsx` because
  file deletion is unavailable here; rename it when possible.

- [x] 2026-11-20 — Polished the editor header and Content ergonomics. **Save PDF**
  is now the single solid primary CTA; a hairline divider sits between Back and
  the title and disabled Undo/Redo read as muted instead of a faint ghost. The
  desktop shell is viewport-tall with three independently scrolling columns, so
  the document no longer produces a second right-edge scrollbar (supersedes
  Decision #28, recorded as #51/#52). Dropped the redundant **Name preview** box,
  swapped the rotated expand caret for an explicit upward caret, nowrapped
  section Move labels, fit all eight formatting controls on one row in the
  22rem column, made the writing-helper strip collapsible, and gave entry Delete
  a quiet destructive cue. Verified `npm run typecheck`, `npm test` (596 pass),
  `npm run lint`, `npm run build` (static export; the Next.js security-advisory
  nudge needed the usual second run). Files: `src/components/editor/EditorWorkspace.tsx`
  (+ test), `src/components/preview/PrintTriggerButton.tsx` (+ test),
  `src/components/editor/BasicsForm.tsx` (+ test), `src/components/editor/SectionList.tsx`
  (+ test), `src/components/editor/SectionFormControls.tsx` (+ test),
  `src/components/editor/RichTextField.tsx` (+ test),
  `src/lib/schema/resumeName.ts`, `e2e/layout-consistency.spec.ts`, `README.md`,
  `CONTEXT.md`, `TASKS.md`. Playwright remains blocked here, so the two
  rewritten e2e cases are typechecked but browser-unverified.

- [x] 2026-11-20 — Fixed the live **Match JD** drawer so it actually opens and is visible. The compact JD sheet was the only short `EntryDrawer`, but it inherited `snapPoints={[0.6, 0.95]}` from the tall entry/section forms; vaul parks snap-point sheets ~40% of the viewport downward, leaving only a sliver on screen. `EntryDrawer` now accepts `snapPoints?: number[] | false` (default unchanged) and `JdMatchDrawer` opts out, so it opens at its natural height. Its vaul `Trigger asChild` also commits `open` explicitly in `onClick` as a fallback for the controlled `Root` (Enter/Space share that path). The Content heading and trigger now share one `[data-content-title-row]` flex row so Match JD never wraps on phones. Tests: snap-point vs compact drawer, Enter-to-open, shared row, plus Playwright bounding-box visibility (not just `toBeVisible`) and row-alignment geometry. Verified `npm run typecheck`, `npm test` (594 pass), `npm run lint`. Files: `src/components/editor/EntryDrawer.tsx` (+ test), `src/components/editor/JdMatchDrawer.tsx` (+ test), `src/components/editor/EditorWorkspace.tsx` (+ test), `e2e/layout-consistency.spec.ts`, `CONTEXT.md`, `TASKS.md`. Playwright remains blocked here, so the new geometry case is typechecked but browser-unverified.

- [x] 2026-11-19 — Both preview reset controls now return the resume to the top,
  as on first landing in the Preview tab. The zoom/fit transform was already
  restored to `(0, 0, fitScale)`, but the element that scrolls the pages kept its
  offset (the inner `[data-canvas-scroll]` on phones, the sticky `#panel-preview`
  at `lg`). New pure `scrollToResumeTop` zeroes the passed inner box plus the
  nearest scrollable ancestor; `LiveCanvasViewport` refs the inner box and calls
  it from a shared `resetScroll` used by both `resetZoom` and `Reset fit`.
  Verified `npm run typecheck`, `npm test` (592 pass), `npm run lint`. Files:
  `src/lib/zoom/touchScroll.ts` (+ test),
  `src/components/preview/LiveCanvasViewport.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`.

- [x] 2026-11-19 — Surfaced the **Match JD** trigger in the Content panel header
  and extended the browser check to verify keyword scoring, not just that the
  drawer opens. The full-width trigger already existed in the Content body;
  `JdMatchDrawer` now accepts a `compact` variant that keeps the same
  "Match to a job description" accessible name and vaul `Drawer.Trigger asChild`
  wiring, and `EditorWorkspace` renders it in a wrapping `data-content-header`
  row (the global header is too tight for another 44px control). The Playwright
  case now pastes "TypeScript, Kubernetes, and Cobol" and asserts the Matched
  / Missing chips. Verified `npm run typecheck`, `npm test` (588 pass),
  `npm run lint`. Files: `src/components/editor/JdMatchDrawer.tsx` (+ test),
  `src/components/editor/EditorWorkspace.tsx` (+ test),
  `e2e/layout-consistency.spec.ts`, `README.md`, `CONTEXT.md`, `TASKS.md`.
  Playwright remains blocked here, so the extended e2e case is typechecked but
  browser-unverified.

- [x] 2026-11-19 — Synced live `Name` edits to the header and preview canvas.
  `basics.name` already reached the store on `onChange` via the shared 50 ms
  `useDebouncedCommit` (no blur needed), so the top header title and center
  resume canvas already followed typing; the gap was a duplicated `"Untitled
  resume"` fallback and no test for the preview-canvas half. Extracted
  `resumeDisplayName` as the single display-name contract used by both the
  Name preview and the header h1, and added a regression test proving typing a
  name updates both the header and the mocked preview canvas without a blur.
  Verified `npm run typecheck`, `npm test` (587 pass), `npm run lint`. Files:
  `src/lib/schema/resumeName.ts` (+ test, new),
  `src/components/editor/BasicsForm.tsx`,
  `src/components/editor/EditorWorkspace.tsx` (+ test), `README.md`,
  `CONTEXT.md`, `TASKS.md`.

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
 
 
