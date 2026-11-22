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
  The resume name, undo/redo, JSON export, and a solid **Save PDF** button share
  one compact header row, so the preview keeps the height.
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
  browser, newest first. The five most recent show first, with a **Show all**
  toggle for the rest; tap anywhere on a row to reopen it, or use its buttons to
  rename, duplicate, or delete it. Each row carries a status pill — **Master**,
  **Draft**, **Applied**, **Interview**, or **Offer** — and an optional target
  company tag, so you can see at a glance where each copy stands. Change a
  status from the pill or type a company name right in the row without opening
  the resume; when you have more than one saved, a compact filter line narrows
  the list to a single status. A duplicate is saved as a separate copy labelled
  **(Copy)**, keeping the same tracking tags, so you can tailor one version for
  a job without changing the original. Nothing leaves the device.
- **PDF import**: choose a PDF and its text is read locally in your browser,
  then split into editable contact details, summary, experience, education, and
  skills. Scanned or image-only PDFs need to be pasted as text instead.
- **Paste-to-parse import**: paste the text of an existing resume from a PDF,
  LinkedIn profile, or another tool, and your contact details, summary,
  experience, education, and skills are split into editable fields. Parsing
  runs in your browser, and you can correct anything afterwards. School names
  with a comma, such as `University of California, Berkeley`, stay whole, and
  skills keep their categories under headings such as **Skills & Expertise**.
  **Create resume from text** turns on the moment you type or paste, so one tap
  starts the import. A short hint under the box makes clear that one line is
  enough: your name, a role, or the whole resume all work, and headings and
  dates are optional.
- **Role presets** for Software Engineer, Product Manager, UX/UI Designer,
  Finance & Operations, Data Analyst, and Fresh Graduate, each with a complete
  editable sample including categorized skills you can adapt. The six cards fill
  the two-column grid evenly, so no role sits beside an empty slot.
- **Backup & Restore** lives at the bottom of the home page as a secondary
  option: restore a JSON backup you exported earlier, or a resume file from
  another tool in the open **JSON Resume** format, without treating JSON as the
  main way to start.
- **JSON export** in the editor at any time so you are never locked in: keep a
  full **Resume Maker backup** (layout, design, and hidden entries) or download
  the same resume as a portable **JSON Resume** file that other resume tools and
  sites can read.

### Write and organize

- Basics: name, headline, email, phone, location, website, optional photo, and
  an optional one-line work authorization or notice period tag (for example
  `Authorized to work in US` or `Immediate Joiner`). The top header title and
  center resume preview follow every keystroke, so there is no second name
  preview to scan past — no need to leave the field. Paste a photo
  URL and a live thumbnail appears; if the image cannot
  load, the editor says so instead of showing a broken picture, and the resume
  header widens cleanly without an empty photo slot. Paste your website and it
  is shown without `https://` or `www.` — there is no separate label to
  maintain.
- Profiles: paste a profile URL such as `github.com/you` and the network,
  username, and icon are filled in automatically. Visible profiles also appear
  inline in the resume header beside your website, as clean clickable links with
  GitHub, LinkedIn, and other common resume-network marks (a globe for anything
  else), so recruiters can reach them without scrolling. Tap **Manage profiles**
  in Basics to edit the same list. A row with only a URL still counts, so pasted
  links are never silently dropped.
- **Everything you type makes it into the resume.** Your website, profile links,
  certification links, and publication links appear as clickable links in the
  preview and PDF — even if you pasted a bare address such as `github.com/you` —
  and as plain text in the ATS view. An Education **grade** prints beside the
  school and degree too, so no field quietly disappears between the editor and
  the final document.
- Summary plus Profiles, Experience, Projects, Education, Skills, and
  Certifications, with optional Awards, Languages, Interests, Volunteer,
  Publications, and References.
- Rich-text descriptions with bold, italic, bullet/numbered lists, links, and
  editor undo. All eight formatting controls share one tidy row, even in the
  narrow desktop Content column. Experience and project bullets offer a compact
  row of one-tap action verbs (**Built**, **Reduced**, **Led**, **Automated**)
  plus four tappable fill-in formulas: **Reduced [metric] by [X%] by [action]**,
  **Built [feature/system] for [N] users, improving [outcome]**,
  **Led [team/project] to deliver [result]**, and
  **Automated [workflow], saving [N] hrs/wk**. Tap a formula to drop the whole
  skeleton at your cursor, replace the bracketed parts with your own facts, and
  keep the result. Everything inserts cleanly after the existing sentence with a
  leading space when needed, so words never run together; tap **Writing
  helpers** to tuck the strip away so your bullets stay in view. A blank bullet
  left at the end of a list is ignored in the preview, PDF, and ATS text, so it
  never prints as a stray dot.
