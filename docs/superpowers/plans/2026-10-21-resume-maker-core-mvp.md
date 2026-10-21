# Resume Maker — Core MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the free-tier resume builder loop end-to-end: launcher → preset or JSON import → responsive editor → paginated live preview → native print-to-PDF, fully local, with undo/redo.

**Architecture:** Static-exported Next.js App Router SPA. A Zod-validated `ResumeDocument` lives in a Zustand store (with Zundo temporal history) and autosaves to IndexedDB. Templates are pure presentational components driven by section IDs. Pagination is a hidden measurement pass at exact paper width feeding a pure block-packing function; both preview and the body-level print portal render from the same page assignment.

**Tech Stack:** Next 16.4.2, React 19.3.1, TypeScript 6.0.3, Tailwind 4.3.3, Zod 4.6.7, React Hook Form 7.90.0 + resolvers 6.0.0, Zustand 5.0.15 + Zundo 2.3.0, Dexie 4.4.6, Vaul 1.1.2, react-zoom-pan-pinch 4.2.0, Tiptap 3.32.0, Phosphor 2.1.10, Vitest 5 + Playwright 1.64.

**Spec:** `docs/superpowers/specs/2026-10-21-resume-maker-design.md`

## Global Constraints

- `output: 'export'`; no server actions, route handlers, or middleware. Editor route is `/editor?id=<localId>`.
- Nothing from `ai`, `@ai-sdk/*`, or `components/ai/*` may be imported or bundled. Zero AI strings in UI.
- No `pagedjs`.
- No `generateObject` / `streamObject` (not applicable in MVP, but binding for later plans).
- Units: config in **pt**, paper in **mm**, measurement in **px**. `1pt = 4/3 px`. A4 = 210×297mm, Letter = 215.9×279.4mm.
- Template spacing via `gap` only — never `margin-top`/`margin-bottom`.
- `#print-portal` is the sole print subtree; everything else hides under `@media print`.
- TypeScript strict; no `any` in exported signatures.
- Node ≥ 20; commit the lockfile.

## Review Focus (failure modes no happy-path test covers)

1. **Print before fonts/images settle** on iOS Safari → blank or shifted PDF. Owner: Task 10 waits `document.fonts.ready` + `img.decode()`, then two rAF.
2. **Hostile HTML from imported JSON** (`<script>`, `onerror=`) → XSS in preview and print. Owner: Task 7 sanitizer test.
3. **Page-boundary rounding** (mm→px, sub-pixel heights) clips the last bullet. Owner: Task 3 packer tests at ±0.5px.
4. **Hidden avatar or empty section leaves dead space** (the exact bug spec §3.3 exists to prevent). Owner: Task 8 DOM-absence tests + Task 11 Playwright width assertion.
5. **Undo polluted by UI state or autosave** → undo restores a stale document. Owner: Task 4 temporal `partialize` test.

---

## File Structure

```
next.config.ts  tsconfig.json  postcss.config.mjs  eslint.config.mjs
vitest.config.ts  playwright.config.ts  package.json
src/app/{layout.tsx, globals.css, page.tsx, editor/page.tsx}
src/styles/print.css
src/lib/schema/{resume.schema.ts, defaults.ts, serialize.ts}
src/lib/units/pageGeometry.ts
src/lib/pagination/packPages.ts
src/lib/store/{db.ts, useResumeStore.ts, selectors.ts}
src/lib/print/{printDocument.ts, detectInAppBrowser.ts}
src/lib/richtext/sanitize.ts
src/lib/presets/archetypes.ts
src/components/ui/*                      # shadcn primitives (button, input, label, accordion, slider, dialog)
src/components/launcher/Launcher.tsx
src/components/editor/{EditorWorkspace.tsx, MobileBottomNav.tsx, SectionAccordion.tsx,
                       BasicsForm.tsx, ExperienceForm.tsx, EducationForm.tsx,
                       SkillsForm.tsx, ProjectsForm.tsx, EntryDrawer.tsx, RichTextField.tsx}
src/components/preview/{LiveCanvasViewport.tsx, MeasureLayer.tsx, PageStack.tsx,
                        PageOverflowBanner.tsx, PrintPortal.tsx, PrintTriggerButton.tsx,
                        InAppBrowserNotice.tsx}
src/templates/{registry.ts, shared/{HeaderSlot.tsx, AvatarSlot.tsx, SectionRenderer.tsx, SkillLevelIndicator.tsx},
               onyx/OnyxTemplate.tsx, onyx/onyx.module.css}
```

