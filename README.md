# Resume Maker

**A free, no-sign-up, no-AI resume builder that runs entirely in your browser.**

Resume Maker exists to make one job quick and predictable: turn your experience
into a clean, professional resume and save it as a PDF. No account, no paywall,
no watermark, no prompts to "upgrade", and no AI rewriting your words. You stay
in control of every line, and your data stays on your device.

[Open Resume Maker](https://darelphilipo.github.io/resume-maker/) ·
[Read the project notes](CONTEXT.md)

## Why people use it

- **Free forever.** Every feature is available without an account or payment.
- **No AI.** Nothing is generated, rewritten, or sent to a model. You write it.
- **Private by design.** Resumes are stored in your browser (IndexedDB). The app
  has no backend, accounts, or analytics on your resume content.
- **Fast on a phone.** The editor is mobile-first, with large touch targets and
  a layout that works at phone width instead of a desktop screen squeezed down.
  The resume name, undo/redo, JSON backup, and Save PDF share one compact header
  row, so the preview keeps the height.
- **Honest PDF output.** Preview the exact pages before printing, then use your
  browser's print dialog to save a sharp PDF.

## Key features

### Start quickly

- **Three clear ways to begin**: the home page asks you to choose between
  pasting text, uploading a PDF, or starting from scratch, with each option
  explained in plain language. The free, no-sign-up, offline promises sit
  together on one compact line above the choices, so starting stays one tap and
  the options stay near the top of a phone screen.
- **Start blank or from a role sample**: choose **Start with a blank resume**
  when you would rather type from an empty page, or pick a role preset for a
  complete editable example. Either way you land in the same editor with every
  field yours to change.
- **Recent resumes** on the home page list what you already saved in this
  browser, newest first, so you can reopen a resume, rename it, or delete it
  without an account. Nothing leaves the device.
- **PDF import**: choose a PDF and its text is read locally in your browser,
  then split into editable contact details, summary, experience, education, and
  skills. Scanned or image-only PDFs need to be pasted as text instead.
- **Paste-to-parse import**: paste the text of an existing resume from a PDF,
  LinkedIn profile, or another tool, and your contact details, summary,
  experience, education, and skills are split into editable fields. Parsing
  runs in your browser, and you can correct anything afterwards. School names
  with a comma, such as `University of California, Berkeley`, stay whole, and
  skills keep their categories under headings such as **Skills & Expertise**.
- **Role presets** for Software Engineer, Product Manager, UX/UI Designer,
  Finance & Operations, and Fresh Graduate, each with a complete editable sample
  including categorized skills you can adapt.
- **Backup & Restore** lives at the bottom of the home page as a secondary
  option: restore a JSON backup you exported earlier, without treating JSON as
  the main way to start.
- **JSON backup export** in the editor at any time so you are never locked in.

### Write and organize

- Basics: name, headline, email, phone, location, website, optional photo, and
  an optional one-line work authorization or notice period tag (for example
  `Authorized to work in US` or `Immediate Joiner`). A name preview above the
  fields follows every keystroke, and the top header title and center resume
  preview update with it as you type — no need to leave the field. Paste a photo
  URL and a live thumbnail appears; if the image cannot
  load, the editor says so instead of showing a broken picture, and the resume
  header widens cleanly without an empty photo slot. Paste your website and it
  is shown without `https://` or `www.` — there is no separate label to
  maintain.
- Profiles: paste a profile URL such as `github.com/you` and the network,
  username, and icon are filled in automatically.
- Summary plus Profiles, Experience, Projects, Education, Skills, and
  Certifications, with optional Awards, Languages, Interests, Volunteer,
  Publications, and References.
- Rich-text descriptions with bold, italic, bullet/numbered lists, links, and
  editor undo. Every formatting control stays in reach, even in the narrow
  desktop Content column. Experience and project bullets offer a compact, tidy
  row of one-tap action verbs (**Built**, **Reduced**, **Led**, **Automated**)
  plus an `[Action] + [What] + [Result by X%]` prompt, so achievements start
  with impact and end with a number. The verb lands cleanly after the existing
  sentence and gets a leading space when needed, so words never run together.
- Skills grouped by an optional category with comma-separated keywords (for
  example `Languages: Python, SQL`), with no self-ratings to maintain. A
  keyword-only row stays visible without a blank category line, so pasted lists
  such as `SQL, Excel, Tableau` show up as soon as they are imported; projects
  and interests use the same comma-separated tags.
- One Month + Year picker for every date field (month list plus a four-digit
  year), so `2023-10` stays consistent and no browser opens a slow year
  scroller. End dates for current roles have a **Present** toggle.
- Add, delete, hide, and reorder entries inside each section. Moving an entry up
  or down keeps your place in the list: the Content column does not jump back to
  the top, and the Move button you just tapped stays focused for the next move.
- Rename any section heading, and create your own sections for anything the
  standard list does not cover, such as speaking, patents, or coursework.
  Custom sections can be deleted when you no longer need them.
- Show, hide, and reorder whole sections; empty sections stay out of the PDF.
  The Show/Hide, Move up, Move down, and Open section editor controls line up in
  an orderly grid with even-sized buttons, so nothing sits at odd angles.
  Awards, Languages, Interests, Volunteer, Publications, and References stay
  tucked behind **Add optional section** until you need them.
- On a phone, **Open section editor** opens that section in a single full editor
  sheet, so switching between sections stays quick even on a long resume. The
  sheet has an **X** in the top-right corner to close it, as well as the familiar
  swipe-down gesture. When the on-screen keyboard opens, the sheet shrinks to
  stay above it, so the title and close button remain in reach, and the fields
  never slide sideways.

### Design and preview

- **Six resume templates** in Design: Engineering Classic (Jake), Ivy/Executive
  (Harvard), Modern Accent, Compact 1-Pager, and Hybrid Skills-First are
  single-column layouts badged **ATS-Safe**, so a parser reads them in one clean
  top-to-bottom flow. **Studio Sidebar** is a two-column option badged **Best
  for direct/human review**. Pick one by tapping its card — your content, page
  size, and saves are unchanged, and the preview and PDF use the same layout.
  On multi-page resumes its narrow side column (Skills, Certifications,
  Languages, Interests) stays anchored on Page 1; later pages give the main
  column the full page width instead of leaving an empty sidebar beside it.
- **Accent, fonts, and density** in Design: pick an accent from six curated
  colors (or plain monochrome), choose a **Sans**, **Serif**, or **Classic**
  body/heading pairing, and set spacing to **Compact**, **Normal**, or
  **Relaxed**. Every swatch shows its full color name without clipping, whether
  you are on a phone or using the narrow desktop Design column. The preview,
  page count, and printed PDF all use the same choices, so the look you pick is
  the one you save.
- A4 and US Letter page sizes — click anywhere on a page-size card to switch.
- Live paginated preview that measures real content, not an estimate. Long
  sections fill the current page entry by entry — with each heading kept next
  to its first entry — instead of jumping wholesale to the next page and leaving
  most of Page 1 blank. Prose and bullets wrap at natural word boundaries in
  both the preview and the PDF, so words never split mid-word; only long links
  break anywhere they need to.
- **Preview and Design stay in view on desktop**: on a wide window the resume
  preview and the Design controls stay pinned below the header while you scroll
  a long Content list, and each of those two columns scrolls on its own. Moving
  a section up or down keeps your place in the preview, so it never snaps back
  to Page 1 while the pages re-measure. Phones keep the one-tab-at-a-time
  layout, so nothing is squeezed.
- **Scroll or zoom the preview naturally**: on a phone, two fingers zoom the
  resume and a one-finger drag moves freely in any direction across the zoomed
  page. At normal size a one-finger swipe scrolls a multi-page preview smoothly
  and natively, while the preview header stays fixed, so pages stop cleanly at
  its edge instead of slipping behind the page-count pill. When a drag reaches
  the top or bottom of the zoomed page, scrolling eases in smoothly, so you can
  always reach every page. A small **Reset** button appears only while zoomed
  and returns the page to its fitted width; **Reset** and **Reset fit** both
  bring you back to the top of the resume, just like when you first open the
  Preview tab. On a computer, the mouse wheel and two-finger scrolling move the
  editor; hold **Ctrl** (or **⌘**) while scrolling to zoom the resume.
- **Fit to 1 Page** when a resume spills just past one page. Fitting never
  shrinks the page below a readable size — if one page would need microscopic
  type, the preview says so instead. Whenever a reduced fit is active, a
  **Reset fit** pill in the preview header returns the page to 100%.
- **ATS plain-text view** that shows the exact linear text a parser reads from
  the current template, so you can check section order and wording before you
  apply.
- **Job description keyword matcher**: tap **Match JD** in the Content panel
  header to open the matcher on any device, then paste a posting to see which
  of its keywords already appear in your resume and which are missing. Matching
  runs locally with simple word heuristics, not AI.
- The **Visual / ATS text** switch, page-count pill, fit/zoom reset pills, and
  overflow warning stay pinned above the paper while you scroll, so they never
  cover your name or header — and the paper stops cleanly below that header
  instead of sliding underneath it.
- Print/PDF filenames are generated from your name, headline, and date.

### Keep your work

- Automatic local saves while you edit.
- Undo and redo from the header or with `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`.
- Download a JSON backup whenever you want a portable copy.

## Save a PDF

1. Open a resume in the editor.
2. Check the page count in the Preview tab.
3. Choose **Save PDF**.
4. In the browser print dialog, choose **Save as PDF**.

For the cleanest result, turn off browser headers and footers in the print
dialog so the page URL and date do not appear in the PDF. Hover or focus
**Save PDF** to see the reminder, or tap the info button beside it on a touch
device.

## Run it locally

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The app is a static export, so production builds
work on any static host:

```bash
npm run build
```

## Development

```bash
npm run typecheck   # TypeScript
npm test            # unit tests (Vitest)
npm run lint        # ESLint
npm run build       # static production export
```

The stack is Next.js (App Router, static export), React, TypeScript, Tailwind
CSS, Zustand, Dexie/IndexedDB, Zod, TipTap, and the browser print engine.

## Keeping this README useful

This README is the **user-facing feature tour**, not a changelog. When a run or
contributor adds a user-visible capability, add or update a short bullet in
**Key features** describing what the user can now do. Do not append session logs
or implementation history here; those belong in `CONTEXT.md` and `TASKS.md`.
