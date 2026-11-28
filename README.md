# Resume Maker

**A free, no-sign-up resume builder that runs entirely in your browser.**

Resume Maker exists to make one job quick and predictable: turn your experience
into a clean, professional resume and save it as a PDF. No account, no paywall,
no watermark, no prompts to "upgrade", and no AI rewriting your words. You stay
in control of every line, and your data stays on your device.

[Open Resume Maker](https://darelphilipo.github.io/resume-maker/) ·
[Read the project notes](CONTEXT.md)

## Why people use it

- **Free forever.** Every feature is available without an account or payment.
- **No AI rewriting your words.** Resume Maker generates nothing and sends
  nothing to a model — you write every line. The optional **AI prompt rescue
  import** only copies a ready-made prompt so you can use a chat assistant you
  choose; the reply is parsed locally.
- **Private by design.** Resumes are stored in your browser (IndexedDB). The app
  has no accounts, and no analytics ever touch your resume content — at most it
  counts anonymous button clicks, with no cookies or personal data.
- **Fast on a phone.** The editor is mobile-first, with large touch targets and
  a layout that works at phone width instead of a desktop screen squeezed down.
  The resume name, undo/redo, JSON export, and a solid **Save PDF** button share
  one compact header row, so the preview keeps the height.
- **Honest PDF output.** Preview the exact pages before printing, then use your
  browser's print dialog to save a sharp PDF at your chosen A4 or Letter size.

## Key features

### Start quickly

- **Two clear ways to begin**: the home page leads with **Upload a PDF** — a
  full-width dropzone badged **Recommended** — and puts **Start from scratch**
  (blank resume plus six role presets) directly below it. Returning users see
  **Recent resumes** first, so their work is one tap away. One compact promise
  line covers free, no-sign-up, and offline use once, so the first choice stays
  near the top of a phone screen. Pasting text, AI prompt rescue, and JSON
  restore live in a quiet **Other ways to import** strip at the bottom.
- **A one-line privacy promise**: the home page footer says plainly that your
  resume stays on this device and that only anonymous button counts — no
  cookies or personal data — are used to improve the app. Turning on Do Not
  Track, working offline, or running locally turns the counter off entirely.
- **Start blank or from a role sample**: choose **Start with a blank resume**
  when you would rather type from an empty page, or pick a role preset for a
  complete editable example. Every preset opens as a clean one-page starter, so
  nothing spills onto a second page before you change a word. Either way you
  land in the same editor with every field yours to change.
- **Recent resumes** live in their own section on the home page, shown only once
  you have saved something in this browser. The list is newest first: five show
  at a time, with a compact **Prev** / **Page 1 of N** / **Next** bar when there
  are more; tap anywhere on a row to reopen it, or use its buttons to rename,
  duplicate, or delete it. The title underlines on hover, and the row you pick
  shows a spinner while the resume opens, so a second tap cannot start another
  copy. Each row carries a status pill — **Master**,
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
  are dropped, and words split across lines are joined back together. Ligatures
  and smart quotes are cleaned up, and a GitHub or LinkedIn icon that hides its
  address behind a hyperlink still imports as a real profile. Labels
  and comma-separated lists keep their spaces too, so contact lines and skills
  read as `Skills: Python` and `SQL, SAP` instead of one glued token. Bold text,
  font sizes, and line spacing help tell headings, roles, grades, and project
  names apart, so an unbulleted paragraph stays in the description instead of
  turning into a job title. Real-world date and grade formats are understood
  too: shortened ranges such as `2019–21`, seasons such as `Spring 2021`,
  durations such as `3 Months`, year-first dates such as `2023/10` or
  `2023/10/15`, and tight grades such as `CGPA:7.6` or `12th –92.0%`.
  If a PDF is a scan, an image, or a Canva export with
  no selectable text, the upload error links straight to the AI prompt rescue
  import (pasting the text yourself still works too).
- **AI prompt rescue import** for scanned or Canva PDFs: open **Import via AI
  prompt**, tap **Copy prompt**, and paste it into a chat assistant together
  with your resume text. Prefer to check first? Open **Preview prompt** to read
  the exact wording before copying it. Paste the assistant's JSON reply back
  into the app and tap **Import resume** — no JSON file to save or upload on a
  phone. Markdown fences, a little surrounding prose, and trailing commas are
  cleaned up for you, and an incomplete reply gets a friendly error instead of a
  technical one. Resume Maker never contacts the assistant itself: nothing is
  uploaded, and the imported result stays editable in the same editor.
- **Paste-to-parse import** (in the **Other ways to import** strip): paste the
  text of an existing resume from a PDF,
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
  If you started from a preset, **Clear sample data** in the editor's
  **Export** menu wipes the example names, summary, and entries across every
  section in one tap, leaving your layout and design intact — and **Undo**
  brings it all back.
- **Backup & restore** lives in the **Other ways to import** strip at the bottom
  of the home page as a secondary option: restore a single-resume JSON backup
  you exported earlier, or a resume file from
  another tool in the open **JSON Resume** format, without treating JSON as the
  main way to start.
- **JSON export** in the editor at any time so you are never locked in: the
  quiet **Export** menu beside **Save PDF** (a **⋮** on phones, **Export ▾** on
  desktop) keeps a full **Resume Maker backup** (layout, design, and hidden
  entries) or downloads the same resume as a portable **JSON Resume** file that
  other resume tools and sites can read.

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
  else), so recruiters can reach them without scrolling. You can skip the URL
  entirely: enter just a Network and Username and a known network gets its real
  address (`GitHub` + `ada` → `github.com/ada`, `LinkedIn` + `ada` →
  `linkedin.com/in/ada`); an unfamiliar network prints inline as
  `Network: username` instead of disappearing. When every profile has a header
  entry, that line is the only place they print — no repeated Profiles section.
  Tap **Manage profiles** in Basics to expand and jump straight to the same list.
  The URL field itself says “Paste GitHub or LinkedIn URL”, and Profiles has no
  dead section heading to fill in because its links already
  print in the header. A row with only a URL still counts, so pasted links are
  never silently dropped.
