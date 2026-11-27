/**
 * Heuristic parser for resumes pasted as plain text (PDF copies, LinkedIn
 * profiles, other tools' output). Everything runs locally: the parser turns
 * lines into the same `ResumeDocument` shape the JSON importer produces.
 *
 * The heuristics are intentionally conservative. When a line cannot be
 * classified it is kept as readable body text instead of being dropped, and
 * sections the parser does not understand are ignored rather than folded into
 * the previous section.
 */

import { parseMonthInput } from "@/lib/date/month";
import {
  EDUCATION_HEADER_FEATURES,
  EXPERIENCE_HEADER_FEATURES,
  NAME_FEATURES,
  PROJECT_HEADER_FEATURES,
  getDescriptionsLineIdx,
  scoreBestCandidate,
  type ScorableText,
} from "@/lib/import/featureScoring";
import {
  joinPhraseSegments,
  mergeWrappedPdfLines,
  type PdfLine,
} from "@/lib/import/pdfLayout";
import {
  detectProfileLink,
  websiteLabelFromUrl,
} from "@/lib/links/contactLinks";
import { createEmptyResume, newId } from "@/lib/schema/defaults";
import type {
  AwardItem,
  CertificationItem,
  EducationItem,
  ExperienceItem,
  InterestItem,
  LanguageItem,
  ProfileItem,
  ProjectItem,
  PublicationItem,
  ReferenceItem,
  ResumeDocument,
  SkillItem,
  VolunteerItem,
} from "@/lib/schema/resume.schema";

type SectionKey =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "hardSkills"
  | "softSkills"
  | "profiles"
  | "projects"
  | "certifications"
  | "certificationsEducation"
  | "awards"
  | "languages"
  | "interests"
  | "volunteer"
  | "publications"
  | "references";

/**
 * One parser line. Plain pasted text carries no layout metadata; PDF import
 * fills `isBold`/`maxFontSize`/`lineGap` so heading and subsection detection can
 * use the same reading order the reader sees.
 */
type Line = {
  text: string;
  isBold: boolean;
  maxFontSize: number;
  /** True when the line came from `PdfLine[]` and carries visual metadata. */
  hasLayout: boolean;
  lineGap?: number;
  breakBefore?: "page" | "column";
  /** PDF phrase runs, used to keep wide skill-column gaps as separators. */
  phrases?: string[];
};

const SECTION_ALIASES: Record<string, SectionKey> = {
  summary: "summary",
  "professional summary": "summary",
  "career summary": "summary",
  "executive summary": "summary",
  "profile summary": "summary",
  "personal summary": "summary",
  "summary of qualifications": "summary",
  profile: "summary",
  "professional profile": "summary",
  about: "summary",
  "about me": "summary",
  overview: "summary",
  "professional overview": "summary",
  objective: "summary",
  "career objective": "summary",
  // Contact blocks are routed to parseHeader so a resume that puts
  // "My Contact" below the name still fills the basics fields.
  contact: "header",
  "my contact": "header",
  "contact details": "header",
  "contact information": "header",
  "contact info": "header",
  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  "relevant experience": "experience",
  "relevant work experience": "experience",
  "employment history": "experience",
  "work history": "experience",
  "career history": "experience",
  "professional background": "experience",
  "work background": "experience",
  employment: "experience",
  internship: "experience",
  internships: "experience",
  "internship experience": "experience",
  education: "education",
  "education & training": "education",
  "education and training": "education",
  "education background": "education",
  "educational background": "education",
  "education history": "education",
  "academic background": "education",
  "academic credentials": "education",
  academics: "education",
  skills: "skills",
  "technical skills": "skills",
  "core skills": "skills",
  "core competencies": "skills",
  competencies: "skills",
  "areas of expertise": "skills",
  "skills & tools": "skills",
  "skills and tools": "skills",
  "skills & expertise": "skills",
  "skills and expertise": "skills",
  "key skills": "skills",
  "top skills": "skills",
  "skill set": "skills",
  skillset: "skills",
  "technical expertise": "skills",
  "technical proficiencies": "skills",
  "technical skill set": "skills",
  "key competencies": "skills",
  "tools & technologies": "skills",
  "tools and technologies": "skills",
  "software & tools": "skills",
  "software and tools": "skills",
  "programming languages": "skills",
  technologies: "skills",
  // These two keep their heading as the skill category (see parseSkills).
  "hard skills": "hardSkills",
  "soft skills": "softSkills",
  profiles: "profiles",
  links: "profiles",
  "social links": "profiles",
  "online profiles": "profiles",
  projects: "projects",
  "personal projects": "projects",
  "selected projects": "projects",
  "side projects": "projects",
  "academic projects": "projects",
  "key project": "projects",
  "key projects": "projects",
  certifications: "certifications",
  certification: "certifications",
  certificates: "certifications",
  "professional certifications": "certifications",
  "courses & certifications": "certifications",
  "courses and certifications": "certifications",
  "licenses & certifications": "certifications",
  "licenses and certifications": "certifications",
  licenses: "certifications",
  // A combined heading is more common than a separate awards block; the
  // certifications parser still keeps each line (and its date/issuer) intact.
  "certifications & awards": "certifications",
  "certifications and awards": "certifications",
  "certifications & education": "certificationsEducation",
  "certifications and education": "certificationsEducation",
  "education & certifications": "certificationsEducation",
  "education and certifications": "certificationsEducation",
  "professional development": "certifications",
  awards: "awards",
  honors: "awards",
  honours: "awards",
  achievements: "awards",
  accomplishments: "awards",
  recognition: "awards",
  recognitions: "awards",
  "awards & honors": "awards",
  "awards and honors": "awards",
  "awards & achievements": "awards",
  "awards and achievements": "awards",
  "achievements & extracurriculars": "awards",
  "achievements and extracurriculars": "awards",
  "achievements & extra curriculars": "awards",
  "achievements and extra curriculars": "awards",
  "honors & awards": "awards",
  "honors and awards": "awards",
  languages: "languages",
  "language skills": "languages",
  interests: "interests",
  hobbies: "interests",
  "hobbies & interests": "interests",
  "hobbies and interests": "interests",
  "personal interests": "interests",
  "activities & interests": "interests",
  volunteer: "volunteer",
  "volunteer experience": "volunteer",
  "volunteer work": "volunteer",
  volunteering: "volunteer",
  "community involvement": "volunteer",
  "community service": "volunteer",
  "extra curricular": "volunteer",
  "extra-curricular": "volunteer",
  extracurricular: "volunteer",
  "extra curricular activities": "volunteer",
  "extracurricular activities": "volunteer",
  publications: "publications",
  papers: "publications",
  research: "publications",
  references: "references",
  "professional references": "references",
  referees: "references",
};

const BULLET_PREFIX = /^[-*•▪◦●○■□‣⁃]\s+/;
const INLINE_HEADING = /^([^:]{1,48}):\s+(\S.*)$/;
const EDGE_SEPARATORS = /^[\s|•·,;:–—-]+|[\s|•·,;:–—-]+$/g;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
// Indian numbers are commonly written `+91 63699 40501` (country code plus
// 5+5 digits). Try that shape first: the generic pattern groups 6-3-4 and
// stops one digit early, leaking the last digit into the headline.
const PHONE_PATTERN =
  /(?:\+91[\s.-]?)?[6-9]\d{4}[\s.-]\d{5}|(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]?\d{3,4}(?:[\s.-]?\d{3,4})?/;
const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s|•·,;]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s|•·,;]*)?/gi;
// Entry URLs are stricter than header URLs: a project keyword such as
// "Node.js" must not be mistaken for a domain and turned into a link.
const ENTRY_URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s|•·,;]+|\b(?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|co|me|ai|app|edu|gov|info|xyz|so|sh|link|ly)(?:\/[^\s|•·,;]*)?/gi;
// A location may be a US `City, ST`, a three-part `City, Region, Country`, or
// a well-known standalone world city. Unicode capitals keep names such as
// `São Paulo` parseable; lowercase particles (`de`, `van`, …) stay allowed.
const LOCATION_WORD = "(?:\\p{Lu}[\\p{L}'.-]*|de|van|of|la|le|bin|al)";
const LOCATION_PART = `${LOCATION_WORD}(?:\\s+${LOCATION_WORD})*`;
const LOCATION_PATTERN = new RegExp(
  `^${LOCATION_PART}(?:,\\s*${LOCATION_PART}){1,2}(?:\\s+\\d{5}(?:-\\d{4})?)?$`,
  "u",
);
const STANDALONE_CITY_NAMES =
  "london|berlin|paris|tokyo|sydney|toronto|singapore|dublin|bengaluru|bangalore|mumbai|delhi|hyderabad|chennai|pune|nairobi|lagos|cairo|dubai|amsterdam|madrid|rome|seoul|beijing|shanghai|hong kong|sao paulo|são paulo|mexico city|vancouver|montreal|melbourne|auckland|stockholm|oslo|copenhagen|helsinki|warsaw|prague|vienna|zurich|geneva|brussels|lisbon|istanbul|tel aviv|moscow|kyiv|kiev|jakarta|manila|bangkok|kuala lumpur|osaka|seattle|boston|chicago|austin|denver|atlanta|miami|houston|dallas|phoenix|philadelphia|san diego|san jose|portland|detroit|minneapolis|raleigh|nashville|salt lake city";
