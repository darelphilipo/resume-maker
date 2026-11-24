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
  browser's print dialog to save a sharp PDF at your chosen A4 or Letter size.

## Key features

### Start quickly

- **Three clear ways to begin**: the home page asks you to choose between
  pasting text, uploading a PDF, or starting from scratch, with each option
  explained in plain language. One compact promise line above the choices covers
  free, no-sign-up, and offline use once, so starting stays one tap and the
  options stay near the top of a phone screen.
- **Start blank or from a role sample**: choose **Start with a blank resume**
  when you would rather type from an empty page, or pick a role preset for a
  complete editable example. Every preset opens as a clean one-page starter, so
  nothing spills onto a second page before you change a word. Either way you
  land in the same editor with every field yours to change.
- **Recent resumes** live in their own section on the home page, shown only once
  you have saved something in this browser. The list is newest first: five show
  at a time, with a compact **Prev** / **Page 1 of N** / **Next** bar when there
  are more; tap anywhere on a row to reopen it, or use its buttons to rename,
  duplicate, or delete it. Each row carries a status pill — **Master**,
  **Draft**, **Applied**, **Interview**, or **Offer** — and an optional target
  company tag, so you can see at a glance where each copy stands. Change a
  status from the pill or type a company name right in the row without opening
  the resume; when you have more than one saved, a compact filter line narrows
  the list to a single status. A duplicate is saved as a separate copy labelled
  **(Copy)**, keeping the same tracking tags, so you can tailor one version for
  a job without changing the original. Nothing leaves the device.
- **PDF import**: choose a PDF and its text is read locally in your browser,
  then split into editable contact details plus every standard resume section,
  from summary and experience to projects, certifications, awards, languages,
  interests, volunteer work, publications, and references. Two-column layouts
  keep their sidebar and main body in the right order, decorative icon glyphs
  are dropped, and words split across lines are joined back together. Scanned
  or image-only PDFs need to be pasted as text instead.
- **Paste-to-parse import**: paste the text of an existing resume from a PDF,
  LinkedIn profile, or another tool, and your contact details, summary,
  experience, education, skills, projects, certifications, awards, languages,
  interests, volunteer work, publications, and references become editable
  fields. A **My contact** block is read as contact details, **Hard skills** and
  **Soft skills** keep their heading as the skill category, and a skills row
  that uses several bullets for columns still splits into individual keywords.
  Parsing runs in your browser, and you can correct anything afterwards. School
  names with a comma, such as `University of California, Berkeley`, stay whole.
  An unlabelled opening paragraph becomes your summary, and contact details
  missed at the top are still found wherever they appear in the text. Roles stay
  together across the blank gaps PDFs leave between bullets, `Company as Title`
  and single dates such as `Apr 2026` are understood, and locations like
  `Bengaluru, Karnataka, India` and `London` are recognised.
  **Create resume from text** turns on the moment you type or paste, so one tap
  starts the import. A short hint under the box makes clear that one line is
  enough: your name, a role, or the whole resume all work, and headings and
  dates are optional.
- **Role presets** for Software Engineer, Product Manager, UX/UI Designer,
  Finance & Operations, Data Analyst, and Fresh Graduate, each with a complete,
  one-page editable sample including categorized skills you can adapt. The six
  cards fill the two-column grid evenly, so no role sits beside an empty slot.
- **Backup & Restore** lives at the bottom of the home page as a secondary
  option: restore a JSON backup you exported earlier, or a resume file from
  another tool in the open **JSON Resume** format, without treating JSON as the
  main way to start.
- **JSON export** in the editor at any time so you are never locked in: the
  quiet **⋮** backup menu beside **Save PDF** keeps a full **Resume Maker
  backup** (layout, design, and hidden entries) or downloads the same resume as
  a portable **JSON Resume** file that other resume tools and sites can read.

### Write and organize

- Basics: name, headline, email, phone, and location stay up front, with website,
  an optional one-line work authorization or notice period tag (for example
  `Authorized to work in US` or `Immediate Joiner`), and profile links tucked
  behind one **More contact details** disclosure. The **Basics** card starts
  collapsed, so Summary, Experience, Projects, Education, and Skills are the
  first sections you see. The top header title and center resume preview follow
  every keystroke, so there is no second name preview to scan past — no need to
  leave the field. Paste a photo URL and a live thumbnail appears; if the image
  cannot load, the editor says so instead of showing a broken picture, and the
  resume header widens cleanly without an empty photo slot. Checking **Hide
  picture** removes the photo URL field as well, so there is nothing to fill in
  for a picture that will not print. Paste your website and it is shown without
  `https://` or `www.` — there is no separate label to maintain.