- **Everything you type makes it into the resume.** Your website, profile links,
  certification links, and publication links appear as clickable links in the
  preview and PDF — even if you pasted a bare address such as `github.com/you` —
  and as plain text in the ATS view. Project and custom-section URLs print as
  clean labels too, without `https://` or `www.`. An Education **grade** prints
  beside the school and degree, so no field quietly disappears between the editor
  and the final document.
- Summary plus Profiles, Experience, Projects, Education, Skills, and
  Certifications, with optional Awards, Languages, Interests, Volunteer,
  Publications, and References.
- Rich-text descriptions with bold, italic, bullet/numbered lists, links, and
  editor undo. All eight formatting controls stay on one tidy row: compact
  targets on desktop, and a side-scrolling row on touch so Redo never ends up
  alone on a second line. **Link** opens a small inline URL bar with **Apply**
  and, for an existing link, **Remove link** — no browser prompt. Every
  rich-text field has a visible label (**Highlights**, **Summary**,
  **Description**, or **Notes**). Experience and project bullets offer four
  tappable fill-in formulas: **Reduced [metric] by [X%] by [action]**,
  **Built [feature/system] for [N] users, improving [outcome]**,
  **Led [team/project] to deliver [result]**, and
  **Automated [workflow], saving [N] hrs/wk**. Tap a formula to drop the whole
  skeleton at your cursor; at the end of a finished bullet it starts a new
  bullet instead of running into the previous sentence, and everywhere else it
  inserts cleanly with a leading space when needed so words never run together.
  Each formula wraps neatly to its own left edge. **Writing helpers** starts
  collapsed so your bullets stay in view — tap it when you want the formulas.
  A blank bullet left at the end of a list is ignored in the preview, PDF, and
  ATS text, so it never prints as a stray dot.
- Skills grouped by an optional category with comma-separated keywords (for
  example `Languages: Python, SQL`), with no self-ratings to maintain. A
  keyword-only row stays visible without a blank category line, so pasted lists
  such as `SQL, Excel, Tableau` show up as soon as they are imported; projects
  and interests use the same comma-separated tags.