---

### Task 1: Foundation, tooling, tokens

**Files:** `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/styles/print.css`, `src/test/setup.ts`

**Produces:** design tokens (`--color-primary`, `--color-text`, `--color-background`, `--page-gap-y`, `--page-gap-x`, `--page-margin-x`, `--page-margin-y`, `--page-width`, `--page-height`), `npm run {dev,build,lint,typecheck,test,e2e}` scripts.

- [x] **Step 1:** `git init`; scaffold Next 16 + TS + Tailwind 4 + App Router + `src/`; strip boilerplate; set `output: 'export'`, `images: { unoptimized: true }`.
- [x] **Step 2:** Pin all versions from Global Constraints; `npm install`; commit lockfile. Vendor Inter + Source Serif 4 woff2 (OFL) into `src/app/fonts/` and load with `next/font/local` (no build-time network).
- [x] **Step 3:** Write `src/app/page.test.tsx` asserting a stub heading renders; run `npm run test` → FAIL (no config).
- [x] **Step 4:** Add Vitest (jsdom, RTL, `fake-indexeddb`, setup file) and Playwright config (`webServer: npm run dev`, projects: chromium + mobile-safari). Re-run → PASS.
- [x] **Step 5:** Add tokens to `globals.css` via Tailwind 4 `@theme`; add `print.css` (`@page { size: A4 portrait; margin: 0 }`, `#print-portal` hidden on screen, `body > *:not(#print-portal)` hidden in print, `print-color-adjust: exact`, `break-inside` rules) and import it in `layout.tsx`.
- [x] **Step 6:** Run `lint`, `typecheck`, `test`, `build` → all pass. Commit.

---

### Task 2: Resume schema, defaults, serialization

**Files:** `src/lib/schema/resume.schema.ts`, `defaults.ts`, `serialize.ts`, `*.test.ts`

**Produces:**
```ts
export const ResumeDocumentSchema: z.ZodType<ResumeDocument>
export type ResumeDocument
export function createEmptyResume(template?: TemplateId): ResumeDocument
export function parseResumeJson(input: unknown):
  { ok: true; doc: ResumeDocument } | { ok: false; error: string }
export function serializeResume(doc: ResumeDocument): string
```

- [x] **Step 1:** Test `createEmptyResume()` satisfies the schema and pins defaults: `picture {hidden:true,size:64,aspectRatio:1,borderRadius:0,fit:'cover'}`, `page {format:'a4',marginX:14,marginY:12,gapX:8,gapY:12,hideIcons:false}`, `body {fontSize:11,lineHeight:1.4}`, `layout.sidebarWidth:35`, `layout.sidebarSide:'left'`, `metadata.schemaVersion:1`.
- [x] **Step 2:** Test that a partial object (`{ basics: { name: 'Ada' } }`) parses with all other fields defaulted, and that unknown keys are stripped.
- [x] **Step 3:** Test `JSON.parse(serializeResume(doc))` round-trips deep-equal; `parseResumeJson('{bad')` and `parseResumeJson({basics: 1})` return `ok:false` with a message and never throw.
- [x] **Step 4:** Implement schema. `ListSection<T> = SectionConfig & { items: T[] }`; `SectionConfig = { title, icon, columns: 1|2|3|4, hidden, showHeading, keepTogether, startOnNewPage }`; item base `{ id, hidden }`. Include all 13 spec sections plus `customSections` — render-only for the 7 not edited in MVP. Use lenient strings (no hard email/URL validation) so real resumes never fail to import. Add `metadata.schemaVersion` default `1` (needed for migrations).
- [x] **Step 5:** Tests pass. Commit.

---

### Task 3: Paper geometry + pure page packer

