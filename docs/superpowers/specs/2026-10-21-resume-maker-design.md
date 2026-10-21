# Technical Specification: Mobile-First Modular HTML-to-Print PDF Resume Maker

## 1. System Architecture & Complete Tech Stack

This specification defines a **local-first, zero-backend-dependency web application** that runs entirely in the user's mobile or desktop browser for its core free tier, using native CSS Paged Media and the browser's print engine to generate vector-sharp, ATS-readable PDFs without server-side headless Chromium overhead.

| Layer / Domain | Recommended Library / Package | Role in Architecture | Reference / Documentation |
| :--- | :--- | :--- | :--- |
| **Application Framework** | `next` (App Router, Static/SPA Export Ready) | Provides routing, code splitting, and static asset optimization (`next/font`) | [Next.js](https://www.google.com/search?q=https%3A%2F%2Fnextjs.org%2F) ([GitHub](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2F)) |
| **Styling & Design Tokens** | `tailwindcss` | Manages responsive UI layout, CSS variables (`--color-primary`, `--page-gap-y`), and `@media print` utilities | [Tailwind CSS](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Ftailwindlabs%2Ftailwindcss) |
| **Accessible UI Primitives** | `shadcn/ui` + `vaul` | Supplies accessible form controls, dialogs, and native-feeling mobile bottom-sheet drawers | [shadcn/ui](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fshadcn-ui%2Fui), [Vaul Drawer](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Femilkowalski%2Fvaul) |
| **State Management & Undo/Redo** | `zustand` + `zundo` | Maintains reactive resume state with `<700B` temporal undo/redo history middleware | [Zustand](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fpmndrs%2Fzustand), [Zundo](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fcharkour%2Fzundo) |
| **Offline Persistence** | `dexie` (IndexedDB) | Stores multiple resume drafts, base64/Blob profile photos, and, only if the user opts into AI, encrypted BYOK keys locally | [Dexie.js](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fdexie%2FDexie.js%2F) |
| **Schema & Validation** | `zod` + `react-hook-form` | Validates resume JSON structure, form inputs, and structured LLM outputs | [Zod](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fcolinhacks%2Fzod), [React Hook Form](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Freact-hook-form%2Freact-hook-form) |
| **Rich Text Editing** | `@tiptap/react` + `@tiptap/starter-kit` | Renders a lightweight, headless rich-text editor restricted to ATS-safe HTML tags | [Tiptap](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fueberdosis%2Ftiptap) |
| **Touch Drag-and-Drop** | `@dnd-kit/core` + `@dnd-kit/sortable` | Enables fluid touch, pointer, and keyboard reordering of sections and entries | [dnd-kit](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fclauderic%2Fdnd-kit) |
| **Mobile Canvas Viewport** | `react-zoom-pan-pinch` | Powers smooth two-finger pinch-to-zoom and panning on the live A4/Letter preview | [react-zoom-pan-pinch](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2FBetterTyped%2Freact-zoom-pan-pinch) |
| **Client-Side PDF Extraction** | `pdfjs-dist` | Extracts text items, $(X, Y)$ coordinates, and font metadata inside a browser Web Worker | [Mozilla PDF.js](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fmozilla%2Fpdf.js%2F) ([pdfjs-dist](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fmozilla%2Fpdfjs-dist)) |
| **Browser Print & Pagination** | Native `window.print()` + `pagedjs` (optional preview polyfill) | Renders an unscaled print-only subtree in a body-level portal and triggers native PDF export; no print library or iframe | [Paged.js](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fpagedjs%2Fpagedjs%2F) |
| **Iconography** | `@phosphor-icons/react` or `lucide-react` | Renders crisp vector SVG icons that scale cleanly in browser print output | [Phosphor Icons](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fphosphor-icons%2Freact), [Lucide Icons](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Flucide-icons%2Flucide) |
| **Opt-In AI Add-On (BYOK / Pro)** | `ai` (Vercel AI SDK, v6+) + Provider SDKs, dynamically imported | Loaded only after a key is verified or Pro is active (never in the core bundle); connects directly from the browser to OpenAI, OpenRouter, Anthropic Claude, and Google Gemini | [Vercel AI SDK](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fvercel%2Fai) ([Providers](https://www.google.com/search?q=https%3A%2F%2Fai-sdk.dev%2Fproviders%2Fai-sdk-providers)) |

### 1.1 Core Product Principle: Free PDF Builder First, AI as a Separate Opt-In Layer

The product is, first and foremost, a **free, complete, AI-free PDF resume builder**. This is the experience every user lands on, and it must be fully functional with no account, no API key, and no network after first load.

| Rule | Requirement |
| :--- | :--- |
| **Single default experience** | Every new user lands on the same core launcher and editor. There is no AI-flavored variant of the landing page, onboarding, or editor. |
| **AI is a separate module** | All AI functionality (inline refiner, AI scorecard, AI-assisted PDF parsing, BYOK settings, managed Pro AI) lives in a separate, lazy-loaded add-on module. The core editor never imports it. |
| **Two unlock paths only** | AI is introduced to a user only if they (a) add and successfully verify their own AI provider key (BYOK), or (b) subscribe to the paid Pro tier. No other trigger (time on site, number of exports, resume score, etc.) may surface AI. |
| **No AI promotion in the core UI** | No AI buttons, wands, tabs, panels, banners, badges, tooltips, empty-state suggestions, or upsell modals appear for users without AI access. See §7.0 for the full gating specification. |
| **Core never depends on AI** | Templates, editing, drag-and-drop, pagination, Fit to 1 Page, heuristic PDF import, and PDF export must work identically with AI absent. AI only ever augments them. |

### 1.2 Pinned Version Baselines

The stack targets the current major lines below. Versions reflect what was current in October 2026; re-verify at project start, pin exact versions in `package.json`, and commit the lockfile.

| Package | Baseline | Notes |
| :--- | :--- | :--- |
| `next` + `react` / `react-dom` | Next.js 16.x (16.4 at time of writing) with React 19.3 | App Router; keep Static/SPA export for the free tier. |
| `tailwindcss` | 4.x | CSS-first configuration via `@theme`; the design tokens in §3 (`--color-primary`, `--page-gap-y`, etc.) map directly onto CSS variables. |
| `zod` | 4.x | Confirm `@hookform/resolvers` supports Zod 4 before pinning. |
| `react-hook-form` | 7.x | |
| `zustand` + `zundo` | zustand 5.x + zundo 2.x | zundo v2 requires zustand v5 or higher. |
| `ai` (Vercel AI SDK) + `@ai-sdk/*` | `ai` v6 or later; `@ai-sdk/*` provider packages on the matching major | Structured output uses `generateText` / `streamText` with `Output.object` (§7.2); `generateObject` / `streamObject` are deprecated. Confirm the latest major at project start. |

## 2. Pillar 1: Mobile-First Interface & Dual-Path Onboarding

Editing a multi-section document on a 375px–430px smartphone screen fails when desktop split-screen layouts are merely stacked vertically. Following mobile patterns proven in [Reactive Resume](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Freactive-resume%2Freactive-resume) and modern mobile sheet interfaces built with [Vaul](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Femilkowalski%2Fvaul), the workspace separates data entry, layout orchestration, and visual inspection into distinct ergonomic modes.

### 2.1 Onboarding Flow (Upload Existing PDF vs. Start from Scratch)

When a user opens the application on mobile or desktop, they land on a streamlined two-card launcher. This is the default and only landing experience for every user, and it contains no AI cards, prompts, badges, or upsells (see §7.0):

1. **Import Existing Resume (PDF / JSON)**:
   - Uses a touch-friendly file dropzone (`<input type="file" accept="application/pdf,application/json" />`) modeled on [OpenResume's import dropzone](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fxitanggg%2Fopen-resume).
   - Runs client-side extraction immediately in a Web Worker using [pdfjs-dist](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fmozilla%2Fpdfjs-dist) and the free heuristic parser (§4), and displays a 3-step progress indicator (*Reading PDF coordinates* $\rightarrow$ *Detecting sections* $\rightarrow$ *Populating template*).
   - Opens an interactive **Import Verification Sheet** highlighting any low-confidence fields (e.g., an ambiguous date range) before launching the live editor.
2. **Start from Scratch with Role-Specific Guided Examples**:
   - Instead of dropping the user into empty inputs, the launcher offers **Role Archetype Presets** (*Software Engineer*, *Product Manager*, *UX/UI Designer*, *Finance & Operations*, *Fresh Graduate*).
   - Selecting a preset populates the canonical state store with realistic, high-impact sample entries written using the **Google XYZ bullet formula** (*"Accomplished [X] as measured by [Y], by doing [Z]"*), plus ghost-text field hints and one-tap *"Clear sample data"* buttons per section.

### 2.2 Mobile Workspace Ergonomics

| Viewport Breakpoint | Layout Pattern | Core Interaction Mechanics |
| :--- | :--- | :--- |
| **Mobile (`< 768px`)** | **Bottom Segmented Bar + Slide-Up Drawers** | A sticky bottom navigation bar switches between three views: **1. Content** (accordion list of sections), **2. Design & Order** (template strip, colors, drag-and-drop section order), and **3. Live Preview** (pinch-to-zoom A4/Letter canvas via [react-zoom-pan-pinch](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2FBetterTyped%2Freact-zoom-pan-pinch) with a floating **Save PDF** button). Tapping any entry opens a [Vaul](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Femilkowalski%2Fvaul) bottom drawer (`snapPoints={[0.6, 0.95]}`) that adjusts smoothly above the mobile virtual keyboard (`visualViewport` API). |
| **Tablet (`768px – 1024px`)** | **Collapsible Side Drawer + Scaled Canvas** | Displays the live paginated resume centered in the viewport while a slide-over drawer handles section editing and template switching. |
| **Desktop (`> 1024px`)** | **Three-Zone Split Workspace** | Left panel: Section list and form editor; Center canvas: Interactive zoomable multi-page preview; Right panel: Template gallery and typography/margin sliders. (An AI assistant panel is added here only when an AI entitlement is active; see §7.0.) |

## 3. Pillar 2: Modular HTML Template Engine & Multi-Page Pagination

To ensure that adding or removing a profile photo, toggling sections like `skills` or `certifications`, or switching between single-column and two-column designs never breaks formatting, the template architecture strictly separates **canonical resume data** from **layout metadata**, drawing directly from the [Reactive Resume JSON Schema](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fjson-resume-schema) and [Reactive Resume's 18-template system](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fchoosing-a-template).

### 3.1 Canonical Resume State Schema (TypeScript / Zod)

Every resume document is stored as a single JSON object validated by [Zod](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fcolinhacks%2Fzod) and compatible with [Reactive Resume's /schema.json](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fjson-resume-schema) and [JSON Resume](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fjsonresume%2Fresume-schema):

```typescript
export interface ResumeDocument {
  picture: {
    hidden: boolean;
    url: string; // Local Blob/IndexedDB URL or data URI
    size: number; // 32pt to 512pt (default: 64)
    aspectRatio: number; // 0.5 to 2.5 (default: 1)
    borderRadius: number; // 0pt (square) to 100pt (circle)
    fit: 'cover' | 'contain';
  };
  basics: {
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    website: { url: string; label: string };
    customFields: Array<{ id: string; icon: string; text: string; link?: string }>;
  };
  summary: SectionConfig & { content: string }; // Sanitized HTML string
  sections: {
    profiles: ListSection<ProfileItem>;
    experience: ListSection<ExperienceItem>;
    education: ListSection<EducationItem>;
    projects: ListSection<ProjectItem>;
    skills: ListSection<SkillItem> & { keywordLayout: 'inline' | 'list'; layout: 'default' | 'inline' };
    certifications: ListSection<CertificationItem>;
    awards: ListSection<AwardItem>;
    languages: ListSection<LanguageItem>;
    interests: ListSection<InterestItem>;
    volunteer: ListSection<VolunteerItem>;
    publications: ListSection<PublicationItem>;
    references: ListSection<ReferenceItem>;
  };
  customSections: Array<CustomSection>;
  metadata: {
    template: 'onyx' | 'bronzor' | 'persian' | 'azurill' | 'chikorita' | 'gengar' | 'glalie' | 'pikachu';
    layout: {
      sidebarWidth: number; // Percentage: 25% to 45% (default: 35%)
      sidebarSide: 'left' | 'right';
      pages: Array<{
        fullWidth: boolean; // If true, main column spans 100% and sidebar is hidden on this page
        main: string[];     // Ordered array of section IDs in the main column
        sidebar: string[];  // Ordered array of section IDs in the sidebar column
      }>;
    };
    page: {
      format: 'a4' | 'letter';
      marginX: number; // Points (pt), default 14pt
      marginY: number; // Points (pt), default 12pt
      gapX: number;    // Horizontal column gap in pt
      gapY: number;    // Vertical section gap in pt
      hideIcons: boolean;
    };
    typography: {
      body: { fontFamily: string; fontSize: number; lineHeight: number };
      heading: { fontFamily: string; fontSize: number; lineHeight: number };
    };
    design: {
      colors: { primary: string; text: string; background: string };
      levelType: 'hidden' | 'circle' | 'progress-bar' | 'rectangle';
    };
  };
}

export interface SectionConfig {
  title: string;
  icon: string;
  columns: 1 | 2 | 3 | 4; // Multi-column grid inside the section itself
  hidden: boolean;
  showHeading: boolean;
  keepTogether: boolean;   // Prevents section from splitting across a page break
  startOnNewPage: boolean; // Forces section to start on the next page
}
```

### 3.2 Pre-Defined Modular Template Suite (Simple Professional to Creative)

Modeled on [Reactive Resume's template gallery](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fchoosing-a-template) and [Bartosz Jarocki's print-friendly CV](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fbartoszjarocki%2Fcv), the initial launch includes 6 core HTML/CSS templates spanning 3 layout archetypes. All templates consume the exact same `<SectionRenderer />` components and differ only in their structural grid wrapper and CSS custom property tokens:

| Template ID | Inspired By | Style Tier | Column Topology & Visual Characteristics | ATS Compatibility |
| :--- | :--- | :--- | :--- | :--- |
| **`persian`** | [Reactive Resume Persian](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fchoosing-a-template) | Classic Executive / Academic | Single-column layout, centered serif letterhead, subtle horizontal section rules, right-aligned dates, zero icons or sidebars | **100% ATS-Safe** (strict linear DOM order) |
| **`onyx`** | [Reactive Resume Onyx](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fchoosing-a-template) & [BartoszJarocki/cv](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fbartoszjarocki%2Fcv) | Modern Minimalist Tech | Single-column layout with optional header avatar beside contact metadata, monospace/sans-serif badge pills for skills, compact density | **100% ATS-Safe** (single-column linear flow) |
| **`bronzor`** | [Reactive Resume Bronzor](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fchoosing-a-template) | Swiss Grid Professional | Single-column flow where each section renders as a 2-column labeled row (`grid-template-columns: 110pt 1fr`: section title on left, items on right) | **High ATS Compatibility** |
| **`chikorita`** | [Reactive Resume Chikorita](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fchoosing-a-template) | Contemporary Split | Full-width top header above an asymmetric two-column body (`1fr var(--sidebar-width)`), placing Experience/Projects on the left and Skills/Education/Certifications in a right sidebar | **Standard Two-Column** |
| **`azurill`** | [Reactive Resume Azurill](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fchoosing-a-template) | Creative Professional | Centered avatar and header badge, left sidebar (`var(--sidebar-width) 1fr`) with subtle timeline border accents on Experience and Education | **Visual / Direct-to-Hiring-Manager** |
| **`gengar`** | [Reactive Resume Gengar](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fchoosing-a-template) | Bold Creative Studio | Full-height tinted left sidebar (`background: var(--color-primary-tint)`) housing avatar, contact details, and skills, paired with a high-contrast main column | **Visual / Portfolio Resume** |

### 3.3 Auto-Reflow & Zero-Breakage Modularity Rules

To guarantee that adding, hiding, or deleting any element automatically adjusts surrounding content without leaving dead whitespace or broken grids, templates enforce four structural rules:

1. **Intrinsic Header Grid for Profile Picture Toggle**:
   - The header uses `display: grid; grid-template-columns: auto 1fr; align-items: center;`.
   - When `picture.hidden === true` or `!picture.url`, the `<AvatarSlot />` component returns `null` (not `visibility: hidden`). Because no DOM node occupies the first column, the `auto` track collapses to `0px`, and the `<BasicsSlot />` spans 100% of the header width with zero left margin gap.
2. **Gap-Driven Flexbox/Grid Containers (Zero Margin Collisions)**:
   - Individual sections and items never apply `margin-bottom` or `margin-top`. Instead, column wrappers use `display: flex; flex-direction: column; gap: var(--page-gap-y);` and multi-column sections (such as a 3-column `skills` block) use `display: grid; grid-template-columns: repeat(var(--section-columns, 1), minmax(0, 1fr)); gap: var(--item-gap);`.
   - When a section is hidden (`section.hidden === true`) or has zero visible entries (`items.filter(i => !i.hidden && !isDraft(i)).length === 0`), the section component returns `null` and the parent flex container automatically closes the space.
3. **Automatic 2-Column to 1-Column Reflow**:
   - Following [Reactive Resume's layout engine](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fchoosing-a-template), `metadata.layout.pages[i]` always preserves both `main: string[]` and `sidebar: string[]` arrays in state.
   - When rendering a single-column template (`persian`, `onyx`, `bronzor`) or when `page.fullWidth === true`, the template concatenates `[...page.main, ...page.sidebar]` in render order. If the user later switches to a two-column template (`chikorita`, `azurill`, `gengar`), their sidebar placement is still intact.
4. **Draft Entry Filtering**:
   - Following [Reactive Resume's section management pattern](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fmanaging-sections), newly added entries remain in a `draft` state until their primary key field (e.g., `company` for Experience, `school` for Education, `name` for Skills) is non-empty, preventing blank bullet dots or orphan dividers from appearing on the live preview or printed PDF.

### 3.4 End-of-Page Spacing & Multi-Page Pagination Engine

Preventing awkward mid-entry page cuts and unreadable bottom-of-page orphans requires combining **CSS Paged Media fragmentation rules** (for the actual browser print output) with a **JavaScript DOM Measurement & Auto-Fit Engine** (for the live WYSIWYG preview).

```css
/* Core pagination and fragmentation rules applied to all templates */
.resume-section {
  position: relative;
}

.resume-section[data-keep-together="true"] {
  break-inside: avoid;
  page-break-inside: avoid;
}

.resume-section[data-start-new-page="true"] {
  break-before: page;
  page-break-before: always;
}

/* Never strand a section header at the bottom of a page without its first entry */
.resume-section-heading {
  break-after: avoid;
  page-break-after: avoid;
  break-inside: avoid;
}

/* Keep individual job/education headers and short entries intact across page boundaries */
.resume-entry-header,
.resume-entry-compact {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Allow long multi-bullet job descriptions to split cleanly only between <li> items, never mid-line */
.resume-entry-bullets > li {
  break-inside: avoid;
  page-break-inside: avoid;
}

.resume-rich-text p {
  orphans: 3;
  widows: 3;
}
```

#### Live Page-Break Calculation & One-Click Auto-Fit Algorithm
Because standard browser divs do not visually paginate on screen prior to printing, the editor uses a **Virtual Page Partitioner** (or optional [Paged.js](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fpagedjs%2Fpagedjs%2F) `Previewer` pass) backed by `ResizeObserver`:
1. **Height Measurement**: Each `.resume-page` container has an exact fixed aspect-ratio height ($297\text{ mm}$ for A4 at $96\text{ DPI} = 1122.5\text{ px}$; $279.4\text{ mm}$ for Letter $= 1056\text{ px}$). A hidden offscreen measurement container measures the rendered height of every section and entry (`el.getBoundingClientRect().height`) whenever state or typography changes.
2. **Smart Bottom-Buffer & Reflow**: When an entry at the bottom of Page $N$ exceeds the printable content box ($\text{PageHeight} - 2 \times \text{marginY}$), the partitioner checks:
   - If the entire entry is $\le 180\text{ px}$ or `section.keepTogether === true`, the whole entry or section is pushed to the top of Page $N+1$, and the remaining bottom space on Page $N$ is absorbed gracefully without stretching internal line heights.
   - If the entry is a long experience item with $\ge 4$ bullets and at least the header + 2 bullets fit on Page $N$, the entry splits cleanly between `<li>` nodes across Page $N$ and Page $N+1$.
3. **Overflow Detection & One-Click Auto-Fit** (modeled on [Reactive Resume's Fitting Content on a Page](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Ffitting-content-on-a-page)):
   - If content spills onto an unplanned extra page (e.g., overflowing onto Page 2 by 5 lines), an amber banner appears above the preview: *"Runs onto Page 2 by ~5 lines — [Fit to 1 Page]"*.
   - Clicking **Fit to 1 Page** runs a deterministic 3-stage tightening loop inside a single undoable [Zundo](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fcharkour%2Fzundo) transaction, checking total rendered height after each step and stopping as soon as content fits:
     1. **Step 1 (Vertical Density)**: Reduce `page.gapY` and `typography.body.lineHeight` from *Roomy* (`gapY: 16pt, lineHeight: 1.5`) $\rightarrow$ *Normal* (`gapY: 12pt, lineHeight: 1.35`) $\rightarrow$ *Compact* (`gapY: 8pt, lineHeight: 1.2`).
     2. **Step 2 (Page Margins)**: Tighten `page.marginY` and `page.marginX` from *Wide* (`18pt`) $\rightarrow$ *Normal* (`14pt`) $\rightarrow$ *Narrow* (`10pt`, never below `8pt` to respect printer bleed limits).
     3. **Step 3 (Font Size Micro-Step)**: Decrement `typography.body.fontSize` in `0.5pt` steps down to a hard readability floor of `9.0pt`.

## 4. Pillar 3: Client-Side PDF Resume Parser Architecture

To provide strong out-of-the-box PDF import capabilities without paying per-parse server costs on the free tier, the application implements the 4-stage geometric heuristic algorithm pioneered by [OpenResume's PDF Parser](https://www.google.com/search?q=https%3A%2F%2Fwww.open-resume.com%2Fresume-parser) ([GitHub](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fxitanggg%2Fopen-resume)) using [Mozilla PDF.js (pdfjs-dist)](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fmozilla%2Fpdfjs-dist).

### 4.1 Four-Stage Heuristic Extraction Pipeline (Free Tier)

| Pipeline Stage | Core Function | Mathematical & Heuristic Logic |
| :--- | :--- | :--- |
| **Stage 1: Coordinate Extraction** | `readPdf(fileUrl)` | Loads the PDF inside a Web Worker via [pdfjs-dist](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fmozilla%2Fpdfjs-dist) (`page.getTextContent()`), extracting every text item's string, bounding coordinates $(X_1, X_2, Y)$ relative to bottom-left $(0,0)$, font name/boldness (`fontName.toLowerCase().includes('bold')`), and `hasEOL` flag. |
| **Stage 2: Line Reconstruction** | `groupTextItemsIntoLines(items)` | Groups items sharing the same $Y$ coordinate (within $\pm 2\text{ pt}$ tolerance). Merges adjacent fragmented tokens on the same line when $\text{Distance} = X_{\text{right},1} - X_{\text{left},2} \le \text{avgCharWidth}$ (where $\text{avgCharWidth} = \frac{\sum \text{width}}{\sum \text{charCount}}$ across non-bold items), reconnecting split phone numbers (`(909) 555` + `-` + `5555`) and hyphenated URLs. |
| **Stage 3: Section Segmentation** | `groupLinesIntoSections(lines)` | Scans lines top-to-bottom to detect section headers. **Primary Heuristic**: Line contains a single text item + is **Bold** + is **ALL UPPERCASE**. **Fallback Heuristic**: Matches normalized text against a dictionary of standard section titles (`EXPERIENCE`, `WORK HISTORY`, `EDUCATION`, `SKILLS`, `PROJECTS`, `CERTIFICATIONS`, `AWARDS`, `SUMMARY`, `OBJECTIVE`). **Two-Column Enhancement**: Before line grouping, runs a $K$-means / histogram X-coordinate gutter check; if a vertical whitespace channel spans $>60\%$ of the page height, partitions items into Left Column and Right Column streams first so sidebar lines never interleave with main-column lines. |
| **Stage 4: Subsection & Feature Scoring** | `extractResumeFromSections(sections)` | Splits multi-item sections (`experience`, `education`, `projects`) into individual entries whenever the vertical gap between consecutive lines exceeds $1.4 \times \text{typicalLineGap}$ (or when a bold line follows bullet items). Evaluates every candidate text item against a **Weighted Feature Scoring Matrix** to assign fields (`company`, `position`, `dates`, `school`, `degree`, `gpa`). |

### 4.2 Feature Scoring Matrix (Adapted from OpenResume)

Following [OpenResume's Feature Scoring System](https://www.google.com/search?q=https%3A%2F%2Fwww.open-resume.com%2Fresume-parser), each attribute runs candidate text items through positive and negative feature matchers and selects the highest-scoring item:

- **Name (`basics.name`)**: Matches `/^[a-zA-Z\s\.]+$/` (`+3`), `isBold` (`+2`), `isAllCaps` (`+2`), contains `@` (`-4`), contains digits (`-4`), contains `,` (`-4`), contains `/` (`-4`).
- **Email (`basics.email`)**: Matches `/\S+@\S+\.\S+/` (`+4`), penalties for spaces or multiple words.
- **Phone (`basics.phone`)**: Matches `/\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/` or international E.164 format (`+4`).
- **Date Range (`dates`)**: Matches year tokens `/(?:19|20)\d{2}/`, month names, seasons, or `Present`/`Current` (`+4`), parsed into normalized ISO strings (`YYYY-MM`) for `dates.start` and `dates.end`.
- **Job Title vs. Company (`experience`)**: Job Title matches role keywords (`Engineer`, `Developer`, `Manager`, `Director`, `Analyst`, `Designer`, `Lead`, `Intern`, `Consultant`) (`+3`); Company scores `+2` for bolded text on the same or adjacent header line that does not match date or job-title matchers.

## 5. Pillar 4: Live Interactive Browser Editor & Fluid Section Placement

### 5.1 Reactive Editing & Touch-Friendly Drag-and-Drop

1. **Instant Two-Way Binding & Inline Highlight**:
   - Form fields managed by [React Hook Form](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Freact-hook-form%2Freact-hook-form) dispatch debounced (`50ms`) updates to the [Zustand](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fpmndrs%2Fzustand) store, while the live HTML preview subscribes via granular selectors (`useResumeStore(s => s.sections.experience)`) so typing in a bullet only re-renders that specific `<ExperienceSection />` node.
   - Tapping any section or bullet directly on the live HTML preview scrolls the editor (or opens the mobile [Vaul](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Femilkowalski%2Fvaul) drawer) directly to that item.
2. **Fluid Section & Column Reordering with `@dnd-kit`**:
   - Built with [@dnd-kit/core and @dnd-kit/sortable](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fclauderic%2Fdnd-kit) using a multi-container sortable setup representing `pages[pageIndex].main` and `pages[pageIndex].sidebar` (matching [Reactive Resume's print-order section list](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fmanaging-sections)).
   - **Mobile Sensor Configuration**: Configures `TouchSensor` with `activationConstraint: { delay: 180, tolerance: 5 }` on dedicated drag handles (`<GripVertical />`), ensuring normal one-finger vertical scrolling on phones never triggers accidental section swaps.
   - **Accessibility & Keyboard Fallback**: Includes `KeyboardSensor` (`Alt + ArrowUp/ArrowDown`) and explicit *Move Up*, *Move Down*, and *Move to Sidebar / Main Column* actions in each section's `⋯` overflow menu.
   - **Smooth Layout Reflow**: Applies CSS `transition: transform 200ms cubic-bezier(0.2, 0, 0, 1)` during drag-over events so surrounding sections visibly part and reflow in real time.

## 6. Pillar 5: Zero-Backend Browser Print PDF Engine (`window.print()`)

Because the browser's native print-to-PDF engine is the sole PDF generator, the print pipeline must neutralize mobile viewport scaling, browser-injected headers/footers, missing web fonts, and missing background colors.

### 6.1 Print-Only Portal Pipeline (Native `window.print()`, No Print Library)

Directly calling `window.print()` on a mobile screen where the visible preview is scaled down via CSS (`transform: scale(0.45)`) can cause mobile browsers to print a tiny, shrunken resume in the corner of the PDF. An iframe-based print library avoids that, but print iframes are known to error out or silently do nothing in some in-app webviews (for example, links opened inside Facebook, Instagram, or Slack), which a mobile-first app will meet often. Instead, the app renders a second, unscaled, print-only copy of the resume in a body-level portal, and the print stylesheet (§6.2) shows only that portal while printing:

1. **Unscaled Print Portal**: When the user taps **Download / Print PDF**, a `<PrintPortal />` mounts `.resume-print-root` inside `#print-portal`, a direct child of `<body>` outside the app root (`transform: none; width: 210mm` for A4 or `8.5in` for Letter). On screen, `#print-portal` is `display: none`; under `@media print`, every other child of `<body>` is hidden and `#print-portal` is shown. Because the portal lives in the same document, all stylesheets, web fonts, and CSS variables apply as-is, with no style/link copying. The portal is mounted on tap and unmounted in the `afterprint` handler so the live editor never carries a second full copy of the resume.
2. **Font Readiness Synchronization**: Before calling `window.print()`, the handler awaits `await document.fonts.ready`, verifies that all `<img>` tags in the portal (such as the profile photo) have `img.complete === true`, and waits two animation frames so layout has settled.
3. **Automatic PDF Filename Injection**: Right before invoking print, the handler sets `document.title = "${basics.name.trim().replace(/\s+/g, '-')}-Resume"`, which Chrome, Safari, Edge, and Firefox use as the default filename when saving to PDF (matching [Reactive Resume's naming convention](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fexporting-your-resume)). The original title is restored in the `afterprint` handler.
4. **In-App Browser Detection & Notice**: `detectInAppBrowser()` (in `lib/print/`) uses user-agent heuristics (for example the `FBAN` / `FBAV` and `Instagram` markers, Android's `; wv)` WebView token, and iOS user agents that lack the `Safari/` token). When an in-app browser is detected, a persistent, non-blocking notice appears above the Save PDF button: *"This in-app browser may not be able to save PDFs. Open this page in Chrome or Safari."* It includes a **Copy link** button and a **Download JSON backup** button so no work is lost. Export is still attempted if the user taps it anyway. This notice is part of the free core and is unrelated to AI.
5. **Validation Gate**: Because this replaces the iframe approach, print output must be validated on iOS Safari, Android Chrome, Firefox, and desktop Chrome/Edge before launch (correct page size, no shrunken output, backgrounds preserved, filename applied). If iOS Safari proves unreliable with the portal approach, evaluate an iframe-based fallback behind a feature flag.

### 6.2 Production Print Stylesheet (`print.css`)

```css
/* Force exact paper geometry and strip browser URL/date/page-number headers & footers */
@page {
  size: A4 portrait; /* Dynamically overridden to 'letter portrait' when metadata.page.format === 'letter' */
  margin: 0mm;       /* Zero @page margin disables browser-injected headers/footers; internal padding is controlled per .resume-page */
}

/* Print-only portal: hidden on screen, the only visible subtree when printing */
#print-portal {
  display: none;
}

@media print {
  html, body {
    width: 100%;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    /* Preserve sidebar backgrounds, skill pills, and accent colors in PDF output */
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  /* Hide the entire app (editor, preview, drawers) and show only the unscaled print portal */
  body > *:not(#print-portal) {
    display: none !important;
  }

  #print-portal {
    display: block !important;
  }

  /* Hide all editor UI, mobile drawers, zoom controls, and amber overflow banners */
  .editor-chrome,
  .mobile-bottom-bar,
  .page-overflow-warning,
  .ai-inline-wand {
    display: none !important;
  }

  /* Reset any pan/zoom transforms on the print container */
  .resume-print-root {
    transform: none !important;
    box-shadow: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Each logical page renders with exact physical padding and clean page breaks */
  .resume-page {
    width: var(--page-width, 210mm);
    min-height: var(--page-height, 297mm);
    padding: var(--page-margin-y, 12pt) var(--page-margin-x, 14pt);
    box-sizing: border-box;
    page-break-after: always;
    break-after: page;
    box-shadow: none !important;
    border: none !important;
  }

  .resume-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  /* Keep hyperlinks clickable in the exported PDF without ugly browser URL expansion */
  a {
    text-decoration: inherit;
    color: inherit;
  }
  a[href]::after {
    content: none !important;
  }
}
```

### 6.3 Cross-Browser & Mobile OS Print Handling

| Platform / Browser | Native Print-to-PDF Behavior | Required UX Guidance / Adaptation |
| :--- | :--- | :--- |
| **Desktop Chrome / Edge / Brave** | Opens Print Dialog with **"Save as PDF"** destination and respects `@page { margin: 0 }` automatically | None required; one-click save with vector text and clickable links. |
| **Android Chrome** | Opens Android System Print spooler defaulting to **"Save as PDF"** | If user's paper size is set to `A4` or `Letter`, display a subtle 1-line tip above the Print button reminding them to match paper size if their regional Android default differs. |
| **iOS Safari (iPhone / iPad)** | Opens the native iOS **Print Options** sheet with a live multi-page thumbnail preview | Include a concise iOS tooltip on the Export modal: *"Tap **Print**, then tap the **Share icon** at the top right (or pinch-out on the preview) to **Save to Files** as a PDF."* |
| **Firefox (Desktop & Mobile)** | Respects `@page { margin: 0 }` and `print-color-adjust: exact` (Firefox 97+) | Ensure SVG icons have explicit `width` and `height` attributes in pixels/points rather than relying solely on CSS `rem` sizing during print. |
| **In-App Browsers / Webviews (Facebook, Instagram, Slack, etc.)** | Printing may error out or silently do nothing | Detect with `detectInAppBrowser()` and show the *Open in Chrome / Safari* notice with a **Copy link** button and **Download JSON backup** (see §6.1, step 4). |

## 7. Pillar 6: Opt-In AI Add-On Layer (BYOK & Pro) and Pro Tier Roadmap

Inspired by [Reactive Resume's AI Provider architecture](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fusing-ai), the core application is a complete, 100% offline-capable product without AI, and AI is a strictly separate, opt-in add-on layer that appears only after a user either plugs in their own API keys for **OpenAI**, **OpenRouter**, **Anthropic Claude**, or **Google Gemini**, or subscribes to the managed **Pro Paid Tier** post-launch.

### 7.0 AI Feature Gating & Progressive Disclosure

AI is invisible by default. The gating model below is the single source of truth for when any AI surface may exist in the UI or the JS bundle.

```typescript
// lib/entitlements/useAiEntitlement.ts
export type AiEntitlement = 'none' | 'byok' | 'pro';

// 'byok' is granted only after a key is saved AND the Save & Test ping succeeds.
// 'pro' is granted only while a paid subscription is active.
export const hasAiAccess = (e: AiEntitlement) => e !== 'none';
```

| Entitlement State | How a User Reaches It | What the User Sees |
| :--- | :--- | :--- |
| **`none`** (default for every new user) | Does nothing; just opens the app | The core free PDF builder only. Zero AI UI, zero AI copy, zero AI code downloaded. |
| **`byok`** | Settings → **Connect AI (optional)** → enters a provider key → **Save & Test** succeeds | AI surfaces from §7.2 appear, using the user's own key. |
| **`pro`** | Subscribes to Pro (via the Pricing / Account page) and signs in | AI surfaces from §7.2 appear automatically, backed by managed credits. No key setup. |

**Progressive-disclosure rules**
1. **Single quiet entry point**: The only AI-related control visible to an `none` user is one low-emphasis **Connect AI (optional)** row inside Settings. It has no badge, no "new" dot, no highlight, and is never linked from the launcher, editor, preview, or export flow.
2. **No nudges**: No banners, toasts, empty-state hints, tooltips, "improve with AI" prompts, or post-export suggestions may reference AI for `none` users. Pro marketing lives on the Pricing / Account page, not inside the editor.
3. **Render gating, not CSS hiding**: AI components are wrapped in `<AiGate>`, which returns `null` unless `hasAiAccess(entitlement)`. AI elements must not exist in the DOM (not merely `display: none`) for `none` users.
4. **Code-splitting**: The AI module (`components/ai/*`, `lib/ai/*`, the Vercel AI SDK, and provider SDKs) is loaded with dynamic `import()` only after entitlement becomes `byok` or `pro`. The core bundle must contain none of it.
5. **Reversibility**: If a user deletes their key (and has no Pro subscription), or Pro lapses, entitlement returns to `none` and all AI surfaces disappear on the next render. Content the user already accepted from AI suggestions remains in the resume; it is ordinary resume data.
6. **No behavioral dependence**: Core flows (import, edit, reorder, Fit to 1 Page, export) never check entitlement and never branch on it, other than the PDF parser choice described in §7.2 item 3.

**Acceptance criteria**
- With no key and no subscription, a fresh session shows no AI UI anywhere (launcher, editor, preview, export modal, top bar), and the network panel shows no AI SDK chunks loaded.
- After a verified key is added, AI surfaces appear without a page reload; after the key is removed, they disappear.
- The full free workflow (launch, import, edit, paginate, export PDF) is unaffected by entitlement state.

### 7.1 Multi-Provider Client SDK Configuration

Using the [Vercel AI SDK (ai)](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fvercel%2Fai) and its modular provider adapters, a unified `getLanguageModel(config)` factory instantiates the selected provider directly in the browser (or routes through a thin stateless proxy route in the Pro tier):

| Provider | SDK Package | Default Base URL & Model Source | Direct Browser (CORS) Notes |
| :--- | :--- | :--- | :--- |
| **OpenAI** | [@ai-sdk/openai](https://www.google.com/search?q=https%3A%2F%2Fai-sdk.dev%2Fproviders%2Fai-sdk-providers%2Fopenai) | `https://api.openai.com/v1` (model list fetched live from `GET /v1/models`; no hardcoded default) | Supports direct browser calls with user Bearer token. |
| **OpenRouter** | [@openrouter/ai-sdk-provider](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2FOpenRouterTeam%2Fai-sdk-provider) | `https://openrouter.ai/api/v1` (any slug from OpenRouter's live model list) | First-class CORS support designed specifically for client-side BYOK apps. |
| **Anthropic Claude** | [@ai-sdk/anthropic](https://www.google.com/search?q=https%3A%2F%2Fai-sdk.dev%2Fproviders%2Fai-sdk-providers%2Fanthropic) | `https://api.anthropic.com/v1` (suggested defaults `claude-sonnet-5-5` for quality and `claude-haiku-5-5` for speed and cost; full list fetched live from `GET /v1/models`) | Pass `headers: { 'anthropic-dangerous-direct-browser-access': 'true' }` in `createAnthropic()` to enable client-side BYOK calls. |
| **Google Gemini** | [@ai-sdk/google](https://www.google.com/search?q=https%3A%2F%2Fai-sdk.dev%2Fproviders%2Fai-sdk-providers%2Fgoogle) | `https://generativelanguage.googleapis.com/v1beta` (model list fetched live from `GET /v1beta/models`; no hardcoded default) | Supports direct browser requests using `createGoogleGenerativeAI({ apiKey })`. |

#### Model Selection (Live Catalog, No Hardcoded Model IDs)
Provider model lineups change quickly and older IDs get retired, so the app does not ship a fixed model list.
- **Live catalog**: After **Save & Test** succeeds, `modelCatalog.ts` calls the provider's list-models endpoint (OpenAI `GET /v1/models`, Anthropic `GET /v1/models`, OpenRouter's model list, Gemini `GET /v1beta/models`), filters to text-generation models, and shows them newest-first in a picker inside the BYOK settings dialog. Verify CORS behavior for each list endpoint during implementation (Anthropic needs the same direct-browser header as its message calls).
- **Custom model ID**: The picker always offers a free-text field so a user can enter any model ID their key has access to.
- **Seeded fallback**: If the list call fails, the dialog falls back to the free-text field. Only Anthropic has seeded suggestions (`claude-sonnet-5-5`, `claude-haiku-5-5`); OpenAI and Gemini have none, so the user picks explicitly.
- **Persistence**: The selected model ID is stored per provider in IndexedDB beside the encrypted key, and revalidated on the next **Save & Test**. If a stored model ID later errors as unavailable, the UI prompts the user to pick another instead of failing silently.

#### Local Key Encryption & Connection Health Check
- **Local Key Vault**: Keys entered in the BYOK settings modal are encrypted in the browser using the native **Web Crypto API** (`window.crypto.subtle` with `AES-GCM` 256-bit key derived via `PBKDF2` or device-local non-extractable `CryptoKey` stored in IndexedDB via [Dexie.js](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fdexie%2FDexie.js%2F)). The UI masks the saved key, showing only the last 4 characters.
- **Save & Test Ping**: Following [Reactive Resume's provider verification flow](https://www.google.com/search?q=https%3A%2F%2Fdocs.rxresu.me%2Fguides%2Fusing-ai), clicking **Save & Test** sends a minimal 5-token `generateText` probe (`maxOutputTokens: 5`) and displays `Connected · <latency> ms` or the exact provider error message.

### 7.2 Three Core AI Workflows (Rendered Only When `hasAiAccess`)

```typescript
import { generateText, streamText, Output } from 'ai';
import { z } from 'zod';

// Structured schema for the Holistic Resume AI Assessment & ATS Scorecard
export const ResumeAssessmentSchema = z.object({
  overallScore: z.number().min(0).max(100),
  categoryScores: z.object({
    impactAndQuantification: z.number().min(0).max(100),
    atsAndFormatReadability: z.number().min(0).max(100),
    clarityAndActionVerbs: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
  }),
  executiveFeedback: z.string(),
  sectionCritiques: z.array(z.object({
    sectionId: z.string(),
    itemId: z.string().optional(),
    severity: z.enum(['critical', 'improvement', 'strength']),
    issue: z.string(),
    originalText: z.string().optional(),
    suggestedRewrite: z.string().optional(),
  })),
  missingKeywords: z.array(z.string()),
});

// Usage (AI SDK v6+): structured output via generateText + Output.object.
// generateObject / streamObject are deprecated and must not be used.
const { output } = await generateText({
  model,
  output: Output.object({ schema: ResumeAssessmentSchema }),
  prompt,
});
```

1. **Inline Section & Bullet AI Refiner (`✨ Refine` Wand)**:
   - Appears next to the `Summary` editor and every `Experience` / `Projects` / `Skills` entry header only when `hasAiAccess` is true (never rendered otherwise).
   - Tapping `✨ Refine` opens a compact popover (or mobile bottom sheet) with four actions:
     - **Rewrite with Impact (XYZ Formula)**: Transforms passive duties into measurable achievements using `streamText`.
     - **Quantify & Strengthen Verbs**: Identifies places where metrics (`%`, `$`, latency, team size) can be added with bracketed prompts for the user to fill in.
     - **Shorten to Fit Page**: Condenses verbose bullets by 25%–35% to help resolve page overflow.
     - **Tailor to Target Job Description**: Accepts a pasted job posting and reorders/refines bullets and skills to match role requirements.
   - Displays a **Side-by-Side / Inline Diff Preview** (*Original* vs. *Proposed*) with **Accept** (commits to [Zustand](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fpmndrs%2Fzustand) / [Zundo](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fcharkour%2Fzundo) undo stack) and **Discard** buttons.
2. **Overall AI Resume Assessment & Scorecard**:
   - Accessible from the top bar (**AI Review** tab, rendered only when `hasAiAccess` is true), calling `generateText({ model, output: Output.object({ schema: ResumeAssessmentSchema }), prompt })` against the serialized resume JSON (and optional target job description).
   - Renders a visual scorecard (`0–100` overall + 4 sub-scores) and an interactive checklist of critiques where every `suggestedRewrite` has a **One-Tap Apply** button that patches the exact item in the store and highlights the updated block in the live preview.
3. **AI-Powered PDF Resume Parser Upgrade**:
   - When `hasAiAccess` is true during PDF upload (no separate toggle is added to the launcher), Stage 1 (`pdfjs-dist` text + coordinate dump) feeds directly into `generateText({ model, output: Output.object({ schema: ResumeDocumentZodSchema }), prompt })`.
   - This hybrid approach resolves complex multi-column creative PDFs, non-English headers, and unconventional date formats that rule-based regex parsers miss, while falling back to the [OpenResume](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fxitanggg%2Fopen-resume) heuristic parser, which remains the default and only parser for any user without AI access.

### 7.3 Free Launch vs. Paid Pro Tier Architecture

AI is not part of the free core experience. It is unlocked by exactly one of two paths: adding a verified BYOK key, or subscribing to Pro (see §7.0).

| Feature / Capability | Phase 1: Free Launch (100% Client-Side) | Phase 2: Pro Paid Tier (Managed SaaS) |
| :--- | :--- | :--- |
| **Hosting & Infrastructure** | Static SPA / Edge deployment ($0 backend compute cost) | Next.js Edge API routes + Postgres/Supabase & Stripe billing |
| **Templates & Browser Print PDF** | All 6 modular HTML templates + unlimited native browser PDF exports | Unlocks premium industry templates, custom CSS injection, and cover letter matching |
| **PDF Resume Import** | Instant in-browser heuristic parser ([OpenResume](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fxitanggg%2Fopen-resume) 4-step algorithm) (AI parsing unlocks only once a BYOK key is added) | Managed 1-click AI & Vision OCR PDF/DOCX import (no API key setup required) |
| **AI Rewriting & Assessment** | Hidden by default; unlocked only when the user adds their own key (OpenAI, OpenRouter, Claude, Gemini stored in local encrypted IndexedDB) | Unlocked on subscription: zero-setup managed AI credits via server-side [Vercel AI SDK](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fvercel%2Fai) gateway + job-description keyword matcher |
| **AI UI Visibility** | None for new users. Single Settings entry (**Connect AI (optional)**); AI surfaces appear only after a key is verified | AI surfaces appear automatically on subscription; no key entry required |
| **Storage & Sync** | Local IndexedDB ([Dexie.js](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fdexie%2FDexie.js%2F)) + JSON backup import/export | Multi-device cloud sync, version history snapshots, and public shareable resume URLs with view analytics |

## 8. Recommended Project Directory Structure

```text
src/
├── app/
│   ├── layout.tsx                 # Font loading (next/font) & global providers
│   ├── page.tsx                   # Launcher: Upload PDF vs. Start from Scratch (Role Presets). AI-free.
│   └── editor/[resumeId]/page.tsx # Responsive Editor Workspace (Mobile Tabs / Desktop Split)
├── components/
│   ├── editor/
│   │   ├── MobileBottomNav.tsx    # Content | Layout & Order | Preview switcher
│   │   ├── SectionOrderList.tsx   # @dnd-kit sortable list with Main/Sidebar & Page dividers
│   │   ├── EntryDrawerForm.tsx    # Vaul mobile drawer + React Hook Form + Tiptap rich text
│   │   └── AutoFitBanner.tsx      # Overflow detector & 1-click tightening trigger
│   ├── ai/                        # OPT-IN add-on: dynamic import() only when hasAiAccess; excluded from core bundle
│   │   ├── ByokSettingsDialog.tsx # Provider selector, AES-GCM encryption, Save & Test ping, model picker (opened from Settings → Connect AI)
│   │   ├── InlineAiRefineMenu.tsx # Contextual section/bullet rewriter with diff preview
│   │   └── AiScorecardSheet.tsx   # Holistic 0-100 resume critique & 1-tap apply patches
│   └── preview/
│       ├── LiveCanvasViewport.tsx # react-zoom-pan-pinch wrapper for mobile preview
│       ├── PrintPortal.tsx        # Body-level unscaled print-only subtree (#print-portal)
│       ├── InAppBrowserNotice.tsx # "Open in Chrome/Safari" notice + Copy link + JSON backup
│       ├── PrintTriggerButton.tsx # window.print() orchestrator + document.fonts.ready check + afterprint cleanup
│       └── PagePartitioner.tsx    # ResizeObserver height calculator & multi-page splitter
├── templates/
│   ├── registry.ts                # Template metadata (onyx, persian, bronzor, chikorita, azurill, gengar)
│   ├── shared/
│   │   ├── HeaderSlot.tsx         # Intrinsic auto 1fr grid collapsing cleanly when picture.hidden
│   │   ├── SectionRenderer.tsx    # Gap-driven modular section & item renderer
│   │   └── SkillLevelIndicator.tsx# Circle, progress-bar, or inline badge renderer
│   └── layouts/                   # Template-specific HTML/CSS Grid wrappers
├── lib/
│   ├── schema/resume.schema.ts    # Zod schema & TypeScript types (Reactive Resume compatible)
│   ├── store/useResumeStore.ts    # Zustand + Zundo undo/redo + Dexie.js persistence
│   ├── print/detectInAppBrowser.ts # UA heuristics for in-app browsers / webviews
│   ├── parser/
│   │   ├── readPdf.ts             # Stage 1: pdfjs-dist Web Worker coordinate extractor
│   │   ├── groupIntoLines.ts      # Stage 2: Character-width noise merging & line clustering
│   │   ├── groupIntoSections.ts   # Stage 3: 2-column gutter detection & heading classifier
│   │   └── extractFromSections.ts # Stage 4: OpenResume feature scoring matrix
│   ├── ai/                        # OPT-IN add-on (lazy-loaded)
│   │   ├── aiParser.ts            # Opt-in structured PDF parser (generateText + Output.object); used only when hasAiAccess
│   │   ├── providerFactory.ts     # OpenAI, OpenRouter, Anthropic, and Google Gemini client factory
│   │   ├── modelCatalog.ts        # Fetches and filters each provider's live model list for the picker
│   │   └── cryptoVault.ts         # Web Crypto API AES-GCM local API key encryption
│   └── entitlements/
│       ├── useAiEntitlement.ts    # 'none' | 'byok' | 'pro' state; default 'none'
│       └── AiGate.tsx             # Renders children only if hasAiAccess (returns null otherwise)
└── styles/
    └── print.css                  # @page, @media print, break-inside, and color-adjust rules
```