- One Month + Year picker for every date field (month list plus a four-digit
  year), so `2023-10` stays consistent and no browser opens a slow year
  scroller. A year on its own is enough when that is all you know, and prints as
  `2018 — 2019`. Stray years outside 1950–2100 are caught right under the field
  and never reach the preview or PDF. End dates for current roles and ongoing
  projects have a **Present** toggle, and a quiet note appears under the End date
  when it sits before the Start date. Languages use a 0–5 **Level** slider with
  **None** and **Native** marked at the ends.
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
  Drag the ⋮⋮ handle on a section's header to move it, or tap Hide without
  expanding the card. On a keyboard, focus the handle and press the up or down
  arrow to move that section one step. Only **Open section editor** and
  custom-section delete stay in the card's two-column footer, keeping their
  labels inside the narrow desktop Content column.
  Awards, Languages, Interests, Volunteer, Publications, and References stay
  tucked behind **Add optional section** until you need them. Several sections
  can stay open at once; when two or more cards are expanded — Basics included —
  a quiet **Collapse all** button closes them together. A section's **Clear
  sample data** button only appears while that section still holds preset sample
  content, so an empty optional section, a custom section, or an imported resume
  never shows a misleading clear-all control.
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
  top-to-bottom flow. **Studio Sidebar** is a two-column option badged
  **Human review**. Pick one by tapping its card — your content, page
  size, and saves are unchanged, and the preview and PDF use the same layout.
  Its narrow side column (Skills, Certifications, Languages, Interests) stays
  anchored on Page 1 and is capped at that page's remaining height; anything
  that does not fit moves into the full-width main flow on later pages, so the
  two columns can never overflow the paper. Later pages give the main column the
  full page width instead of leaving an empty sidebar beside it. Side-column
  sections use their own Page 1 budget, so they never eat into the space that
  later main sections need — trailing sections such as Awards stay on the page
  with room instead of being pushed onto a nearly empty extra page, and a resume
  whose main column already fits on Page 1 never grows a blank second page. A
  side-column section that spills onto a later page repeats its own heading
  there (for example **Certifications (cont.)**), so a moved entry never reads
  as if it belonged to the section printed above it.
  Page 1 is measured in the two-column shape you see, while later pages are
  measured at the full page width they actually use — so a section that only
  clears the page once the sidebar is gone is not pushed to an extra page.
  **Save as PDF** prints each measured page inside an exact, clipped page box,
  so the PDF never starts with a blank page holding only your name.
- **Accent, fonts, and density** in Design: pick an accent from seven curated
  colors (or plain monochrome) in one compact strip of round swatches — the
  selected color wears a crisp ring and checkmark, its keyboard focus ring stays
  a clean circle, and its name sits beside the **Accent color** heading, on
  hover, and in the screen-reader label. **Sans**,
  **Serif**, and **Classic** pairings and **Compact**, **Normal**, and
  **Relaxed** spacing sit in short one-row controls, with each font name drawn
  in the typeface it applies. All four design choices stay scannable without
  heavy scrolling, even on a phone, and the **Design** heading stays in view as
  the options scroll on desktop. Each template card shows its **ATS-Safe** (or
  **Human review**) badge in the same top-right spot, so the labels never jump
  around as you compare them. The preview, page count, and printed PDF all use
  the same choices, so the look you pick is the one you save.
- A4 and US Letter page sizes — tap **A4** or **Letter** in the page-size control
  to switch.
- Live paginated preview that measures real content, not an estimate. Long
  sections fill the current page entry by entry — with each heading kept next
  to its first entry — instead of jumping wholesale to the next page and leaving
  most of Page 1 blank. A single very tall role or project also continues at a
  clean bullet boundary on the next page: its header stays with the first
  bullets, the remaining bullets print as a continuation, and the PDF never
  clips the end of the entry or starts with a blank page. A mid-size role that
  would leave a quarter of the page empty also starts on that page and continues
  at the next bullet boundary, so a narrow Studio Sidebar column never shows a
  large blank gap below the first job. Prose and bullets wrap
  at natural word boundaries in both the preview and the PDF, so words never
  split mid-word; only long links break anywhere they need to.
- **Three tidy columns on desktop**: on a wide window the editor fills the
  screen, and Content, Preview, and Design each scroll on their own instead of
  growing the page and leaving a second scrollbar at the right edge. The center
  Preview takes most of the width, its heading lines up with Content and Design,
  and the live resume starts closer to the top; each column's scrollbar is a
  slim, quiet rail instead of a chunky gray stripe. Moving a
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
  the **Visual / ATS** switch, a quiet page count, and one **Review** pill; the
  selected Visual or ATS view fills navy like the Design choices, so the current
  mode is never ambiguous. The switch stays anchored on the left, so it never
  slides sideways when the page count changes or Review gains an active badge.
  Trim hints, fitting, and the occasional review lenses
  live inside Review instead of crowding the live resume. Page 1 keeps
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
  Preview tab. On a computer, a small `− 100% +` pill floats in the bottom-right
  corner of the preview, clear of the paper's rounded edge, so you can zoom with
  the mouse or keyboard without discovering a shortcut. Each click steps in
  clean 25% jumps from the fitted width (100%, 125%, 150%, 175%, 200%, 225%),
  and one click down from any zoom level takes you back to exactly 100% in a
  single click. A **Reset** appears to the left of the buttons once you are
  zoomed in, so the zoom buttons stay exactly where they are, even if you click
  quickly, and Reset always lands on a true 100% instead of an in-between
  percentage. The mouse wheel and two-finger scrolling
  move the editor; hold **Ctrl** (or **⌘**) while scrolling to zoom the resume.
  The fitted page holds its size and position
  when a scrollbar appears or disappears, so it never shrinks and grows on its
  own.