- Skills grouped by an optional category with comma-separated keywords (for
  example `Languages: Python, SQL`), with no self-ratings to maintain. A
  keyword-only row stays visible without a blank category line, so pasted lists
  such as `SQL, Excel, Tableau` show up as soon as they are imported; projects
  and interests use the same comma-separated tags.
- One Month + Year picker for every date field (month list plus a four-digit
  year), so `2023-10` stays consistent and no browser opens a slow year
  scroller. End dates for current roles have a **Present** toggle, and a quiet
  note appears under the End date when it sits before the Start date.
- **Sort newest first** appears above Experience, Education, or Projects when
  two or more entries are out of order, so one tap puts current roles and the
  latest dates at the top (undo still works).
- **Group promotions at the same company**: turn on the Experience option and
  consecutive roles at one employer share a single company, location, and
  combined date header, with each promotion's title, own dates, and bullets
  stacked cleanly beneath it. The ATS text view stays a simple linear list, so
  parsers still read every role in order.
- Add, delete, hide, and reorder entries inside each section. The eye button on
  an entry hides it from the preview, ATS text, and PDF without deleting it: the
  card stays in the editor with a dimmed look and a **Show** eye button until
  you bring it back. Delete buttons read as destructive on hover without
  shouting at you. Moving an entry up or down keeps your place in the list: the
  Content column does not jump back to the top, and the Move button you just
  tapped stays focused for the next move.
- Rename any section heading, and create your own sections for anything the
  standard list does not cover, such as speaking, patents, or coursework.
  Custom sections can be deleted when you no longer need them.
- Show, hide, and reorder whole sections; empty sections stay out of the PDF.
  The Show/Hide, Move up, Move down, and Open section editor controls line up in
  a two-column grid with even-sized buttons, so labels and arrows stay inside
  the card even in the narrow desktop Content column.
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
  Its narrow side column (Skills, Certifications, Languages, Interests) stays
  anchored on Page 1; later pages give the main column the full page width
  instead of leaving an empty sidebar beside it, and a resume whose main column
  already fits on Page 1 never grows a blank second page. Page breaks are
  measured in the same two-column shape you see, so switching to **Compact**
  density or a tighter font can never report one page while the bottom of the
  main column is cut off.
- **Accent, fonts, and density** in Design: pick an accent from seven curated
  colors (or plain monochrome), choose a **Sans**, **Serif**, or **Classic**
  body/heading pairing, and set spacing to **Compact**, **Normal**, or
  **Relaxed**. The selected swatch is marked with a checkmark and a filled
  border (no extra radio dot to decode), the active density card keeps the same
  clear highlight, and each font name is drawn in the typeface it applies. Every
  swatch shows its full color name without clipping, and the eight options fill
  the two-column grid evenly, whether you are on a phone or using the narrow
  desktop Design column. Each template card shows its **ATS-Safe** (or human
  review) badge in the same top-right spot, so the labels never jump around as
  you compare them. The preview, page count, and printed PDF all use the same
  choices, so the look you pick is the one you save.
- A4 and US Letter page sizes — click anywhere on a page-size card to switch.
- Live paginated preview that measures real content, not an estimate. Long
  sections fill the current page entry by entry — with each heading kept next
  to its first entry — instead of jumping wholesale to the next page and leaving
  most of Page 1 blank. Prose and bullets wrap at natural word boundaries in
  both the preview and the PDF, so words never split mid-word; only long links
  break anywhere they need to.
- **Three tidy columns on desktop**: on a wide window the editor fills the
  screen, and Content, Preview, and Design each scroll on their own instead of
  growing the page and leaving a second scrollbar at the right edge. Moving a
  section up or down keeps your place in the preview, so it never snaps back to
  Page 1 while the pages re-measure; reordering individual entries keeps your
  place in Content too. Your name follows every keystroke in both the header and
  the preview canvas, without waiting for a pause. Phones keep the
  one-tab-at-a-time layout, and the tab you are on gets a filled highlight plus a
  top indicator, so Content, Design, and Preview are never ambiguous. The bottom
  bar stays flush with the screen edge while you switch tabs or try a new accent,
  template, or paper size. On a phone, the Preview controls collapse into one
  tight, sideways-scrollable row and the panel's extra padding is trimmed, so the
  resume itself fills as much of the screen as possible. On tall tablets and
  phones showing the desktop site,
  the fitted page sits centred with even side margins, the gray preview desk ends
  with the last page instead of trailing into empty space, and short Content or
  Design cards stay vertically balanced above the bar.
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
  The fitted page holds its size and position
  when a scrollbar appears or disappears, so it never shrinks and grows on its
  own.
