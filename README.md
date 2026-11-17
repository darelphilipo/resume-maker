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
  pasting text, uploading a PDF, or starting from a role sample, with each
  option explained in plain language. The free, no-sign-up, offline promises sit
  together on one compact line above the choices, so starting stays one tap and
  the options stay near the top of a phone screen.
- **PDF import**: choose a PDF and its text is read locally in your browser,
  then split into editable contact details, summary, experience, education, and
  skills. Scanned or image-only PDFs need to be pasted as text instead.
- **Paste-to-parse import**: paste the text of an existing resume from a PDF,
  LinkedIn profile, or another tool, and your contact details, summary,
  experience, education, and skills are split into editable fields. Parsing
  runs in your browser, and you can correct anything afterwards.
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
  `Authorized to work in US` or `Immediate Joiner`). Paste your website and it
  is shown without `https://` or `www.` — there is no separate label to
  maintain.
- Profiles: paste a profile URL such as `github.com/you` and the network,
  username, and icon are filled in automatically.
- Summary plus Profiles, Experience, Projects, Education, Skills, and
  Certifications, with optional Awards, Languages, Interests, Volunteer,
  Publications, and References.
- Rich-text descriptions with bold, italic, bullet/numbered lists, links, and
  editor undo. Experience and project bullets offer one-tap action verbs
  (**Built**, **Reduced**, **Led**, **Automated**) plus an
  `[Action] + [What] + [Result by X%]` prompt, so achievements start with impact
  and end with a number.
- Skills grouped by category with comma-separated keywords (for example
  `Languages: Python, SQL`), with no self-ratings to maintain; projects and
  interests use the same comma-separated tags.
- One Month + Year picker for every date field (month list plus a four-digit
  year), so `2023-10` stays consistent and no browser opens a slow year
  scroller. End dates for current roles have a **Present** toggle.
- Add, delete, hide, and reorder entries inside each section.
- Rename any section heading, and create your own sections for anything the
  standard list does not cover, such as speaking, patents, or coursework.
  Custom sections can be deleted when you no longer need them.
- Show, hide, and reorder whole sections; empty sections stay out of the PDF.
  Awards, Languages, Interests, Volunteer, Publications, and References stay
  tucked behind **Add optional section** until you need them.

### Design and preview

- Clean single-column **Onyx** template designed for readable PDFs.
- A4 and US Letter page sizes.
- Live paginated preview that measures real content, not an estimate.
- **Pinch to zoom** the preview on a touch screen: two fingers zoom the resume,
  then a one-finger sideways drag moves across the zoomed page. Vertical
  swipes still scroll the editor, so the toolbar no longer pushes the resume
  down. A small **Reset** button appears only while you are zoomed in and
  returns the page to its fitted width. On desktop, the mouse wheel and
  dragging work as before.
- **Fit to 1 Page** when a resume spills just past one page.
- **ATS plain-text view** that shows the exact linear text a parser reads from
  the current template, so you can check section order and wording before you
  apply.
- **Job description keyword matcher**: paste a posting to see which of its
  keywords already appear in your resume and which are missing. Matching runs
  locally with simple word heuristics, not AI.
- A page-count and overflow warning before you print.
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