- **Fit to 1 page** when a resume spills just past one page. The fit is gentle:
  it keeps the page as large and full as it can instead of over-shrinking, and
  a fitted page quietly reclaims a little vertical margin. Fitting never
  shrinks the body below a readable size — a resume with a smaller base font
  gets a higher floor so it never prints under 8pt — and if one page would need
  microscopic type, the preview says so instead. The fitted width keeps a
  little breathing room at the right edge, so right-aligned dates never lose
  their last pixels. Whenever a reduced fit is active, a tinted **Reset** pill
  beside the `1 page` label — or **Reset fit** inside **Review** — returns the
  page to 100% and shows the current size in its tooltip. If you trim enough
  content to fit at full size, the page grows back on its own.
- **A calm page count.** A resume that fits on one page just shows quiet
  **1 page** status text in the top bar, with no extra row or pill stealing
  height from the paper. After a fit, the same label gains a small **Reset**
  pill so you can undo the shrink without opening **Review**. When the resume
  spills, the bar shows the page count as plain text plus a tinted **Fit 1p**
  pill; if one page would need unreadable type, only the count remains and
  **Review** explains how to shorten the resume instead.
  There is no second toolbar row, so the live resume keeps the reclaimed space.
- **Trim tips** find the bullets that quietly cost you a line. When a bullet
  wraps and leaves only a word or two on its last line, or grows into a long
  block, the preview counts it. Open **Review** and tap **Trim tips (N)** to see a
  dismissible list with each bullet's opening words and a plain-language reason
  (a 4-line block is named as such, and a bullet that is only long in
  characters is not promised a reclaimed line); it covers the preview only while
  open, so the resume stays fully readable on a
  phone. If the list is long, **Show all** reveals every flagged bullet, and
  **Show fewer** tucks the extras away again. Tap any tip to jump straight to
  that bullet: the editor opens
  **Content**, expands the right section, scrolls directly to that bullet's
  text field, places the cursor in it, and briefly highlights the field so you
  can cut the stray words immediately. Trimming those bullets can reclaim whole
  lines before you shrink the font or spill onto a second page. Once the resume
  already fits one page, the yellow count stays off the **Review** pill so the
  top bar stays calm; the tips are still one tap away inside Review.
- **Tidy** in the Content panel header flags the small consistency problems a
  recruiter notices first: bullets that mix ending periods, first-person
  pronouns, filler adverbs, and repeated opening verbs within one role. It is a
  compact pill with a count badge beside **Match JD**, and all three labels stay
  on one row even on a narrow phone. Tapping it opens a centred **Tidy bullets**
  modal that always stays inside the screen and closes with its own X, a tap on
  the dimmed background, or Escape. Each check gets its own card: **Remove
  periods** and **Add periods** sit inside the mixed-periods card, repeated
  verbs appear as short `Collected ×2` chips with a tap that jumps straight to
  the entry, and the other cards show only a couple of opening words. Period
  fixes leave ellipses and bold or italic formatting intact and undo in one
  step. The check runs locally with plain rules — no AI and no network.
- **ATS plain-text view** that shows the exact linear text a parser reads from
  the current template, so you can check section order and wording before you
  apply. **Copy all plain text** grabs the whole resume for Workday, Greenhouse,
  or Lever in one tap, and compact **Copy** buttons let you paste just one
  section or one role. A single-block **Summary** shows only its section button,
  heading or not, so two Copy buttons never stack together. The copy bar and every section scroll together as one smooth page,
  with no nested box to fight against on a phone.