const STANDALONE_CITY_PATTERN = new RegExp(
  `^(?:${STANDALONE_CITY_NAMES})$`,
  "iu",
);
const TRAILING_LOCATION_PATTERN = new RegExp(
  `(?:^|[\\s|,;•·–—-])((?:(?:${STANDALONE_CITY_NAMES})|${LOCATION_PART}(?:,\\s*${LOCATION_PART}){1,2})(?:\\s+\\d{5}(?:-\\d{4})?)?)\\s*$`,
  "iu",
);
const NON_LOCATION_WORDS =
  /\b(inc|llc|ltd|corp|corporation|company|gmbh|plc|group|labs|studio|studios|systems|technologies|solutions|partners|bank|university|college|institute|school|academy|agency|consulting|media|degree|bachelor|master|associate|doctor|diploma|science|mathematics|humanities)\b/i;
const TITLE_WORDS =
  /\b(engineer|engineering|developer|manager|management|designer|analyst|director|intern|internship|consultant|specialist|lead|coordinator|associate|assistant|officer|architect|scientist|researcher|head|vp|vice president|president|founder|owner|accountant|recruiter|administrator|teacher|professor|strategist|planner|producer|editor|writer|technician|supervisor|executive|auditor|controller|paralegal|attorney|counsel|nurse|physician|therapist|pharmacist|chef)\b/i;
const COMPANY_WORDS =
  /\b(inc|llc|ltd|corp|corporation|company|co|gmbh|plc|group|labs|studio|studios|systems|technologies|solutions|partners|bank|university|college|institute|school|academy|agency|media|consulting)\b/i;
const SCHOOL_WORDS =
  /\b(university|college|institute|school|academy|polytechnic|conservatory|faculty)\b/i;
const COMPANY_SUFFIX_ONLY = /^(inc|llc|ltd|corp|corporation|gmbh|plc|co)\.?$/i;
// The lookahead stops a short abbreviation such as `B.Eng` from matching the
// start of a normal word (`Bengaluru`); `B.Sc.` / `M.Sc.` need their own forms.
const DEGREE_PATTERN =
  /((?:Bachelor|Master|Associate|Doctor)(?:'s)?(?:\s+of\s+(?!in\b)[A-Za-z]+(?:\s+(?!in\b)[A-Za-z]+){0,2})?|B\.?\s?Sc\.?|M\.?\s?Sc\.?|B\.?\s?S\.?|M\.?\s?S\.?|B\.?\s?A\.?|M\.?\s?A\.?|MBA|Ph\.?\s?D\.?|B\.?\s?F\.?\s?A\.?|M\.?\s?F\.?\s?A\.?|B\.?\s?Eng\.?|M\.?\s?Eng\.?|B\.?\s?Tech\.?|M\.?\s?Tech\.?|B\.?\s?Com\.?|M\.?\s?Com\.?|BCA|MCA|B\.?\s?Arch\.?|M\.?\s?Arch\.?|B\.?\s?E\.?|M\.?\s?E\.?)(?![A-Za-z])(?:\s+in\s+([^,|•·]+))?/i;
const GPA_PATTERN =
  /(?:gpa[:\s]*([0-9]+(?:\.[0-9]+)?)(?:\s*\/\s*[0-9.]+)?|([0-9]+(?:\.[0-9]+)?)\s*gpa)/i;
const DATE_TOKEN =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?\\s+\\d{4}|(?:Spring|Summer|Fall|Autumn|Winter)\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4}-\\d{1,2}|\\d{4}";
const DATE_RANGE_PATTERN = new RegExp(
  `(${DATE_TOKEN})\\s*(?:-|–|—|to)\\s*(${DATE_TOKEN}|present|current|now|ongoing)`,
  "i",
);
// `2019–21` / `2023-24`: the end year is abbreviated to two digits. The end
// must be 13 or higher so a `YYYY-MM` token (`2020-01`) is never mistaken for a
// range.
const SHORT_YEAR_RANGE_PATTERN =
  /(?:^|[\s|,;•·–—(])((?:19|20)\d{2})\s*[-–—]\s*(\d{2})(?=$|[\s|,;•·–—)])/;
const SEASON_MONTHS: Record<string, string> = {
  spring: "03",
  summer: "06",
  fall: "09",
  autumn: "09",
  winter: "12",
};
const SINGLE_DATE_PATTERN = new RegExp(
  `(?:^|[\\s|,;•·–—])\\(?(${DATE_TOKEN})\\)?(?=$|[\\s|,;•·–—])`,
  "i",
);
// The same single-date token, but with the leading separator captured so an
// entry line can strip just the date (`Completed in 2018` → no header text).
const SINGLE_DATE_IN_LINE = new RegExp(
  `(^|[\\s|,;•·–—])\\(?(${DATE_TOKEN})\\)?(?=$|[\\s|,;•·–—])`,
  "i",
);
const ENTRY_DATE_MARKER =
  /\b(completed|graduated|awarded|earned|finished|received|expected|anticipated|due)\b(?:\s+(?:in|on|by))?[\s:]*/i;
const INLINE_BULLET_SEPARATOR = /[,;|•·▪◦●○■□‣⁃]|\s{2,}/;
// `3 Months` / `1 Month` is a duration, not a header line. Only a whole-line
// token counts, so a bullet that happens to mention three months stays copy.
const DURATION_LINE =
  /^(?:duration\s*[:\-–—]?\s*)?(\d{1,2})\s*(?:months?|mos?)$/i;

type DateRange = {
  startDate: string;
  endDate: string;
  current: boolean;
  matchedText: string;
};

function cleanLine(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\t/g, " ").trim();
}

function collapseSpaces(value: string): string {
  return value.replace(/[ ]{2,}/g, " ").trim();
}

function trimSeparators(value: string): string {
  return value.replace(EDGE_SEPARATORS, "").trim();
}

function isBullet(value: string): boolean {
  return BULLET_PREFIX.test(value.trim());
}

function stripBullet(value: string): string {
  return value.trim().replace(BULLET_PREFIX, "").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainLine(text: string): Line {
  return { text, isBold: false, maxFontSize: 0, hasLayout: false };
}

function isBlankLine(line: Line): boolean {
  return line.text.trim() === "";
}

function normalizeTextLines(input: string): Line[] {
  const raw = input
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => collapseSpaces(line.replace(/\t/g, " ")));

  const lines: Line[] = [];

  for (const line of raw) {
    if (line === "" && (lines.length === 0 || isBlankLine(lines[lines.length - 1]))) {
      continue;
    }

    lines.push(plainLine(line));
  }

  while (lines.length > 0 && isBlankLine(lines[lines.length - 1])) {
    lines.pop();
  }

  return lines;
}

function modal(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const counts = new Map<number, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let best = values[0];
  let bestCount = 0;

  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }

  return best;
}

/** OpenResume uses a paragraph gap of 1.4× the modal line spacing. */
const PARAGRAPH_GAP_FACTOR = 1.4;

function paragraphGapThreshold(
  lines: readonly { lineGap?: number }[],
): number {
  const gaps = lines
    .map((line) => line.lineGap)
    .filter(
      (gap): gap is number =>
        typeof gap === "number" && Number.isFinite(gap) && gap > 0,
    );
  const typical = modal(gaps);

  return typical > 0 ? typical * PARAGRAPH_GAP_FACTOR : Number.POSITIVE_INFINITY;
}

/**
 * Turn reconstructed PDF lines into parser lines. Wrapped words are rejoined,
 * page/column breaks and paragraph-sized gaps become blank separators, and the
 * visual metadata is kept for heading and subsection detection.
 */
function linesFromPdf(input: readonly PdfLine[]): Line[] {
  if (input.length === 0) {
    return [];
  }

  const merged = mergeWrappedPdfLines([...input]);
  const gapThreshold = paragraphGapThreshold(merged);
  const lines: Line[] = [];

  merged.forEach((line, index) => {
    if (index > 0) {
      const gap = line.lineGap;
      const paragraphBreak =
        typeof gap === "number" && gap >= gapThreshold;

      if (line.breakBefore !== undefined || paragraphBreak) {
        lines.push(plainLine(""));
      }
    }

    const text = collapseSpaces(cleanLine(line.text));

    if (text === "") {
      return;
    }

    lines.push({
      text,
      isBold: line.isBoldLine,
      maxFontSize: line.maxFontSize,
      hasLayout: true,
      lineGap: line.lineGap,
      breakBefore: line.breakBefore,
      phrases: line.phrases.map((phrase) => phrase.text),
    });
  });

  while (lines.length > 0 && isBlankLine(lines[0])) {
    lines.shift();
  }

  while (lines.length > 0 && isBlankLine(lines[lines.length - 1])) {
    lines.pop();
  }

  return lines;
}