**Files:** `src/lib/units/pageGeometry.ts`, `src/lib/pagination/packPages.ts`, `*.test.ts`

**Produces:**
```ts
export function pageGeometry(format: 'a4'|'letter', marginXpt: number, marginYpt: number):
  { widthMm: number; heightMm: number; contentWidthPx: number; contentHeightPx: number }
export type PackBlock = { id: string; heightPx: number; startOnNewPage?: boolean }
export function packPages(blocks: PackBlock[], contentHeightPx: number):
  { pages: string[][]; overflowPx: number }
```
`overflowPx` is the total height of content that could not fit its page (0 when clean).

- [x] **Step 1:** Test geometry: A4 page `793.7008 × 1122.5197px`; content box at `marginX=14pt, marginY=12pt` = `756.3675 × 1090.5197px`. Letter page `816.0000 × 1056.0000px`; content `778.6667 × 1024.0000px` (assert to 4dp; `MM_TO_PX = 96/25.4`, `PT_TO_PX = 4/3`).
- [x] **Step 2:** Write packer tests: empty input → `{pages:[[]], overflowPx:0}`; exact fit (sum === contentHeight) stays on one page; sum + 1px → two pages; `startOnNewPage` forces a break; oversized single block occupies its own page and reports its excess in `overflowPx`; order is preserved; `contentHeightPx <= 0` throws.
- [x] **Step 3:** Test sub-pixel boundary: blocks `[600.25, 479.75]` at `1080` fit one page; `[600.25, 479.76]` produce two.
- [x] **Step 4:** Implement both. Packer is pure — no DOM, no store, no React.
- [x] **Step 5:** Tests pass. Commit.

---

### Task 4: Dexie persistence + Zustand store + undo/redo

**Files:** `src/lib/store/db.ts`, `useResumeStore.ts`, `selectors.ts`, `*.test.ts`

**Produces:**
```ts
export type StoreState = {
  doc: ResumeDocument; resumeId: string | null;
  hydrated: boolean; lastSavedAt: number | null; saveState: 'idle'|'saving'|'error';
  setDoc(next: ResumeDocument): void;
  patchDoc(patch: DeepPartial<ResumeDocument>): void;
  loadResume(id: string): Promise<boolean>;
  createResume(template?: TemplateId): Promise<string>;
}
export const useResumeStore
export function canUndo(): boolean; export function canRedo(): boolean
export function undo(): void; export function redo(): void
export const selectVisibleSectionIds: (s: StoreState) => string[]
export function isDraft(sectionId: string, item: unknown): boolean
```

- [x] **Step 1:** Test with `fake-indexeddb`: `createResume` writes a row; `loadResume` restores it; autosave fires once after rapid `patchDoc` calls (fake timers, 300ms).
- [x] **Step 2:** Test undo/redo: two `patchDoc` calls then `undo()` restores the first doc; `redo()` reapplies; `canUndo()` false on a fresh store. Assert that changing `saveState`/`hydrated` does **not** create an undo entry (temporal `partialize` → `{ doc }` only).
- [x] **Step 3:** Test hydration does not pollute history: `loadResume` then `canUndo()` is `false`.
- [x] **Step 4:** Test `isDraft`: experience with empty `company` is draft; skills with empty `name` is draft; education with empty `school` is draft. `selectVisibleSectionIds` excludes hidden sections and sections whose items are all drafts, preserving `pages[0].main` then `sidebar` order.
- [x] **Step 5:** Implement `db.ts` (`Dexie` subclass, `resumes: 'id, updatedAt'`), store with `temporal` (`limit: 100`, `partialize`, `equality` on doc reference), debounced autosave 300ms, flush on `visibilitychange`/`pagehide`, and `pause()` during load then `clear()`.
- [x] **Step 6:** Tests pass. Commit.

---

### Task 5: Launcher, role presets, JSON import/export

**Files:** `src/app/page.tsx`, `src/components/launcher/Launcher.tsx`, `src/lib/presets/archetypes.ts`, `*.test.tsx`