- **Anonymize for review**: open **Review** in the preview bar and switch on
  **Anonymize** to replace your name, contact details, website, profile links,
  photo, reference names, roles, employers, reference phone and email, company
  or school names, award issuers, and volunteer organizations with neutral
  placeholders. Mentions of your name, email, phone, employers, schools,
  volunteer organizations, and award issuers inside your summary and bullet
  points are rewritten too, so prose such as *"at Wells Fargo"* becomes *"at
  Company A"* without changing your formatting. Each role's, school's,
  volunteer entry's, and custom entry's location is replaced too, so personal
  geography cannot give you away. Project, publication,
  and custom-section links are replaced as well, so a username inside a URL
  cannot leak; certification links keep a recognizable public issuer such as
   Credly, AWS, Scrum, or Coursera while the personal badge path is stripped. A
   dot on the **Review** pill and one note above the preview make
  review mode obvious; the Visual and ATS views and the PDF all use the hidden
  version, and your saved resume is never changed — switch it off again to
  return to the real details.
- **6-Second recruiter scan**: in the same **Review** menu, switch on **6s Scan**
  to see your resume the way a hurried recruiter does. Body prose fades back
  while your name, headline, section headings, job titles, companies, dates,
  bold phrases, and numbers such as `40%`, `$1.2M`, `₹10L`, `€500K`, `3x`,
  `1,000+`, prefixed latency figures such as `p95`/`p99`, or GPA figures such
  as `3.8 GPA` stay at full contrast, so you can tell at a glance whether your
  impact pops out. A slim bar above the preview reminds you the lens is on and
  offers one-tap **Turn off**. It is a preview lens only: the scan is never
  added to the printed PDF or your saved resume.
- **Job description keyword matcher**: tap **Match JD** in the Content panel
  header to open the matcher on any device, then paste a posting to see which
  of its keywords already appear in your resume and which are missing. Common
  filler words such as “for”, “looking”, “hiring”, “high”, “improve”, “reduce”,
  and “junior” are ignored, along with degree, pay, and equal-opportunity
  boilerplate, and keywords match whole words only — so “rust”
  never counts just because “trust” appears. Simple word forms are treated as
  the same keyword, so “building” matches “build” and “managed” matches
  “manage” — and a posting that uses both forms lists that keyword just once.
  Tech names such as C++, C#, Node.js, .NET, CI/CD, UI/UX, TCP/IP, and A/B are
  recognised, including product forms like ASP.NET. On phones it opens as a
  bottom sheet; on desktop
  it opens as a centred modal. Either way one tap on the **X** (or the dimmed
  background) closes it outright, with no half-collapsed bar left behind.
  Matching runs locally with simple word heuristics, not AI.
- The **Visual / ATS** switch, quiet page count, and **Review** pill stay pinned
  in one calm top bar, so none of them ever cover your name or header — and the
  paper starts cleanly below that bar instead of sliding underneath a second
  strip.
- Print/PDF filenames are generated from your name, headline, and date. While
  **Anonymize** is on, the filename uses the placeholder name too, so the file
  itself does not reveal who the resume belongs to. The browser tab shows a
  clean, space-free version of the name (for example `Divya_Prakash_Resume`), so
  phones and tablets that prepare the PDF after the print dialog closes still
  suggest the right filename.

### Keep your work

- Automatic local saves while you edit.
- Undo and redo from the header or with `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`.
- Export from the header's **Export & options** menu (**⋮** on phones,
  **Export ▾** on desktop) whenever you want a portable copy. Choose **Download backup (.json)** for a
  complete file that reopens here with your layout, design,
  and hidden entries intact, or **Export JSON Resume** for the open standard
  format used by other resume tools. JSON Resume exports include the resume you
  see (hidden sections and entries stay out), and importing either format works
  through the same **Backup & restore** picker on the home page.

## Save a PDF

1. Open a resume in the editor.
2. Check the page count in the Preview tab (optional — you can print from
   Content, Design, or Preview).
3. Choose **Save PDF**.
4. In the browser print dialog, choose **Save as PDF**.

The PDF uses the paper size you picked in **Design** (A4 or Letter). Some mobile
print dialogs still open on the other size, so set **Paper size** to the value
named in the reminder and nothing will be clipped. Turn off browser headers and
footers as well so the page URL and date do not appear. Hover or focus **Save
PDF** to see both reminders, or tap the info button beside it on a touch device.
If the dialog is dismissed without a close event, **Save PDF** becomes available
again after a moment instead of staying dimmed. Pages are measured in the
background, so **Save PDF** works straight from Content or Design without
opening Preview first. On iPhone and iPad Safari the print sheet opens straight
from your tap, and a multi-page resume prints each page exactly once — no blank
sheets between pages.

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