function normalizeLines(input: string | readonly PdfLine[]): Line[] {
  return typeof input === "string" ? normalizeTextLines(input) : linesFromPdf(input);
}

/** `E X P E R I E N C E` → `EXPERIENCE`, common in LaTeX/InDesign exports. */
function collapseLetterSpaced(value: string): string {
  const tokens = value.trim().split(/\s+/);

  if (tokens.length >= 3 && tokens.every((token) => token.length === 1)) {
    return tokens.join("");
  }

  return value;
}

function headingKey(value: string): SectionKey | null {
  const withoutNotes = value.replace(/\s*\([^)]*\)\s*$/g, "");
  const cleaned = collapseLetterSpaced(withoutNotes)
    .replace(/^#+\s*/, "")
    .replace(BULLET_PREFIX, "")
    .replace(/[*_]+/g, "")
    .replace(/[\s.:|\-–—]+$/, "")
    .trim()
    .toLowerCase();

  if (cleaned === "") {
    return null;
  }

  if (cleaned.length <= 48) {
    const direct = SECTION_ALIASES[cleaned];

    if (direct) {
      return direct;
    }
  }

  // Multi-word letter-spaced headings paste as one run of single letters, so
  // `P R O F E S S I O N A L D E V E L O P M E N T` collapses to a single
  // word. Compare against the aliases with their spaces removed to recover it.
  const compact = cleaned.replace(/\s+/g, "");

  if (compact.length > 48) {
    return null;
  }

  for (const [alias, key] of Object.entries(SECTION_ALIASES)) {
    if (alias.replace(/\s+/g, "") === compact) {
      return key;
    }
  }

  return null;
}

function modalFontSize(lines: readonly Line[]): number {
  return modal(
    lines
      .filter((line) => line.hasLayout && line.maxFontSize > 0)
      .map((line) => line.maxFontSize),
  );
}

/**
 * A section heading is an alias match. With PDF metadata it must also look like
 * a heading — all caps, bold, or larger than body copy — so a body line that
 * happens to read "Experience" cannot start a new section.
 */
function isHeadingLine(line: Line, bodyFontSize: number): boolean {
  if (headingKey(line.text) === null) {
    return false;
  }

  if (!line.hasLayout) {
    return true;
  }

  const allCaps =
    /\p{L}/u.test(line.text) && line.text === line.text.toUpperCase();
  const larger = bodyFontSize > 0 && line.maxFontSize > bodyFontSize * 1.15;

  return allCaps || line.isBold || larger;
}

function splitSections(lines: Line[]): {
  header: Line[];
  sections: Partial<Record<SectionKey, Line[]>>;
} {
  const header: Line[] = [];
  const sections: Partial<Record<SectionKey, Line[]>> = {};
  const bodyFontSize = modalFontSize(lines);
  let current: SectionKey = "header";

  for (const line of lines) {
    let key = isHeadingLine(line, bodyFontSize) ? headingKey(line.text) : null;
    let inlineContent: string | null = null;

    if (!key) {
      const inline = INLINE_HEADING.exec(line.text);
      // Only all-caps headings carry inline content: "SKILLS: Python, SQL".
      // Title-case lines such as "Languages: TypeScript, Python" are skill
      // categories inside the current section, not new headings.
      if (inline && inline[1] === inline[1].toUpperCase()) {
        const inlineKey = headingKey(inline[1]);

        if (inlineKey) {
          key = inlineKey;
          inlineContent = inline[2];
        }
      }
    }

    if (key) {
      current = key;
      sections[key] = sections[key] ?? [];

      if (inlineContent !== null) {
        sections[key]?.push({ ...line, text: inlineContent });
      }

      continue;
    }

    if (current === "header") {
      header.push(line);
    } else {
      sections[current]?.push(line);
    }
  }

  return { header, sections };
}

function looksLikeLocation(value: string): boolean {
  const trimmed = value.trim();

  if (/^(remote|hybrid|on-?site)$/i.test(trimmed)) {
    return true;
  }

  if (STANDALONE_CITY_PATTERN.test(trimmed)) {
    return true;
  }

  if (!LOCATION_PATTERN.test(trimmed)) {
    return false;
  }

  // Reject every comma-separated part, not just the first: `Acme, London`
  // and a school name followed by a city must not be read as one location.
  return trimmed
    .replace(/\s+\d{5}(?:-\d{4})?$/, "")
    .split(",")
    .map((part) => part.trim())
    .every(
      (part) => !NON_LOCATION_WORDS.test(part) && !TITLE_WORDS.test(part),
    );
}

function splitTrailingLocation(value: string): {
  rest: string;
  location: string;
} {
  const match = TRAILING_LOCATION_PATTERN.exec(value);

  if (!match) {
    return { rest: value, location: "" };
  }

  const location = match[1];

  if (!looksLikeLocation(location)) {
    return { rest: value, location: "" };
  }

  return {
    rest: trimSeparators(value.slice(0, match.index)),
    location,
  };
}

function looksLikeName(value: string): boolean {
  const trimmed = value.trim();
  const words = trimmed.split(/\s+/);
  const titleCased = words.every(
    (word) =>
      /^[A-Z]/.test(word) ||
      /^(?:van|von|de|da|del|der|la|le|bin|al)$/i.test(word),
  );

  return (
    trimmed.length > 0 &&
    trimmed.length <= 60 &&
    words.length <= 4 &&
    titleCased &&
    !/[.!?]$/.test(trimmed) &&
    !/\d{2,}|@|https?:|www\./i.test(trimmed) &&
    !TITLE_WORDS.test(trimmed) &&
    !looksLikeLocation(trimmed)
  );
}

function looksLikeHeadline(value: string): boolean {
  const trimmed = value.trim();

  return (
    trimmed.length > 0 &&
    trimmed.length <= 120 &&
    !EMAIL_PATTERN.test(trimmed) &&
    !/https?:|www\./i.test(trimmed)
  );
}

/**
 * An unlabelled opening paragraph is prose, not a headline: it is longer than
 * a headline and contains at least two sentences. Reactive Resume and Canva
 * exports often place it above the first heading, where it used to be dropped.
 */
function isOpeningSummary(value: string): boolean {
  const trimmed = value.trim();

  return (
    trimmed.length > 120 &&
    (trimmed.match(/[.!?](?=\s|$)/g)?.length ?? 0) >= 2
  );
}

/** A leftover header line long enough to be part of an opening paragraph. */
function isProseLike(value: string): boolean {
  const trimmed = value.trim();

  return (
    trimmed.length > 90 &&
    !looksLikeName(trimmed) &&
    !looksLikeLocation(trimmed) &&
    !EMAIL_PATTERN.test(trimmed) &&
    !/https?:|www\./i.test(trimmed)
  );
}

function isPhoneLike(value: string): boolean {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    return false;
  }

  return !/^\d{4}[-/]\d{1,4}$/.test(value.trim());
}

function normalizeUrl(value: string): string {
  const trimmed = value.replace(/[),.;]+$/, "");

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

type HeaderResult = {
  basics: {
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
  };
  profiles: ProfileItem[];
  website: { url: string; label: string };
  /** An unlabelled multi-sentence paragraph from the top of the resume. */
  openingSummary: string;
};