- Profiles: paste a profile URL such as `github.com/you` and the network,
  username, and icon are filled in automatically. Visible profiles also appear
  inline in the resume header beside your website, as clean clickable links with
  GitHub, LinkedIn, and other common resume-network marks (a globe for anything
  else), so recruiters can reach them without scrolling. When every profile has
  a link, that header line is the only place they print — no repeated Profiles
  section. Tap **Manage profiles** in Basics to expand and jump straight to the
  same list. A row with only a URL still counts, so pasted links are never
  silently dropped.
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
  narrow desktop Content column. Experience and project bullets offer four
  tappable fill-in formulas: **Reduced [metric] by [X%] by [action]**,
  **Built [feature/system] for [N] users, improving [outcome]**,
  **Led [team/project] to deliver [result]**, and
  **Automated [workflow], saving [N] hrs/wk**. Tap a formula to drop the whole
  skeleton at your cursor, replace the bracketed parts with your own facts, and
  keep the result. Each formula wraps neatly to its own left edge, and
  everything inserts cleanly after the existing sentence with a leading space
  when needed, so words never run together; tap **Writing helpers** to tuck the
  strip away so your bullets stay in view. A blank bullet
  left at the end of a list is ignored in the preview, PDF, and ATS text, so it
  never prints as a stray dot.
- Skills grouped by an optional category with comma-separated keywords (for
  example `Languages: Python, SQL`), with no self-ratings to maintain. A
  keyword-only row stays visible without a blank category line, so pasted lists
  such as `SQL, Excel, Tableau` show up as soon as they are imported; projects
  and interests use the same comma-separated tags.
- One Month + Year picker for every date field (month list plus a four-digit
  year), so `2023-10` stays consistent and no browser opens a slow year
  scroller. A year on its own is enough when that is all you know, and prints as
  `2018 — 2019`. Stray years outside 1950–2100 are caught right under the field
  and never reach the preview or PDF. End dates for current roles have a
  **Present** toggle, and a quiet note appears under the End date when it sits
  before the Start date.
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
  anchored on Page 1 and is capped at that page's remaining height; anything
  that does not fit moves into the full-width main flow on later pages, so the
  two columns can never overflow the paper. Later pages give the main column the
  full page width instead of leaving an empty sidebar beside it. Side-column
  sections use their own Page 1 budget, so they never eat into the space that
  later main sections need — trailing sections such as Awards stay on the page
  with room instead of being pushed onto a nearly empty extra page, and a resume
  whose main column already fits on Page 1 never grows a blank second page.
  Page 1 is measured in the two-column shape you see, while later pages are
  measured at the full page width they actually use — so a section that only
  clears the page once the sidebar is gone is not pushed to an extra page.
  **Save as PDF** prints each measured page inside an exact, clipped page box,
  so the PDF never starts with a blank page holding only your name.
- **Accent, fonts, and density** in Design: pick an accent from seven curated
  colors (or plain monochrome) in one compact strip of round swatches — the
  selected color wears a crisp ring and checkmark, and its name appears on hover
  or as a screen-reader label. **Sans**, **Serif**, and **Classic** pairings and
  **Compact**, **Normal**, and **Relaxed** spacing sit in short one-row controls,
  with each font name drawn in the typeface it applies. All four design choices
  stay scannable without heavy scrolling, even on a phone. Each template card
  shows its **ATS-Safe** (or human review) badge in the same top-right spot, so
  the labels never jump around as you compare them. The preview, page count, and
  printed PDF all use the same choices, so the look you pick is the one you save.
- A4 and US Letter page sizes — tap **A4** or **Letter** in the page-size control
  to switch.
- Live paginated preview that measures real content, not an estimate. Long
  sections fill the current page entry by entry — with each heading kept next
  to its first entry — instead of jumping wholesale to the next page and leaving
  most of Page 1 blank. A single very tall role or project also continues at a
  clean bullet boundary on the next page: its header stays with the first
  bullets, the remaining bullets print as a continuation, and the PDF never
  clips the end of the entry or starts with a blank page. Prose and bullets wrap
  at natural word boundaries in both the preview and the PDF, so words never
  split mid-word; only long links break anywhere they need to.
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
  resume itself fills as much of the screen as possible. The top bar keeps just
  the **Visual / ATS** switch, one compact page pill, and one **Review** pill;
  trim hints, fitting, and the occasional review lenses live inside it instead of
  crowding the live resume. Page 1 keeps
  breathing room above and below, so its top edge and shadow never clip. On tall
  tablets and phones showing the desktop site, the fitted page sits centred with
  even side margins, and the gray preview desk wraps the first and last pages
  instead of ending short of the paper or trailing into empty space. Short
  Content or Design cards stay vertically balanced above the bar.