**Produces:** `ARCHETYPES: Archetype[]` — `{ id, label, description, build(): ResumeDocument }` for *Software Engineer, Product Manager, UX/UI Designer, Finance & Operations, Fresh Graduate*. Each seeds 2 experience entries, 1–2 projects, education, and 6 skills; every experience bullet follows "Accomplished [X] as measured by [Y] by doing [Z]" with a real metric.

- [x] **Step 1:** Test that every archetype's `build()` passes `ResumeDocumentSchema` and that no bullet lacks a digit (the XYZ metric rule).
- [x] **Step 2:** Test launcher renders exactly two cards — "Import existing resume (JSON)" and "Start from scratch" — and that **no** AI-related text exists in the DOM (`expect(container.textContent).not.toMatch(/ai|assistant|refine|score/i)`).
- [x] **Step 3:** Test JSON file import: valid file seeds the store and navigates to `/editor?id=…`; invalid file shows an inline error and creates nothing.
- [x] **Step 4:** Implement launcher. PDF import is present in code behind `PDF_IMPORT_ENABLED = false` (parser arrives in a later plan) and the card is not rendered while false. Add per-section "Clear sample data".
- [x] **Step 5:** Add "Download JSON backup" on the editor top bar.
- [x] **Step 6:** Tests + `lint` + `typecheck` pass. Commit.

---

### Task 6: Responsive editor shell

**Files:** `src/app/editor/page.tsx`, `src/components/editor/{EditorWorkspace.tsx, MobileBottomNav.tsx, EntryDrawer.tsx}`, UI primitives.

**Produces:** `/editor?id=` client page (wrapped in `Suspense`); three mobile tabs (`content | design | preview`); Vaul drawers with `snapPoints={[0.6, 0.95]}`; desktop three-zone grid at `lg`.

- [x] **Step 1:** Test: mobile nav switches visible panel; default tab is `content`; desktop (`matchMedia` stub) renders section list + canvas + design panel simultaneously.
- [x] **Step 2:** Test: opening an entry mounts a drawer; drawer uses `visualViewport` resize listener to offset above the keyboard (assert listener attached/removed).
- [x] **Step 3:** Implement shell. Tabs are real buttons with `aria-selected`; panels are `<section role="tabpanel">`. Preview tab is a placeholder until Task 9.
- [x] **Step 4:** Commit.

---

### Task 7: Section forms + rich text

**Files:** `src/components/editor/{SectionAccordion.tsx, BasicsForm.tsx, ExperienceForm.tsx, EducationForm.tsx, SkillsForm.tsx, ProjectsForm.tsx, RichTextField.tsx}`, `src/lib/richtext/sanitize.ts`, `*.test.tsx`

**Produces:** `<RichTextField value={html} onChange={(html: string) => void} ariaLabel={string} />`; `sanitizeRichText(html: string): string`.

- [x] **Step 1:** Sanitizer tests: keeps `p,strong,em,ul,ol,li,a[href],br`; strips `<script>`, `<img onerror>`, `onclick`, `style`; forces `rel="noopener noreferrer"` and `target="_blank"` on links; is idempotent.
- [x] **Step 2:** Test: typing in a field updates the store after 50ms (fake timers) and exactly one render of that section occurs (spy selector).
- [x] **Step 3:** Test: an entry with an empty primary key is not rendered in preview (draft filtering) but remains in the form.
- [x] **Step 4:** Implement forms with React Hook Form + `zodResolver`, debounced 50ms commit, Tiptap (StarterKit minus headings, plus Link) restricted to the allowlist, sanitize on JSON import and before print. Add/remove/reorder entries within a section.
- [x] **Step 5:** Tests pass. Commit.

---

### Task 8: Template engine + `onyx`

**Files:** `src/templates/registry.ts`, `src/templates/shared/{HeaderSlot.tsx, AvatarSlot.tsx, SectionRenderer.tsx, SkillLevelIndicator.tsx}`, `src/templates/onyx/{OnyxTemplate.tsx, onyx.module.css}`, `*.test.tsx`

**Produces:**
```ts
export type TemplateId = 'onyx'|'persian'|'bronzor'|'chikorita'|'azurill'|'gengar'
export const TEMPLATES: Record<TemplateId, { id: TemplateId; label: string; columns: 1|2; Component: FC<TemplateProps> }>
export type TemplateProps = { doc: ResumeDocument; pages: string[][]; pageIndex: number }
```

