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
- **Honest PDF output.** Preview the exact pages before printing, then use your
  browser's print dialog to save a sharp PDF.

## Key features

### Start quickly

- **Role presets** for Software Engineer, Product Manager, UX/UI Designer,
  Finance & Operations, and Fresh Graduate, each with a complete editable sample.
- **JSON backup import** to continue a resume you exported earlier.
- **JSON backup export** at any time so you are never locked in.

### Write and organize

- Basics: name, headline, email, phone, location, website, and optional photo.
- Summary plus Profiles, Experience, Projects, Education, Skills, and
  Certifications, with optional Awards, Languages, Interests, Volunteer,
  Publications, and References.
- Rich-text descriptions with bold, italic, bullet/numbered lists, links, and
  editor undo.
- Comma-separated keyword tags for skills, projects, and interests.
- Month pickers for dates, so `2023-10` stays consistent everywhere.
- Add, delete, hide, and reorder entries inside each section.
- Show, hide, and reorder whole sections; empty sections stay out of the PDF.

### Design and preview

- Clean single-column **Onyx** template designed for readable PDFs.
- A4 and US Letter page sizes.
- Live paginated preview that measures real content, not an estimate.
- Zoom and pan the preview on desktop; swipe naturally on touch devices.
- **Fit to 1 Page** when a resume spills just past one page.
- **ATS plain-text view** that shows the exact linear text a parser reads from
  the current template, so you can check section order and wording before you
  apply.
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
dialog so the page URL and date do not appear in the PDF.

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