function parseHeader(lines: Line[]): HeaderResult {
  const basics = {
    name: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
  };
  const profiles: ProfileItem[] = [];
  const seenProfileUrls = new Set<string>();
  let website = { url: "", label: "" };
  let openingSummary = "";
  const candidates: ScorableText[] = [];
  const proseLines: ScorableText[] = [];

  const splitSegments = (line: string): string[] =>
    line
      .split(/\s*[|•·]\s*/)
      .map((segment) => segment.trim())
      .filter((segment) => segment !== "");

  for (const rawLine of lines) {
    for (const segment of splitSegments(rawLine.text)) {
      let rest = segment;
      const label =
        /^(name|headline|title|role|email|e-?mail|phone|mobile|location|address|website|portfolio)\s*:\s*(.+)$/i.exec(
          rest,
        );

      if (label) {
        const field = label[1].toLowerCase();
        const value = label[2].trim();

        if (field === "name") {
          basics.name = basics.name || value;
          continue;
        }

        if (field === "headline" || field === "title" || field === "role") {
          basics.headline = basics.headline || value;
          continue;
        }

        if (field === "email" || field === "e-mail") {
          basics.email = basics.email || value;
          continue;
        }

        if (field === "phone" || field === "mobile") {
          basics.phone = basics.phone || value;
          continue;
        }

        if (field === "location" || field === "address") {
          basics.location = basics.location || value;
          continue;
        }

        rest = value;
      }

      const email = EMAIL_PATTERN.exec(rest)?.[0];

      if (email) {
        basics.email = basics.email || email;
        rest = rest.replace(email, " ");
      }

      const phone = PHONE_PATTERN.exec(rest)?.[0];

      if (phone && isPhoneLike(phone)) {
        basics.phone = basics.phone || phone;
        rest = rest.replace(phone, " ");
      }

      const urls = rest.match(URL_PATTERN) ?? [];

      for (const url of urls) {
        const detected = detectProfileLink(url);

        if (detected) {
          const normalized = normalizeUrl(url);

          if (!seenProfileUrls.has(normalized)) {
            seenProfileUrls.add(normalized);
            profiles.push({
              id: newId(),
              hidden: false,
              network: detected.network,
              username: detected.username,
              url: normalized,
              icon: detected.icon,
            });
          }
        } else if (website.url === "") {
          website = {
            url: normalizeUrl(url),
            label: websiteLabelFromUrl(url),
          };
        }
      }

      if (urls.length > 0) {
        rest = rest.replace(new RegExp(URL_PATTERN.source, "gi"), " ");
      }

      rest = trimSeparators(cleanLine(rest));

      if (rest === "") {
        continue;
      }

      if (looksLikeLocation(rest)) {
        basics.location = basics.location || rest;
        continue;
      }

      const candidate: ScorableText = {
        text: rest,
        isBold: rawLine.isBold,
        maxFontSize: rawLine.maxFontSize,
      };

      if (isProseLike(rest)) {
        proseLines.push(candidate);
      } else {
        candidates.push(candidate);
      }
    }
  }

  // PDF text wraps an unlabelled summary onto several lines. Join them back
  // into one paragraph before deciding whether it is prose, otherwise each
  // wrapped line would be discarded separately. A long headline is returned
  // to the candidate list when the joined text is not multi-sentence prose.
  const prose = collapseSpaces(proseLines.map((line) => line.text).join(" "));

  if (isOpeningSummary(prose)) {
    openingSummary = prose;
  } else {
    candidates.push(...proseLines);
  }

  // Weighted scoring (not just reading order) picks the name: the largest,
  // boldest name-shaped line wins, and an email/phone line never does.
  const bestName =
    basics.name === ""
      ? scoreBestCandidate(
          candidates.filter((candidate) => looksLikeName(candidate.text)),
          [{ field: "name", predicates: NAME_FEATURES }],
        )
      : null;

  if (bestName) {
    basics.name = bestName.value.text;
  }

  for (const candidate of candidates) {
    if (bestName && candidate === bestName.value) {
      continue;
    }

    if (basics.headline === "" && looksLikeHeadline(candidate.text)) {
      basics.headline = candidate.text;
    }
  }

  return { basics, profiles, website, openingSummary };
}

/**
 * Last-resort contact scan. Two-column PDF reconstruction can leave an email,
 * phone, or profile URL outside the top header block (for example in a
 * sidebar). Only fills fields the header did not already provide and only
 * accepts URLs of recognised profile networks.
 */
function scanContactFallback(
  lines: string[],
  seenUrls: ReadonlySet<string>,
): { email: string; phone: string; profiles: ProfileItem[] } {
  let email = "";
  let phone = "";
  const profiles: ProfileItem[] = [];
  const seen = new Set(seenUrls);

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);

    if (line === "") {
      continue;
    }

    if (email === "") {
      email = EMAIL_PATTERN.exec(line)?.[0] ?? "";
    }

    if (phone === "") {
      const candidate = PHONE_PATTERN.exec(line)?.[0] ?? "";

      if (candidate && isPhoneLike(candidate)) {
        phone = candidate;
      }
    }

    for (const url of line.match(URL_PATTERN) ?? []) {
      const detected = detectProfileLink(url);

      if (!detected) {
        continue;
      }

      const normalized = normalizeUrl(url);

      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      profiles.push({
        id: newId(),
        hidden: false,
        network: detected.network,
        username: detected.username,
        url: normalized,
        icon: detected.icon,
      });
    }
  }

  return { email, phone, profiles };
}

function parseProfileLinks(lines: string[]): ProfileItem[] {
  const profiles: ProfileItem[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);

    if (line === "") {
      continue;
    }

    for (const url of line.match(URL_PATTERN) ?? []) {
      const normalized = normalizeUrl(url);

      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      const detected = detectProfileLink(url);

      profiles.push({
        id: newId(),
        hidden: false,
        network: detected?.network ?? "",
        username: detected?.username ?? "",
        url: normalized,
        icon: detected?.icon ?? "",
      });
    }
  }

  return profiles;
}