- [x] **Step 1:** Test header collapse: `picture.hidden` or empty `url` → zero `<img>` in DOM and `AvatarSlot` returns `null`.
- [x] **Step 2:** Test section suppression: `hidden: true` or all-draft items → section heading and wrapper absent from DOM (not `display:none`).
- [x] **Step 3:** Test single-column order: `pages[0] = {main:['experience'], sidebar:['skills']}` renders experience before skills; unknown section IDs are ignored without throwing.
- [x] **Step 4:** Implement shared slots using intrinsic `grid-template-columns: auto 1fr` and flex `gap` containers; implement `onyx` (single column, avatar beside contact metadata, monospace skill pills, compact). Apply `data-keep-together` / `data-start-new-page` attributes from `SectionConfig`.
- [x] **Step 5:** Tests pass. Commit.

---

### Task 9: Live preview, measurement, pagination banner

**Files:** `src/components/preview/{LiveCanvasViewport.tsx, MeasureLayer.tsx, PageStack.tsx, PageOverflowBanner.tsx}`, `src/lib/pagination/usePageLayout.ts`, `*.test.tsx`

**Produces:** `usePageLayout(doc) => { pages: string[][]; overflowPx: number; isMeasuring: boolean; contentHeightPx: number }`.

- [x] **Step 1:** Test `usePageLayout` with injected stub heights (dependency-injected measurer): section heights pack into 2 pages when total exceeds capacity by 1px; `isMeasuring` true for one tick then false.
- [x] **Step 2:** Test banner copy: `overflowPx > 0` renders "Runs onto page N by ~X lines" and a disabled **Fit to 1 Page** button (feature lands in the pagination plan) — no AI wording.
- [x] **Step 3:** Implement `MeasureLayer`: `position: fixed; left: -10000px; top: 0; width: <contentWidth mm>; visibility: hidden; transform: none` rendering the **same** template at paper width, with a `ResizeObserver` per section. Preview scales via `transform` on a wrapper only, so measured widths stay true to print.
- [x] **Step 4:** Wire `react-zoom-pan-pinch` (pinch + pan enabled, controls hidden on mobile, disabled > `lg`). Render `PageStack` with Page N of M.
- [ ] **Step 5:** Tests pass; Playwright sanity: changing a font size changes page count. Commit.

---

### Task 10: Print pipeline

**Files:** `src/components/preview/{PrintPortal.tsx, PrintTriggerButton.tsx, InAppBrowserNotice.tsx}`, `src/lib/print/{printDocument.ts, detectInAppBrowser.ts}`, `*.test.ts`, `e2e/print.spec.ts`

**Produces:**
```ts
export function detectInAppBrowser(ua: string):
  { inApp: boolean; platform: 'ios'|'android'|'other'; app?: string }
export async function printResume(opts: {
  pages: string[][]; name: string; beforePrint?: () => void
}): Promise<void>
```

- [x] **Step 1:** Unit-test `detectInAppBrowser` against: Facebook iOS (`FBAN`/`FBAV`), Instagram, Android WebView (`; wv)`), Slack, iOS Safari (`Safari/`), Android Chrome, desktop Chrome. Assert no false positive on plain iOS Safari.
- [x] **Step 2:** Playwright test: click **Save PDF** with `window.print` stubbed via `addInitScript`; assert `#print-portal` exists, is a direct child of `<body>`, contains exactly `pages.length` `.resume-page` nodes, and that `document.title === "Ada-Lovelace-Resume"`.
- [x] **Step 3:** Playwright test: stub `print` dispatches `afterprint`; assert portal is removed and the original title restored.
- [x] **Step 4:** Playwright print-media test: `emulateMedia({ media: 'print' })` → `#app-root` computed `display: none`; `.resume-page` width ≈ 793.7px (210mm) and padding equals `marginY marginX`; `print-color-adjust: exact`; `.resume-page:last-child { break-after: auto }`.
- [x] **Step 5:** Implement `printResume`: mount portal state → `await document.fonts.ready` → `await Promise.all(imgs.map(i => i.decode()))` → two `requestAnimationFrame` → set title → `window.print()` → on `afterprint` unmount and restore title (plus 60s safety timeout).
- [x] **Step 6:** Implement `InAppBrowserNotice` (detected at mount) with **Copy link** and **Download JSON backup**; export still attempts if tapped.
- [x] **Step 7:** All tests pass on chromium + mobile-safari projects. Commit.

