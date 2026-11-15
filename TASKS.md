# Resume Maker — Autonomous Task Queue

## Inbox (User Ideas — Add New Requests Here)
- [ ] Add client-side Paste-to-Parse text import on Launcher (`src/components/launcher/Launcher.tsx`)
- [ ] Add lazy-loaded PDF + LinkedIn "Save to PDF" text extraction (`pdfjs-dist`, respecting `PAGES_BASE_PATH`)
- [ ] Add lazy-loaded DOCX import (`mammoth`) and LinkedIn Data Export ZIP/CSV import (`jszip`)

## In Progress (OpenCode Updates This)
_None yet._

## Queue (Ready for Next Run)
- [ ] P0: Show saved Dexie resumes (`src/lib/store/db.ts`) on `/` in `Launcher.tsx` with Open, Duplicate, and Delete actions
- [ ] P0: Add a "Blank Resume" card on `/` and rename presets to "Start from a role sample"
- [ ] P0: Fix live preview zoom bounds/Fit button in `src/components/preview/LiveCanvasViewport.tsx` without breaking mobile pinch/pan
- [ ] P0: Add independent scroll panes on desktop (`lg:`) in `src/components/editor/EditorWorkspace.tsx` while keeping `MobileBottomNav` on mobile
- [ ] P0: Ensure `BasicsForm` (`src/components/editor/BasicsForm.tsx`) updates live preview on `onChange` (~100ms debounce) and standardize `Certifications` date picker
- [ ] P1: Enable the "Fit to 1 Page" button in `src/components/preview/PageOverflowBanner.tsx` using `OnyxTemplate` CSS variables
- [ ] P1: Remove `LevelInput` slider from `SkillsForm.tsx` and tuck optional sections behind `+ Add optional section` in `SectionList.tsx`
- [ ] P1: Expose UI to add/delete `customSections` and rename section headings in `SectionList.tsx`

## Done
<!-- Move completed items here with YYYY-MM-DD, 1-line summary, and files touched -->