- **Fit to 1 Page** when a resume spills just past one page. Fitting never
  shrinks the page below a readable size — if one page would need microscopic
  type, the preview says so instead. The fitted width keeps a little breathing
  room at the right edge, so right-aligned dates never lose their last pixels.
  Whenever a reduced fit is active, a **Reset fit** pill in the preview header
  returns the page to 100%.
- **Trim tips** find the bullets that quietly cost you a line. When a bullet
  wraps and leaves only a word or two on its last line, or grows into a long
  block, the preview counts it. Tap **Trim tips** in the preview header to open a
  dismissible list with each bullet's opening words and a plain-language reason;
  it covers the preview only while open, so the resume stays fully readable on a
  phone. Trimming those bullets can reclaim whole lines before you shrink the
  font or spill onto a second page.
- **Bullet polish** in the Content panel header flags the small consistency
  problems a recruiter notices first: bullets that mix ending periods,
  first-person pronouns, filler adverbs, and repeated opening verbs within one
  role. It is a quiet text button beside **Match JD**; tapping it opens a compact
  panel that stays inside the screen and closes with its own X or Escape. Each
  finding shows the opening words so you can find the bullet, and
  **Standardize bullet periods** can remove every trailing period or add one to
  every bare bullet in a single undoable tap. The check runs locally with plain
  rules — no AI and no network.
- **ATS plain-text view** that shows the exact linear text a parser reads from
  the current template, so you can check section order and wording before you
  apply. **Copy all plain text** grabs the whole resume for Workday, Greenhouse,
  or Lever in one tap, and compact **Copy** buttons let you paste just one
  section or one role. The copy bar and every section scroll together as one
  smooth page, with no nested box to fight against on a phone.
- **Anonymize for review**: tap the **Anonymize** pill in the preview header to
  replace your name, contact details, website, profile links, photo, and company
  or school names with neutral placeholders. Each role's, school's, volunteer
  entry's, and custom entry's location is replaced too, so personal geography
  cannot give you away. Project, certification, publication, and custom-section
  links are replaced as well, so a username inside a URL cannot leak. The banner
  makes review mode obvious, the Visual and ATS views and the PDF all use the
  hidden version, and your saved resume is never changed — tap the pill again to
  return to the real details.
- **6-Second recruiter scan**: tap the **6s Scan** pill beside **Anonymize** to
  see your resume the way a hurried recruiter does. Body prose fades back while
  your name, headline, section headings, job titles, companies, dates, bold
  phrases, and numbers such as `40%`, `$1.2M`, or `3x` stay at full contrast, so
  you can tell at a glance whether your impact pops out. It is a preview lens
  only: the scan is never added to the printed PDF or your saved resume, and one
  more tap turns it off.
- **Job description keyword matcher**: tap **Match JD** in the Content panel
  header to open the matcher on any device, then paste a posting to see which
  of its keywords already appear in your resume and which are missing. Common
  filler words such as “for”, “looking”, and “hiring” are ignored, and keywords
  match whole words only — so “rust” never counts just because “trust” appears.
  Tech names such as C++, C#, Node.js, and .NET are recognised, including
  product forms like ASP.NET. One tap on the drawer's **X** closes it. Matching
  runs locally with simple word heuristics, not AI.
- The **Visual / ATS text** switch, page-count pill, fit/zoom reset pills, and
  overflow warning stay pinned above the paper while you scroll, so they never
  cover your name or header — and the paper stops cleanly below that header
  instead of sliding underneath it.
- Print/PDF filenames are generated from your name, headline, and date. While
  **Anonymize** is on, the filename uses the placeholder name too, so the file
  itself does not reveal who the resume belongs to.

### Keep your work

- Automatic local saves while you edit.
- Undo and redo from the header or with `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`.
- Export from the header whenever you want a portable copy. Choose **Resume
  Maker backup** for a complete file that reopens here with your layout, design,
  and hidden entries intact, or **JSON Resume** for the open standard format
  used by other resume tools. JSON Resume exports include the resume you see
  (hidden sections and entries stay out), and importing either format works
  through the same **Backup & Restore** picker on the home page.

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