- **Scroll or zoom the preview naturally**: on a phone, two fingers zoom the
  resume and a one-finger drag moves freely in any direction across the zoomed
  page. At normal size a one-finger swipe scrolls a multi-page preview smoothly
  and natively, while the preview header stays fixed, so pages stop cleanly at
  its edge instead of slipping behind the page-count pill. When a drag reaches
  the top or bottom of the zoomed page, the same swipe keeps scrolling on to the
  next page, so you can always reach every part of a long resume without
  zooming out. A small **Reset** button floats over the bottom-right
   of the preview only while zoomed, so the top bar never crowds **Review**,
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
  Whenever a reduced fit is active, **Reset fit** inside **Review** returns the
  page to 100%.
- **A calm page count.** A resume that fits on one page just shows a quiet
  **1 page** label in the top bar, with no extra row stealing height from the
  paper. When it spills, that same bar shows one compact pill such as
  **2 pages · Fit**; if one page would need unreadable type, the pill shows the
  **Min 78%** floor instead of a truncated sentence. There is no second toolbar
  row, so the live resume keeps the reclaimed space.
- **Trim tips** find the bullets that quietly cost you a line. When a bullet
  wraps and leaves only a word or two on its last line, or grows into a long
  block, the preview counts it. Open **Review** and tap **Trim tips (N)** to see a
  dismissible list with each bullet's opening words and a plain-language reason;
  it covers the preview only while open, so the resume stays fully readable on a
  phone. Trimming those bullets can reclaim whole lines before you shrink the
  font or spill onto a second page.
- **Bullet polish** in the Content panel header flags the small consistency
  problems a recruiter notices first: bullets that mix ending periods,
  first-person pronouns, filler adverbs, and repeated opening verbs within one
  role. It is a quiet pill beside **Match JD**, so neither competes with
  **Save PDF**; tapping it opens a centred modal that always stays inside the
  screen and closes with its own X, a tap on the dimmed background, or Escape.
  Each finding shows the opening words so you can find the bullet, and
  **Standardize bullet periods** can remove every trailing period or add one to
  every bare bullet in a single undoable tap. The check runs locally with plain
  rules — no AI and no network.
- **ATS plain-text view** that shows the exact linear text a parser reads from
  the current template, so you can check section order and wording before you
  apply. **Copy all plain text** grabs the whole resume for Workday, Greenhouse,
  or Lever in one tap, and compact **Copy** buttons let you paste just one
  section or one role. The copy bar and every section scroll together as one
  smooth page, with no nested box to fight against on a phone.
- **Anonymize for review**: open **Review** in the preview bar and switch on
  **Anonymize** to replace your name, contact details, website, profile links,
  photo, and company or school names with neutral placeholders. Each role's,
  school's, volunteer entry's, and custom entry's location is replaced too, so
  personal geography cannot give you away. Project, certification, publication,
  and custom-section links are replaced as well, so a username inside a URL
  cannot leak. A dot on the **Review** pill and a note in the menu make review
  mode obvious, the Visual and ATS views and the PDF all use the hidden version,
  and your saved resume is never changed — switch it off again to return to the
  real details.
- **6-Second recruiter scan**: in the same **Review** menu, switch on **6s Scan**
  to see your resume the way a hurried recruiter does. Body prose fades back
  while your name, headline, section headings, job titles, companies, dates,
  bold phrases, and numbers such as `40%`, `$1.2M`, or `3x` stay at full
  contrast, so you can tell at a glance whether your impact pops out. It is a
  preview lens only: the scan is never added to the printed PDF or your saved
  resume, and you switch it off the same way.
- **Job description keyword matcher**: tap **Match JD** in the Content panel
  header to open the matcher on any device, then paste a posting to see which
  of its keywords already appear in your resume and which are missing. Common
  filler words such as “for”, “looking”, and “hiring” are ignored, and keywords
  match whole words only — so “rust” never counts just because “trust” appears.
  Tech names such as C++, C#, Node.js, and .NET are recognised, including
  product forms like ASP.NET. On phones it opens as a bottom sheet; on desktop
  it opens as a centred modal. Either way one tap on the **X** (or the dimmed
  background) closes it outright, with no half-collapsed bar left behind.
  Matching runs locally with simple word heuristics, not AI.
- The **Visual / ATS** switch, page pill, and **Review** pill stay pinned in one
  calm top bar, so none of them ever cover your name or header — and the paper
  starts cleanly below that bar instead of sliding underneath a second strip.
- Print/PDF filenames are generated from your name, headline, and date. While
  **Anonymize** is on, the filename uses the placeholder name too, so the file
  itself does not reveal who the resume belongs to. The browser tab keeps
  showing the resume name while the editor is open, so phones and tablets that
  prepare the PDF after the print dialog closes still suggest the right name.

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

The PDF uses the paper size you picked in **Design** (A4 or Letter). Some mobile
print dialogs still open on the other size, so set **Paper size** to the value
named in the reminder and nothing will be clipped. Turn off browser headers and
footers as well so the page URL and date do not appear. Hover or focus **Save
PDF** to see both reminders, or tap the info button beside it on a touch device.

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