function linesToRichText(lines: string[]): string {
  const parts: string[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }

    parts.push(`<p>${escapeHtml(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushBullets = () => {
    if (bullets.length === 0) {
      return;
    }

    parts.push(
      `<ul>${bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`,
    );
    bullets = [];
  };

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);

    if (line === "") {
      flushParagraph();
      flushBullets();
      continue;
    }

    if (isBullet(line)) {
      flushParagraph();
      bullets.push(stripBullet(line));
    } else {
      flushBullets();
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushBullets();

  return parts.join("");
}

function normalizeDateToken(token: string, yearMonth: "01" | "12"): string {
  const trimmed = token.trim();
  const season = /^([A-Za-z]+)\s+(\d{4})$/.exec(trimmed);

  if (season) {
    const month = SEASON_MONTHS[season[1].toLowerCase()];

    if (month) {
      return `${season[2]}-${month}`;
    }
  }

  if (/^\d{4}$/.test(trimmed)) {
    return `${trimmed}-${yearMonth}`;
  }

  return parseMonthInput(trimmed) ?? "";
}

/** Add months to a `YYYY-MM` value, used for `3 Months` durations. */
function addMonths(monthValue: string, months: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthValue);

  if (!match || months <= 0) {
    return "";
  }

  const total = Number(match[1]) * 12 + (Number(match[2]) - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

function durationMonths(value: string): number {
  const match = DURATION_LINE.exec(value.trim());

  return match ? Number(match[1]) : 0;
}

function extractShortYearRange(value: string): DateRange | null {
  const match = SHORT_YEAR_RANGE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const startYear = Number(match[1]);
  const endYearPart = Number(match[2]);

  if (endYearPart < 13) {
    return null;
  }

  let endYear = Math.floor(startYear / 100) * 100 + endYearPart;

  if (endYear < startYear) {
    endYear += 100;
  }

  return {
    startDate: `${match[1]}-01`,
    endDate: `${String(endYear).padStart(4, "0")}-12`,
    current: false,
    matchedText: match[0].replace(/^[\s|,;•·(]+/, ""),
  };
}

function extractDateRange(value: string): DateRange | null {
  const short = extractShortYearRange(value);

  if (short) {
    return short;
  }

  const match = DATE_RANGE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const endToken = match[2].trim();
  const current = /^(present|current|now|ongoing)$/i.test(endToken);
  const startDate = normalizeDateToken(match[1], "01");
  const endDate = current ? "" : normalizeDateToken(endToken, "12");

  if (startDate === "" && endDate === "" && !current) {
    return null;
  }

  return {
    startDate,
    endDate,
    current,
    matchedText: match[0],
  };
}

/**
 * Recognises both ranges (`Jan 2020 - Present`) and single dates
 * (`Completed in 2018`, `Expected May 2027`, `Apr 2026`, `2014`). A bare
 * single date belongs at the start of an experience entry but at the end of
 * an education entry (graduation), hence `singleDateField`.
 */
function extractEntryDates(
  value: string,
  singleDateField: "start" | "end",
): DateRange | null {
  const range = extractDateRange(value);

  if (range) {
    return range;
  }

  const marker = ENTRY_DATE_MARKER.exec(value);
  const searchFrom = marker ? marker.index + marker[0].length : 0;
  const match = SINGLE_DATE_IN_LINE.exec(value.slice(searchFrom));

  if (!match) {
    return null;
  }

  const isExpected = marker
    ? /^(?:expected|anticipated|due)/i.test(marker[1])
    : false;
  const month = normalizeDateToken(match[2], isExpected ? "01" : "12");

  if (month === "") {
    return null;
  }

  const matchStart = searchFrom + match.index + match[1].length;
  const matchEnd = searchFrom + match.index + match[0].length;

  return {
    startDate: singleDateField === "start" ? month : "",
    endDate: singleDateField === "end" ? month : "",
    current: false,
    matchedText: value.slice(marker ? marker.index : matchStart, matchEnd),
  };
}

function isDateAnchor(line: Line): boolean {
  const trimmed = line.text.trim();

  if (trimmed === "" || isBullet(trimmed) || trimmed.length > 90) {
    return false;
  }

  return extractEntryDates(trimmed, "end") !== null;
}

function splitOnBlankLines(lines: Line[]): Line[][] {
  const blocks: Line[][] = [];
  let current: Line[] = [];

  for (const line of lines) {
    if (isBlankLine(line)) {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }

      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    blocks.push(current);
  }

  return blocks;
}

/** Splits one blank-free block at each date anchor, keeping its title lines. */
function splitOnDateAnchors(lines: Line[], anchors: number[]): Line[][] {
  const starts: number[] = [];
  let floor = 0;

  for (const anchor of anchors) {
    let start = anchor;
    let back = anchor - 1;
    let taken = 0;

    while (back >= floor && taken < 2) {
      const candidate = lines[back].text.trim();

      if (
        candidate === "" ||
        isBullet(candidate) ||
        extractDateRange(candidate)
      ) {
        break;
      }

      start = back;
      back -= 1;
      taken += 1;
    }

    if (starts.length > 0 && start <= starts[starts.length - 1]) {
      start = anchor;
    }

    starts.push(start);
    floor = anchor + 1;
  }

  const blocks: Line[][] = [];
  const preamble = lines.slice(0, starts[0]).filter((line) => !isBlankLine(line));

  for (let index = 0; index < starts.length; index += 1) {
    const end = index + 1 < starts.length ? starts[index + 1] : lines.length;
    const block = lines
      .slice(starts[index], end)
      .filter((line) => !isBlankLine(line));

    if (index === 0 && preamble.length > 0) {
      block.unshift(...preamble);
    }

    if (block.length > 0) {
      blocks.push(block);
    }
  }

  return blocks;
}

/**
 * A blank-separated group that starts with a bullet, or that has no title,
 * company, school, or location line of its own, is a paragraph gap inside the
 * previous entry — not a new role. PDFs insert these between bullets.
 */
function isContinuationBlock(block: Line[]): boolean {
  const first = block.find((line) => !isBlankLine(line));

  if (first === undefined) {
    return true;
  }

  if (isBullet(first.text)) {
    return true;
  }

  return !block.some((line) => {
    const trimmed = cleanLine(line.text);

    if (trimmed === "" || isBullet(trimmed)) {
      return false;
    }

    return (
      TITLE_WORDS.test(trimmed) ||
      COMPANY_WORDS.test(trimmed) ||
      SCHOOL_WORDS.test(trimmed) ||
      looksLikeLocation(trimmed) ||
      extractDateRange(trimmed) !== null ||
      /[|•·]/.test(trimmed)
    );
  });
}

/**
 * OpenResume-style subsection split for PDF lines: a non-bullet bold line after
 * non-bold copy, or a paragraph-sized vertical gap, starts a new entry. Only
 * the header region (before the first description line) is considered, so a
 * bold metric inside a bullet list cannot invent a role.
 */
function splitLayoutSubsections(block: Line[]): Line[][] {
  if (block.length < 2 || !block.some((line) => line.hasLayout)) {
    return [block];
  }

  const gapThreshold = paragraphGapThreshold(block);
  const descriptionIndex = getDescriptionsLineIdx(block);
  const limit = descriptionIndex >= 0 ? descriptionIndex : block.length - 1;
  const starts: number[] = [];

  for (let index = 1; index <= limit; index += 1) {
    const previous = block[index - 1];
    const current = block[index];

    if (isBullet(current.text) || isBullet(previous.text)) {
      continue;
    }

    const bigGap =
      typeof current.lineGap === "number" && current.lineGap >= gapThreshold;
    const boldStart =
      !previous.isBold &&
      current.isBold &&
      current.text.length <= 80 &&
      !/[.!?]$/.test(current.text);

    if (bigGap || boldStart) {
      starts.push(index);
    }
  }

  if (starts.length === 0) {
    return [block];
  }

  const blocks: Line[][] = [];
  let start = 0;

  for (const next of starts) {
    if (next <= start) {
      continue;
    }

    blocks.push(block.slice(start, next));
    start = next;
  }

  blocks.push(block.slice(start));

  return blocks.filter((part) => part.length > 0);
}

function splitEntryBlocks(lines: Line[]): Line[][] {
  const blankSeparated = splitOnBlankLines(lines);

  if (blankSeparated.length === 0) {
    return [];
  }

  // Blank lines are a hint, not a boundary: fold paragraph gaps between
  // bullets back into the entry above them before looking for date anchors.
  const blocks: Line[][] = [];

  for (const block of blankSeparated) {
    if (blocks.length > 0 && isContinuationBlock(block)) {
      blocks[blocks.length - 1].push(...block);
    } else {
      blocks.push([...block]);
    }
  }

  // A single-column paste can put several roles in one block with no blank
  // line. `isDateAnchor` then decides where each role actually begins, and
  // PDF metadata can add bold/gap boundaries for undated entries.
  return blocks.flatMap((block) => {
    const anchors: number[] = [];

    block.forEach((line, index) => {
      if (isDateAnchor(line)) {
        anchors.push(index);
      }
    });

    const dateSplit =
      anchors.length > 1 ? splitOnDateAnchors(block, anchors) : [block];

    return dateSplit.flatMap((part) => splitLayoutSubsections(part));
  });
}

type EntryLines = {
  headers: Line[];
  body: string[];
  dates: DateRange | null;
};

function splitEntryLines(
  block: Line[],
  singleDateField: "start" | "end" = "end",
): EntryLines {
  const headers: Line[] = [];
  const body: string[] = [];
  let dates: DateRange | null = null;
  let duration = 0;
  let inBody = false;

  for (const rawLine of block) {
    const line = cleanLine(rawLine.text);

    if (line === "") {
      continue;
    }

    if (isBullet(line)) {
      inBody = true;
      body.push(line);
      continue;
    }

    const months = durationMonths(line);

    if (months > 0) {
      duration = duration || months;
      continue;
    }

    const range = extractEntryDates(line, singleDateField);
    let withoutDate = line;

    if (range) {
      withoutDate = trimSeparators(line.replace(range.matchedText, " "));
    }

    // A date line can follow several header lines (title / company /
    // location), and even follow the first bullet in a PDF export. Prose
    // that merely mentions a year remains body text.
    if (inBody && withoutDate !== "") {
      body.push(line);
      continue;
    }

    if (range) {
      dates = dates ?? range;
    }

    if (withoutDate !== "") {
      headers.push({ ...rawLine, text: withoutDate });
    }

    if (headers.length >= 3) {
      inBody = true;
    }
  }

  if (duration > 0 && dates?.startDate && dates.endDate === "") {
    const computed = addMonths(dates.startDate, duration);

    if (computed !== "") {
      dates = { ...dates, endDate: computed };
    }
  }

  return { headers, body, dates };
}

/**
 * Everything from `getDescriptionsLineIdx` on is description copy. Un-bulleted
 * prose is marked with a bullet glyph so it lands in `body` (and therefore rich
 * text) instead of leaking into `position`/`company`. Plain pasted text keeps
 * its original lines: it has no font metadata to trust.
 */
function markDescriptionLines(
  block: Line[],
  allowUnbulletedProse: boolean,
): Line[] {
  if (!block.some((line) => line.hasLayout)) {
    return block;
  }

  const index = getDescriptionsLineIdx(block, { allowUnbulletedProse });

  if (index <= 0) {
    return block;
  }

  return block.map((line, position) =>
    position >= index && !isBullet(line.text)
      ? { ...line, text: `• ${line.text}` }
      : line,
  );
}

function splitHeaderParts(value: string): string[] {
  // `as` is a compact synonym for `at`: `Acme Corp as Senior Engineer`.
  return value
    .split(
      /\s+(?:at|as|@)\s+|\s*[|•·]\s*|\s*[–—]\s*|\s+-\s+|\s*,\s*/i,
    )
    .map(trimSeparators)
    .filter((part) => part !== "");
}

function parseExperienceHeader(headers: Line[]): {
  position: string;
  company: string;
  location: string;
} {
  const parts: ScorableText[] = [];
  let location = "";
  let explicitTitle = "";
  let explicitCompany = "";

  for (const header of headers) {
    const split = splitTrailingLocation(header.text);

    if (split.location !== "" && location === "") {
      location = split.location;
    }

    if (split.rest === "") {
      continue;
    }

    // `Company as Title` is unambiguous, even when a preceding header line
    // also looks like a title (many PDFs print the role twice).
    const as = /\s+as\s+/i.exec(split.rest);

    if (as) {
      explicitCompany = trimSeparators(split.rest.slice(0, as.index));
      explicitTitle = trimSeparators(split.rest.slice(as.index + as[0].length));
      continue;
    }

    for (const part of splitHeaderParts(split.rest)) {
      if (looksLikeLocation(part)) {
        location = location || part;
        continue;
      }

      parts.push({
        text: part,
        isBold: header.isBold,
        maxFontSize: header.maxFontSize,
      });
    }
  }

  const merged: ScorableText[] = [];

  for (const part of parts) {
    const previous = merged[merged.length - 1];

    if (COMPANY_SUFFIX_ONLY.test(part.text) && previous) {
      merged[merged.length - 1] = {
        ...previous,
        text: `${previous.text}, ${part.text}`,
      };
    } else {
      merged.push(part);
    }
  }

  if (explicitTitle !== "" && explicitCompany !== "") {
    return { position: explicitTitle, company: explicitCompany, location };
  }

  const [first, second] = merged;

  if (!first) {
    return { position: "", company: "", location };
  }

  if (!second) {
    return { position: first.text, company: "", location };
  }

  // Weighted scoring decides which line is the company and which is the role,
  // so a bold company name is not mistaken for a job title.
  const best = scoreBestCandidate(merged, EXPERIENCE_HEADER_FEATURES);

  if (best) {
    const rest = merged.find((value) => value !== best.value);

    return best.field === "company"
      ? { position: rest?.text ?? "", company: best.value.text, location }
      : { position: best.value.text, company: rest?.text ?? "", location };
  }

  const firstTitle = TITLE_WORDS.test(first.text);
  const secondTitle = TITLE_WORDS.test(second.text);

  if (secondTitle && !firstTitle) {
    return { position: second.text, company: first.text, location };
  }

  if (
    !firstTitle &&
    !secondTitle &&
    COMPANY_WORDS.test(first.text) &&
    !COMPANY_WORDS.test(second.text)
  ) {
    return { position: second.text, company: first.text, location };
  }

  return { position: first.text, company: second.text, location };
}

function buildExperience(block: Line[]): ExperienceItem | null {
  const { headers, body, dates } = splitEntryLines(
    markDescriptionLines(block, true),
    "start",
  );
  const { position, company, location } = parseExperienceHeader(headers);

  if (position === "" && company === "" && !dates) {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    company,
    position,
    location,
    startDate: dates?.startDate ?? "",
    endDate: dates?.endDate ?? "",
    current: dates?.current ?? false,
    summary: linesToRichText(body),
  };
}

type EducationHeader = {
  school: string;
  degree: string;
  area: string;
  location: string;
  grade: string;
};

const CGPA_PATTERN =
  /cgpa\s*:?\s*([0-9]+(?:\.[0-9]+)?)(?:\s*\/\s*([0-9.]+))?/i;
const PERCENT_GRADE_PATTERN =
  /(?:^|[\s,|•·–—:-])(\d{1,3}(?:\.\d{1,2})?)\s*%(?=$|[\s,|•·–—:])/;

/**
 * Grade formats vary by region: `GPA: 3.8`, `CGPA: 8.7/10`, and `85%` all mean
 * the same field, so they share one extractor and keep their original units.
 */
function gradeFromText(text: string): { grade: string; rest: string } {
  const cgpa = CGPA_PATTERN.exec(text);

  if (cgpa) {
    const scale = cgpa[2] ? `/${cgpa[2]}` : "";

    return {
      grade: `${cgpa[1]}${scale} CGPA`,
      rest: text.replace(cgpa[0], " "),
    };
  }

  const gpa = GPA_PATTERN.exec(text);

  if (gpa) {
    return {
      grade: `${gpa[1] ?? gpa[2]} GPA`,
      rest: text.replace(GPA_PATTERN, " "),
    };
  }

  const percent = PERCENT_GRADE_PATTERN.exec(text);

  if (percent) {
    return {
      grade: `${percent[1]}%`,
      rest: text.replace(PERCENT_GRADE_PATTERN, " "),
    };
  }

  return { grade: "", rest: text };
}

function parseEducationHeader(headers: Line[]): EducationHeader {
  const result: EducationHeader = {
    school: "",
    degree: "",
    area: "",
    location: "",
    grade: "",
  };
  const extras: string[] = [];

  /**
   * Comma-separated institution names are common ("University of California,
   * Berkeley"), so a school-looking value is kept whole instead of being split
   * into a school plus a fake location. Commas are only split when the value is
   * a plain list such as "Economics, Mathematics".
   */
  const addText = (value: string) => {
    const cleaned = trimSeparators(value);

    if (cleaned === "") {
      return;
    }

    if (looksLikeSchool(cleaned)) {
      result.school = result.school || cleaned;
      return;
    }

    if (looksLikeLocation(cleaned)) {
      result.location = result.location || cleaned;
      return;
    }

    for (const part of cleaned
      .split(/\s*,\s*/)
      .map(trimSeparators)
      .filter((item) => item !== "")) {
      if (looksLikeSchool(part)) {
        result.school = result.school || part;
      } else if (looksLikeLocation(part)) {
        result.location = result.location || part;
      } else {
        extras.push(part);
      }
    }
  };

  for (const header of headers) {
    const segments = header.text
      .split(/\s*[|•·]\s*|\s*[–—]\s*|\s+-\s+/)
      .map(trimSeparators)
      .filter((segment) => segment !== "");

    for (const rawSegment of segments.length > 0 ? segments : [header.text]) {
      const grade = gradeFromText(rawSegment);

      if (grade.grade !== "" && result.grade === "") {
        result.grade = grade.grade;
      }

      const segment = trimSeparators(grade.rest);

      if (segment === "") {
        continue;
      }

      const degreeMatch = DEGREE_PATTERN.exec(segment);

      if (!degreeMatch) {
        addText(segment);
        continue;
      }

      result.degree = result.degree || trimSeparators(degreeMatch[1]);

      const inlineArea = trimSeparators(degreeMatch[2] ?? "");

      if (inlineArea !== "" && result.area === "") {
        result.area = inlineArea;
      }

      const before = trimSeparators(segment.slice(0, degreeMatch.index));
      const after = trimSeparators(
        segment.slice(degreeMatch.index + degreeMatch[0].length),
      );

      if (before !== "") {
        addText(before);
      }

      if (after !== "") {
        const cleanedAfter = trimSeparators(
          after.replace(/^(?:in|,)\s*/i, ""),
        );

        if (looksLikeSchool(cleanedAfter)) {
          result.school = result.school || cleanedAfter;
        } else if (result.area === "") {
          result.area = cleanedAfter;
        } else {
          addText(cleanedAfter);
        }
      }
    }
  }

  if (result.school === "" && extras.length > 0) {
    const scored = scoreBestCandidate(
      extras.map((text) => ({ text, isBold: false, maxFontSize: 0 })),
      EDUCATION_HEADER_FEATURES,
    );

    if (scored?.field === "school") {
      result.school = scored.value.text;
      extras.splice(scored.index, 1);
    } else {
      result.school = extras.shift() ?? "";
    }
  }

  if (result.area === "" && extras.length > 0) {
    result.area = extras.shift() ?? "";
  }

  return result;
}

function looksLikeSchool(value: string): boolean {
  return SCHOOL_WORDS.test(value);
}

/**
 * Classify one block inside a combined `Certifications & Education` heading.
 * A degree at the *start* of the line, a school word, or a grade is education;
 * a certification that merely ends in `– Associate` stays a certification.
 */
function isEducationEntryLine(value: string): boolean {
  const line = cleanLine(value);

  if (line === "") {
    return false;
  }

  const degree = DEGREE_PATTERN.exec(line);

  return (
    looksLikeSchool(line) ||
    (degree !== null && degree.index === 0) ||
    /\b(?:cgpa|gpa)\b/i.test(line) ||
    gradeFromText(line).grade !== ""
  );
}

function buildEducation(block: Line[]): EducationItem | null {
  // A lone year on an education entry is the graduation date.
  const { headers, body, dates } = splitEntryLines(
    markDescriptionLines(block, false),
    "end",
  );
  const { school, degree, area, location, grade } =
    parseEducationHeader(headers);

  if (school === "" && degree === "" && !dates) {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    school,
    degree,
    area,
    location,
    startDate: dates?.startDate ?? "",
    endDate: dates?.endDate ?? "",
    grade,
    summary: linesToRichText(body),
    current: dates?.current ?? false,
  };
}

function splitKeywords(value: string): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const raw of value.split(INLINE_BULLET_SEPARATOR)) {
    const keyword = trimSeparators(raw).replace(/\.+$/, "");

    if (keyword === "") {
      continue;
    }

    const key = keyword.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    keywords.push(keyword);
  }

  return keywords;
}

function skillLineText(line: Line): string {
  if (line.phrases && line.phrases.length > 1) {
    return joinPhraseSegments(line.phrases);
  }

  return line.text;
}

function parseSkills(lines: readonly Line[], category = ""): SkillItem[] {
  const items: SkillItem[] = [];
  let uncategorized: SkillItem | null = null;

  for (const rawLine of lines) {
    const line = stripBullet(
      cleanLine(skillLineText(rawLine)).replace(
        /^(?:proficient (?:in|with)|experienced (?:in|with)|knowledge of|familiar with|skills?)\s*:?\s*/i,
        "",
      ),
    );

    if (line === "") {
      continue;
    }

    const labeled = /^([^:]{1,40}):\s*(.+)$/.exec(line);

    if (labeled) {
      const keywords = splitKeywords(labeled[2]);

      if (keywords.length > 0) {
        items.push({
          id: newId(),
          hidden: false,
          name: trimSeparators(labeled[1]),
          level: 0,
          keywords,
        });
      }

      continue;
    }

    const keywords = splitKeywords(line);

    if (keywords.length === 0) {
      continue;
    }

    if (!uncategorized) {
      uncategorized = {
        id: newId(),
        hidden: false,
        name: category,
        level: 0,
        keywords: [],
      };
      items.push(uncategorized);
    }

    const existing = new Set(
      uncategorized.keywords.map((keyword) => keyword.toLowerCase()),
    );

    for (const keyword of keywords) {
      if (!existing.has(keyword.toLowerCase())) {
        existing.add(keyword.toLowerCase());
        uncategorized.keywords.push(keyword);
      }
    }
  }

  return items;
}

function extractEntryUrl(value: string): { rest: string; url: string } {
  const first = value.match(ENTRY_URL_PATTERN)?.[0];

  if (!first) {
    return { rest: value, url: "" };
  }

  return {
    rest: trimSeparators(
      value.replace(new RegExp(ENTRY_URL_PATTERN.source, "gi"), " "),
    ),
    url: normalizeUrl(first),
  };
}

function extractEmail(value: string): { rest: string; email: string } {
  const email = EMAIL_PATTERN.exec(value)?.[0] ?? "";

  return {
    rest: email === "" ? value : value.replace(email, " "),
    email,
  };
}

function extractPhone(value: string): { rest: string; phone: string } {
  const phone = PHONE_PATTERN.exec(value)?.[0] ?? "";

  if (phone === "" || !isPhoneLike(phone)) {
    return { rest: value, phone: "" };
  }

  return { rest: value.replace(phone, " "), phone };
}

function extractSingleDate(value: string): { rest: string; date: string } {
  const match = SINGLE_DATE_PATTERN.exec(value);

  if (!match) {
    return { rest: value, date: "" };
  }

  const rest = `${value.slice(0, match.index)} ${value.slice(
    match.index + match[0].length,
  )}`;

  return {
    rest: trimSeparators(rest.replace(/\(\s*\)/g, " ")),
    date: parseMonthInput(match[1]) ?? "",
  };
}

function splitEntrySegments(value: string): string[] {
  return value
    .split(/\s*[|•·]\s*|\s*[–—]\s*|\s+-\s+/)
    .map(trimSeparators)
    .filter((part) => part !== "");
}

function splitTitleAndSource(value: string): {
  title: string;
  source: string;
} {
  const segments = splitEntrySegments(value);
  const title = segments.shift() ?? "";

  if (segments.length > 0) {
    return { title, source: segments.join(", ") };
  }

  const byline = /^(.+?)\s+(?:by|at)\s+(.+)$/i.exec(title);

  if (byline) {
    return {
      title: trimSeparators(byline[1]),
      source: trimSeparators(byline[2]),
    };
  }

  const comma = /^([^,]+),\s*(.+)$/.exec(title);

  if (comma) {
    return {
      title: trimSeparators(comma[1]),
      source: trimSeparators(comma[2]),
    };
  }

  return { title, source: "" };
}

/**
 * A compact entry line carries its own date, URL, or a title/source separator.
 * A bare title (or a summary bullet) is a continuation of the entry above it.
 */
function isEntryDetailLine(line: string): boolean {
  const withoutUrl = extractEntryUrl(line);

  if (withoutUrl.url !== "") {
    return true;
  }

  return (
    extractSingleDate(withoutUrl.rest).date !== "" ||
    splitEntrySegments(withoutUrl.rest).length > 1 ||
    /^(.+?)\s+(?:by|at)\s+(.+)$/i.test(withoutUrl.rest)
  );
}

function splitTextOnBlankLines(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }

      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    blocks.push(current);
  }

  return blocks;
}

/**
 * Compact sections (certifications, awards, publications) are usually one
 * entry per line or one entry per bullet, with blank lines separating longer
 * entries. Split on blank lines first; otherwise start a new entry at each
 * line that carries its own date/issuer and attach bullets or bare title lines
 * to the entry above.
 */
function splitCompactEntryBlocks(lines: Line[]): string[][] {
  const texts = lines.map((line) => line.text);
  const blankSeparated = splitTextOnBlankLines(texts);

  if (blankSeparated.length > 1) {
    return blankSeparated;
  }

  const meaningful = texts.filter((line) => line.trim() !== "");

  if (meaningful.length === 0) {
    return [];
  }

  if (meaningful.every(isBullet)) {
    return meaningful.map((line) => [line]);
  }

  if (meaningful.length === 1) {
    return [[meaningful[0]]];
  }

  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of meaningful) {
    const withoutUrl = extractEntryUrl(line);
    const startsEntry =
      !isBullet(line) &&
      withoutUrl.rest !== "" &&
      isEntryDetailLine(line);

    if (startsEntry && current.some(isEntryDetailLine)) {
      blocks.push(current);
      current = [line];
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    blocks.push(current);
  }

  return blocks;
}

function buildProject(block: Line[]): ProjectItem | null {
  const { headers, body, dates } = splitEntryLines(
    markDescriptionLines(block, true),
    "start",
  );
  let url = "";
  const segments: ScorableText[] = [];

  for (const header of headers) {
    const extracted = extractEntryUrl(header.text);
    url = url || extracted.url;

    for (const part of splitEntrySegments(extracted.rest)) {
      segments.push({
        text: part,
        isBold: header.isBold,
        maxFontSize: header.maxFontSize,
      });
    }
  }

  // A bold project name beats a regular tech-stack line; without metadata the
  // first segment still wins, exactly as before.
  const bestName = scoreBestCandidate(segments, PROJECT_HEADER_FEATURES);
  const nameEntry =
    bestName?.field === "name" ? bestName.value : segments[0];
  const name = nameEntry?.text ?? "";
  const keywords = splitKeywords(
    segments
      .filter((segment) => segment !== nameEntry)
      .map((segment) => segment.text)
      .join(", "),
  );

  if (name === "" && !dates && body.length === 0) {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    name,
    description: linesToRichText(body),
    url,
    startDate: dates?.startDate ?? "",
    endDate: dates?.endDate ?? "",
    current: false,
    keywords,
  };
}

function buildCertification(block: string[]): CertificationItem | null {
  let name = "";
  let issuer = "";
  let date = "";
  let url = "";

  for (const rawLine of block) {
    let rest = stripBullet(cleanLine(rawLine));

    if (rest === "") {
      continue;
    }

    const extractedUrl = extractEntryUrl(rest);
    rest = extractedUrl.rest;
    url = url || extractedUrl.url;

    const extractedDate = extractSingleDate(rest);
    rest = extractedDate.rest;
    date = date || extractedDate.date;

    if (rest === "") {
      continue;
    }

    if (name === "") {
      const split = splitTitleAndSource(rest);
      name = split.title;
      issuer = split.source;
    } else if (issuer === "") {
      issuer = rest;
    }
  }

  if (name === "") {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    name,
    issuer,
    date,
    url,
  };
}

function buildAward(block: string[]): AwardItem | null {
  let title = "";
  let awarder = "";
  let date = "";
  const summaryLines: string[] = [];

  for (const rawLine of block) {
    const line = cleanLine(rawLine);

    if (line === "") {
      continue;
    }

    let rest = stripBullet(line);
    const extractedDate = extractSingleDate(rest);
    rest = extractedDate.rest;
    date = date || extractedDate.date;

    if (rest === "") {
      continue;
    }

    if (title === "") {
      const split = splitTitleAndSource(rest);
      title = split.title;
      awarder = split.source;
    } else if (awarder === "") {
      awarder = rest;
    } else {
      summaryLines.push(line);
    }
  }

  if (title === "") {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    title,
    awarder,
    date,
    summary: linesToRichText(summaryLines),
  };
}

function buildLanguages(lines: string[]): LanguageItem[] {
  const items: LanguageItem[] = [];

  const addLanguage = (name: string, fluency = "") => {
    const cleaned = trimSeparators(name);

    if (cleaned === "" || items.some((item) => item.name === cleaned)) {
      return;
    }

    items.push({
      id: newId(),
      hidden: false,
      name: cleaned,
      level: 0,
      fluency: trimSeparators(fluency),
    });
  };

  for (const rawLine of lines) {
    const line = stripBullet(cleanLine(rawLine));

    if (line === "") {
      continue;
    }

    const labeled = /^([^:]{1,40}):\s*(.+)$/.exec(line);

    if (labeled && !/^languages?$/i.test(labeled[1])) {
      addLanguage(labeled[1], labeled[2]);
      continue;
    }

    const value = labeled ? labeled[2] : line;

    for (const rawPart of value.split(/[,;|•·]/)) {
      const part = trimSeparators(rawPart);

      if (part === "") {
        continue;
      }

      const parenthetical = /^(.+?)\s*\(([^)]+)\)$/.exec(part);

      if (parenthetical) {
        addLanguage(parenthetical[1], parenthetical[2]);
        continue;
      }

      const dash = /^(.+?)\s+[–—-]\s+(.+)$/.exec(part);

      if (dash) {
        addLanguage(dash[1], dash[2]);
        continue;
      }

      addLanguage(part);
    }
  }

  return items;
}

function buildInterests(lines: string[]): InterestItem[] {
  const items: InterestItem[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const line = stripBullet(
      cleanLine(rawLine).replace(/^(?:interests?|hobbies)\s*:\s*/i, ""),
    );

    if (line === "") {
      continue;
    }

    for (const keyword of splitKeywords(line)) {
      const key = keyword.toLowerCase();

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      items.push({
        id: newId(),
        hidden: false,
        name: keyword,
        keywords: [],
      });
    }
  }

  return items;
}

function buildVolunteer(block: Line[]): VolunteerItem | null {
  const { headers, body, dates } = splitEntryLines(
    markDescriptionLines(block, true),
    "start",
  );
  const { position, company, location } = parseExperienceHeader(headers);

  if (position === "" && company === "" && !dates) {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    organization: company,
    position,
    location,
    startDate: dates?.startDate ?? "",
    endDate: dates?.endDate ?? "",
    summary: linesToRichText(body),
    current: dates?.current ?? false,
  };
}

function buildPublication(block: string[]): PublicationItem | null {
  let title = "";
  let publisher = "";
  let date = "";
  let url = "";
  const summaryLines: string[] = [];

  for (const rawLine of block) {
    const line = cleanLine(rawLine);

    if (line === "") {
      continue;
    }

    let rest = stripBullet(line);
    const extractedUrl = extractEntryUrl(rest);
    rest = extractedUrl.rest;
    url = url || extractedUrl.url;

    const extractedDate = extractSingleDate(rest);
    rest = extractedDate.rest;
    date = date || extractedDate.date;

    if (rest === "") {
      continue;
    }

    if (title === "") {
      const split = splitTitleAndSource(rest);
      title = split.title;
      publisher = split.source;
    } else if (publisher === "") {
      publisher = rest;
    } else {
      summaryLines.push(line);
    }
  }

  if (title === "") {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    title,
    publisher,
    date,
    url,
    summary: linesToRichText(summaryLines),
  };
}

function buildReference(block: string[]): ReferenceItem | null {
  let email = "";
  let phone = "";
  const cleanedLines: string[] = [];

  for (const rawLine of block) {
    let rest = cleanLine(rawLine);
    const extractedEmail = extractEmail(rest);
    rest = extractedEmail.rest;
    email = email || extractedEmail.email;

    const extractedPhone = extractPhone(rest);
    rest = extractedPhone.rest;
    phone = phone || extractedPhone.phone;

    rest = extractEntryUrl(rest).rest;

    if (rest !== "") {
      cleanedLines.push(rest);
    }
  }

  const { headers, body } = splitEntryLines(cleanedLines.map(plainLine));
  let name = "";
  let position = "";
  let company = "";
  const [nameLine, ...otherHeaders] = headers;

  if (nameLine) {
    const parts = splitEntrySegments(nameLine.text);
    name = parts.shift() ?? "";
    position = parts.join(", ");
  }

  for (const headerLine of otherHeaders) {
    const header = headerLine.text;
    const at = /^(.+?)\s+(?:at|@)\s+(.+)$/i.exec(header);

    if (at) {
      position = position || trimSeparators(at[1]);
      company = company || trimSeparators(at[2]);
      continue;
    }

    const comma = /^([^,]+),\s*(.+)$/.exec(header);

    if (comma && (position === "" || company === "")) {
      position = position || trimSeparators(comma[1]);
      company = company || trimSeparators(comma[2]);
      continue;
    }

    position = position || header;
  }

  if (name === "" && email === "" && phone === "") {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    name,
    position,
    company,
    phone,
    email,
    summary: linesToRichText(body),
  };
}

function hasContent(
  basics: HeaderResult["basics"],
  summary: string,
  itemGroups: readonly unknown[][],
): boolean {
  return (
    basics.name !== "" ||
    basics.email !== "" ||
    basics.phone !== "" ||
    summary !== "" ||
    itemGroups.some((items) => items.length > 0)
  );
}

export function parsePastedResume(
  input: string | readonly PdfLine[],
): ResumeDocument | null {
  const lines = normalizeLines(input);

  if (lines.length === 0) {
    return null;
  }

  const { header, sections } = splitSections(lines);
  const headerResult = parseHeader(header);
  const basics = { ...headerResult.basics };
  const profiles = [...headerResult.profiles];
  const seenProfiles = new Set(profiles.map((profile) => profile.url));
  const sectionText = (key: SectionKey): string[] =>
    (sections[key] ?? []).map((line) => line.text);

  // Contact details that landed outside the header (a sidebar after two-column
  // reconstruction, or a block with an unrecognised heading) are still useful.
  if (basics.email === "" || basics.phone === "" || profiles.length === 0) {
    const fallback = scanContactFallback(
      lines.map((line) => line.text),
      seenProfiles,
    );
    basics.email = basics.email || fallback.email;
    basics.phone = basics.phone || fallback.phone;

    for (const profile of fallback.profiles) {
      if (seenProfiles.has(profile.url)) {
        continue;
      }

      seenProfiles.add(profile.url);
      profiles.push(profile);
    }
  }

  for (const profile of parseProfileLinks(sectionText("profiles"))) {
    if (seenProfiles.has(profile.url)) {
      continue;
    }

    seenProfiles.add(profile.url);
    profiles.push(profile);
  }

  // An explicit Summary heading wins; otherwise use the unlabelled opening
  // paragraph from the header instead of throwing it away.
  const summary =
    linesToRichText(sectionText("summary")) ||
    linesToRichText(
      headerResult.openingSummary === "" ? [] : [headerResult.openingSummary],
    );
  const experience = splitEntryBlocks(sections.experience ?? [])
    .map(buildExperience)
    .filter((item): item is ExperienceItem => item !== null);
  const combinedEducationBlocks: string[][] = [];
  const combinedCertificationBlocks: string[][] = [];

  for (const block of splitCompactEntryBlocks(
    sections.certificationsEducation ?? [],
  )) {
    if (block.some(isEducationEntryLine)) {
      combinedEducationBlocks.push(block);
    } else {
      combinedCertificationBlocks.push(block);
    }
  }

  const education = [
    ...splitEntryBlocks(sections.education ?? [])
      .map(buildEducation)
      .filter((item): item is EducationItem => item !== null),
    ...combinedEducationBlocks
      .map((block) => buildEducation(block.map(plainLine)))
      .filter((item): item is EducationItem => item !== null),
  ];
  const projects = splitEntryBlocks(sections.projects ?? [])
    .map(buildProject)
    .filter((item): item is ProjectItem => item !== null);
  const certifications = [
    ...splitCompactEntryBlocks(sections.certifications ?? [])
      .map(buildCertification)
      .filter((item): item is CertificationItem => item !== null),
    ...combinedCertificationBlocks
      .map(buildCertification)
      .filter((item): item is CertificationItem => item !== null),
  ];
  const awards = splitCompactEntryBlocks(sections.awards ?? [])
    .map(buildAward)
    .filter((item): item is AwardItem => item !== null);
  const languages = buildLanguages(sectionText("languages"));
  const interests = buildInterests(sectionText("interests"));
  const volunteer = splitEntryBlocks(sections.volunteer ?? [])
    .map(buildVolunteer)
    .filter((item): item is VolunteerItem => item !== null);
  const publications = splitCompactEntryBlocks(sections.publications ?? [])
    .map(buildPublication)
    .filter((item): item is PublicationItem => item !== null);
  const references = splitOnBlankLines(sections.references ?? [])
    .map((block) => block.map((line) => line.text))
    .map(buildReference)
    .filter((item): item is ReferenceItem => item !== null);
  const skills = [
    ...parseSkills(sections.skills ?? []),
    ...parseSkills(sections.hardSkills ?? [], "Hard skills"),
    ...parseSkills(sections.softSkills ?? [], "Soft skills"),
  ];

  if (
    !hasContent(basics, summary, [
      profiles,
      experience,
      education,
      projects,
      certifications,
      awards,
      languages,
      interests,
      volunteer,
      publications,
      references,
      skills,
    ])
  ) {
    return null;
  }

  const doc = createEmptyResume("onyx");

  return {
    ...doc,
    basics: {
      ...doc.basics,
      ...basics,
      website: headerResult.website,
    },
    summary: {
      ...doc.summary,
      content: summary,
    },
    sections: {
      ...doc.sections,
      profiles: {
        ...doc.sections.profiles,
        items: profiles,
      },
      experience: {
        ...doc.sections.experience,
        items: experience,
      },
      education: {
        ...doc.sections.education,
        items: education,
      },
      projects: {
        ...doc.sections.projects,
        items: projects,
      },
      certifications: {
        ...doc.sections.certifications,
        items: certifications,
      },
      awards: {
        ...doc.sections.awards,
        items: awards,
      },
      languages: {
        ...doc.sections.languages,
        items: languages,
      },
      interests: {
        ...doc.sections.interests,
        items: interests,
      },
      volunteer: {
        ...doc.sections.volunteer,
        items: volunteer,
      },
      publications: {
        ...doc.sections.publications,
        items: publications,
      },
      references: {
        ...doc.sections.references,
        items: references,
      },
      skills: {
        ...doc.sections.skills,
        items: skills,
      },
    },
  };
}