---

### Task 11: End-to-end flow + hardening

**Files:** `e2e/flow.spec.ts`, `e2e/a11y.spec.ts`

- [x] **Step 1:** E2E: launcher → Software Engineer preset → rename → edit a bullet → reorder entries → preview shows 1 page → reload page → data persists → undo restores previous bullet.
- [x] **Step 2:** E2E: hide the profile photo → assert `img` count is 0 and the name element's bounding box starts within `marginX` of the page edge (dead-space regression).
- [x] **Step 3:** E2E: hide a section → subsequent sections close the gap (next section's `y` decreases).
- [x] **Step 4:** E2E: import a JSON with a `<script>` bullet → assert no script node and no dialog executes; invalid JSON shows an error and leaves the current doc intact.
- [x] **Step 5:** A11y: axe scan on launcher and editor tabs → no critical violations; keyboard-only can reach every form field and run undo (`Ctrl+Z`).
- [x] **Step 6:** Bundle check: `npm run build`; assert no chunk contains `@ai-sdk`/`ai/react`; record main-route JS size. Commit.

---

## Deferred Plans (agreed roadmap)

1. **Templates + design controls** — persian, bronzor, chikorita, azurill, gengar; template picker; color/typography/margin sliders; sidebar layout editor.
2. **Pagination power features** — dnd-kit section ordering across main/sidebar, `startOnNewPage`/`keepTogether` controls, mid-entry splitting, Fit-to-1-Page 3-stage loop in one undo transaction.
3. **PDF import** — 4-stage heuristic parser in a worker, two-column gutter detection, Import Verification Sheet.
4. **AI add-on** — entitlements, AES-GCM vault, 4 providers, live model catalog, refine/scorecard/AI parser (`ai@7`, `generateText` + `Output.object`).
5. **Pro tier** — server, auth, Stripe, cloud sync (separate product; breaks the static-export constraint intentionally).

## My Calls (decisions made during planning, open to revision)

- TypeScript **6.0.3** instead of 7.0.2 (go-native compiler is unproven on the Next 16 toolchain).
- `/editor?id=` instead of `editor/[resumeId]` so `output: 'export'` works without `generateStaticParams`.
- `metadata.schemaVersion: 1` added for future migrations.
- PDF import card hidden behind `PDF_IMPORT_ENABLED = false` until the parser plan lands, rather than shipping a dead button.
- Rich text sanitized with DOMPurify on import and before print (extra dependency, justified by XSS risk).
- Pagination is block-level in the MVP: individual sections never split across pages. Mid-entry splitting is Deferred Plan 2.

## Implementation notes

- CSS Modules are not used. `next.config.ts` applies `@tailwindcss/turbopack` to every `*.css`, which also matches `*.module.css`, empties its class exports, and emits `:global(...)` verbatim. Styles are global stylesheets with prefixed classes (`src/templates/onyx/onyx.css`, `src/components/preview/preview.css`); `src/templates/css-modules.test.ts` fails if a module is reintroduced.
- `usePageLayout` is owned by `EditorWorkspace` and passed to `LiveCanvasViewport`. The preview renders pages at true paper width inside a scaled frame (`computeCanvasFrame`), so measured widths match print.
- The print job freezes `{doc, pages}` when clicked: `@media print` hides `#app-root`, which zeroes the measurement layer and would otherwise collapse the printed document to the header.
- Draft filtering happens in `computePages` (zero-height/hidden sections are dropped), not only in `selectVisibleSectionIds`.
- The Software Engineer preset was trimmed to fit one A4 page; all five presets render as one page at default margins.
- Undo history is in-memory only. Persistence across reload comes from Dexie autosave, not the undo stack.
