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
  detectProfileLink,
  websiteLabelFromUrl,
} from "@/lib/links/contactLinks";
import { createEmptyResume, newId } from "@/lib/schema/defaults";
import type {
  EducationItem,
  ExperienceItem,
  ProfileItem,
  ResumeDocument,
  SkillItem,
} from "@/lib/schema/resume.schema";

type SectionKey =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "profiles"
  | "projects"
  | "certifications"
  | "awards"
  | "languages"
  | "interests"
  | "volunteer"
  | "publications"
  | "references";

const SECTION_ALIASES: Record<string, SectionKey> = {
  summary: "summary",
  "professional summary": "summary",
  "career summary": "summary",
  "executive summary": "summary",
  profile: "summary",
  "professional profile": "summary",
  about: "summary",
  "about me": "summary",
  objective: "summary",
  "career objective": "summary",
  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  "relevant experience": "experience",
  "employment history": "experience",
  "work history": "experience",
  employment: "experience",
  education: "education",
  "education & training": "education",
  "education and training": "education",
  "academic background": "education",
  academics: "education",
  skills: "skills",
  "technical skills": "skills",
  "core skills": "skills",
  "core competencies": "skills",
  competencies: "skills",
  "areas of expertise": "skills",
  "skills & tools": "skills",
  "skills and tools": "skills",
  "technical proficiencies": "skills",
  technologies: "skills",
  profiles: "profiles",
  links: "profiles",
  "social links": "profiles",
  "online profiles": "profiles",
  projects: "projects",
  "personal projects": "projects",
  "selected projects": "projects",
  "side projects": "projects",
  "academic projects": "projects",
  certifications: "certifications",
  certificates: "certifications",
  "licenses & certifications": "certifications",
  "licenses and certifications": "certifications",
  licenses: "certifications",
  awards: "awards",
  honors: "awards",
  honours: "awards",
  achievements: "awards",
  "awards & honors": "awards",
  "awards and honors": "awards",
  languages: "languages",
  interests: "interests",
  hobbies: "interests",
  volunteer: "volunteer",
  "volunteer experience": "volunteer",
  volunteering: "volunteer",
  "community involvement": "volunteer",
  publications: "publications",
  papers: "publications",
  research: "publications",
  references: "references",
};

const BULLET_PREFIX = /^[-*•▪◦●○■□‣⁃]\s+/;
const EDGE_SEPARATORS = /^[\s|•·,;:–—-]+|[\s|•·,;:–—-]+$/g;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_PATTERN =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{3,4})[\s.-]?\d{3,4}(?:[\s.-]?\d{3,4})?/;
const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s|•·,;]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s|•·,;]*)?/gi;
const LOCATION_PATTERN =
  /^([A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*),\s*([A-Z]{2}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s+\d{5}(?:-\d{4})?)?$/;
const TRAILING_LOCATION_PATTERN =
  /(?:^|[\s|,;•·–—-])((?:[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*),\s*(?:[A-Z]{2}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s+\d{5}(?:-\d{4})?)?)\s*$/;
const NON_LOCATION_WORDS =
  /\b(inc|llc|ltd|corp|corporation|company|gmbh|plc|group|labs|studio|studios|systems|technologies|solutions|partners|bank|university|college|institute|school|academy|agency|consulting|media)\b/i;
const TITLE_WORDS =
  /\b(engineer|engineering|developer|manager|management|designer|analyst|director|intern|internship|consultant|specialist|lead|coordinator|associate|assistant|officer|architect|scientist|researcher|head|vp|vice president|president|founder|owner|accountant|recruiter|administrator|teacher|professor|strategist|planner|producer|editor|writer|technician|supervisor|executive|auditor|controller|paralegal|attorney|counsel|nurse|physician|therapist|pharmacist|chef)\b/i;
const COMPANY_WORDS =
  /\b(inc|llc|ltd|corp|corporation|company|co|gmbh|plc|group|labs|studio|studios|systems|technologies|solutions|partners|bank|university|college|institute|school|academy|agency|media|consulting)\b/i;
const SCHOOL_WORDS =
  /\b(university|college|institute|school|academy|polytechnic|conservatory|faculty)\b/i;
const COMPANY_SUFFIX_ONLY = /^(inc|llc|ltd|corp|corporation|gmbh|plc|co)\.?$/i;
const DEGREE_PATTERN =
  /((?:Bachelor|Master|Associate|Doctor)(?:'s)?(?:\s+of\s+(?!in\b)[A-Za-z]+(?:\s+(?!in\b)[A-Za-z]+){0,2})?|B\.?\s?S\.?|M\.?\s?S\.?|B\.?\s?A\.?|M\.?\s?A\.?|MBA|Ph\.?\s?D\.?|B\.?\s?F\.?\s?A\.?|M\.?\s?F\.?\s?A\.?|B\.?\s?Eng\.?|M\.?\s?Eng\.?)(?:\s+in\s+([^,|•·]+))?/i;
const GPA_PATTERN =
  /(?:gpa[:\s]*([0-9]+(?:\.[0-9]+)?)(?:\s*\/\s*[0-9.]+)?|([0-9]+(?:\.[0-9]+)?)\s*gpa)/i;
const DATE_TOKEN =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4}-\\d{1,2}|\\d{4}";
const DATE_RANGE_PATTERN = new RegExp(
  `(${DATE_TOKEN})\\s*(?:-|–|—|to)\\s*(${DATE_TOKEN}|present|current|now|ongoing)`,
  "i",
);

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

function normalizeLines(input: string): string[] {
  const raw = input
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => collapseSpaces(line.replace(/\t/g, " ")));

  const lines: string[] = [];

  for (const line of raw) {
    if (line === "" && (lines.length === 0 || lines[lines.length - 1] === "")) {
      continue;
    }

    lines.push(line);
  }

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines;
}

function headingKey(value: string): SectionKey | null {
  const cleaned = value
    .replace(/^#+\s*/, "")
    .replace(BULLET_PREFIX, "")
    .replace(/[*_]+/g, "")
    .replace(/[\s.:|\-–—]+$/, "")
    .trim()
    .toLowerCase();

  if (cleaned === "" || cleaned.length > 48) {
    return null;
  }

  return SECTION_ALIASES[cleaned] ?? null;
}

function splitSections(lines: string[]): {
  header: string[];
  sections: Partial<Record<SectionKey, string[]>>;
} {
  const header: string[] = [];
  const sections: Partial<Record<SectionKey, string[]>> = {};
  let current: SectionKey = "header";

  for (const line of lines) {
    const key = headingKey(line);

    if (key) {
      current = key;
      sections[key] = sections[key] ?? [];
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

  const match = LOCATION_PATTERN.exec(trimmed);

  return (
    match !== null &&
    !NON_LOCATION_WORDS.test(match[1]) &&
    !TITLE_WORDS.test(match[1])
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
};

function parseHeader(lines: string[]): HeaderResult {
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
  const candidates: string[] = [];

  const splitSegments = (line: string): string[] =>
    line
      .split(/\s*[|•·]\s*/)
      .map((segment) => segment.trim())
      .filter((segment) => segment !== "");

  for (const line of lines) {
    for (const segment of splitSegments(line)) {
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

      candidates.push(rest);
    }
  }

  for (const candidate of candidates) {
    if (basics.name === "" && looksLikeName(candidate)) {
      basics.name = candidate;
      continue;
    }

    if (basics.headline === "" && looksLikeHeadline(candidate)) {
      basics.headline = candidate;
    }
  }

  return { basics, profiles, website };
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

  if (/^\d{4}$/.test(trimmed)) {
    return `${trimmed}-${yearMonth}`;
  }

  return parseMonthInput(trimmed) ?? "";
}

function extractDateRange(value: string): DateRange | null {
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

function isDateAnchor(line: string): boolean {
  const trimmed = line.trim();

  if (trimmed === "" || isBullet(trimmed) || trimmed.length > 90) {
    return false;
  }

  return extractDateRange(trimmed) !== null;
}

function splitOnBlankLines(lines: string[]): string[][] {
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

function splitEntryBlocks(lines: string[]): string[][] {
  const blankSeparated = splitOnBlankLines(lines);

  if (blankSeparated.length > 1) {
    return blankSeparated;
  }

  const anchors: number[] = [];

  lines.forEach((line, index) => {
    if (isDateAnchor(line)) {
      anchors.push(index);
    }
  });

  if (anchors.length <= 1) {
    return blankSeparated;
  }

  const starts: number[] = [];
  let floor = 0;

  for (const anchor of anchors) {
    let start = anchor;
    let back = anchor - 1;
    let taken = 0;

    while (back >= floor && taken < 2) {
      const candidate = lines[back].trim();

      if (
        candidate === "" ||
        isBullet(lines[back]) ||
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

  const blocks: string[][] = [];
  const preamble = lines.slice(0, starts[0]).filter((line) => line.trim());

  for (let index = 0; index < starts.length; index += 1) {
    const end = index + 1 < starts.length ? starts[index + 1] : lines.length;
    const block = lines
      .slice(starts[index], end)
      .filter((line) => line.trim() !== "");

    if (index === 0 && preamble.length > 0) {
      block.unshift(...preamble);
    }

    if (block.length > 0) {
      blocks.push(block);
    }
  }

  return blocks;
}

type EntryLines = {
  headers: string[];
  body: string[];
  dates: DateRange | null;
};

function splitEntryLines(block: string[]): EntryLines {
  const headers: string[] = [];
  const body: string[] = [];
  let dates: DateRange | null = null;
  let inBody = false;

  for (const rawLine of block) {
    const line = cleanLine(rawLine);

    if (line === "") {
      continue;
    }

    if (isBullet(line)) {
      inBody = true;
      body.push(line);
      continue;
    }

    if (inBody) {
      body.push(line);
      continue;
    }

    const range = extractDateRange(line);
    let withoutDate = line;

    if (range) {
      dates = dates ?? range;
      withoutDate = trimSeparators(line.replace(range.matchedText, " "));
    }

    if (withoutDate !== "") {
      headers.push(withoutDate);
    }

    if (headers.length >= 3) {
      inBody = true;
    }
  }

  return { headers, body, dates };
}

function splitHeaderParts(value: string): string[] {
  return value
    .split(/\s+(?:at|@)\s+|\s*[|•·]\s*|\s+[–—]\s+|\s+-\s+|\s*,\s*/i)
    .map(trimSeparators)
    .filter((part) => part !== "");
}

function parseExperienceHeader(headers: string[]): {
  position: string;
  company: string;
  location: string;
} {
  const parts: string[] = [];
  let location = "";

  for (const header of headers) {
    const split = splitTrailingLocation(header);

    if (split.location !== "" && location === "") {
      location = split.location;
    }

    if (split.rest === "") {
      continue;
    }

    for (const part of splitHeaderParts(split.rest)) {
      if (looksLikeLocation(part)) {
        location = location || part;
        continue;
      }

      parts.push(part);
    }
  }

  const merged: string[] = [];

  for (const part of parts) {
    if (COMPANY_SUFFIX_ONLY.test(part) && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}, ${part}`;
    } else {
      merged.push(part);
    }
  }

  const [first, second] = merged;

  if (!first) {
    return { position: "", company: "", location };
  }

  if (!second) {
    return { position: first, company: "", location };
  }

  const firstTitle = TITLE_WORDS.test(first);
  const secondTitle = TITLE_WORDS.test(second);

  if (secondTitle && !firstTitle) {
    return { position: second, company: first, location };
  }

  if (
    !firstTitle &&
    !secondTitle &&
    COMPANY_WORDS.test(first) &&
    !COMPANY_WORDS.test(second)
  ) {
    return { position: second, company: first, location };
  }

  return { position: first, company: second, location };
}

function buildExperience(block: string[]): ExperienceItem | null {
  const { headers, body, dates } = splitEntryLines(block);
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

function parseEducationHeader(headers: string[]): {
  school: string;
  degree: string;
  area: string;
  location: string;
  grade: string;
} {
  let school = "";
  let degree = "";
  let area = "";
  let location = "";
  let grade = "";
  const extras: string[] = [];

  for (const header of headers) {
    const split = splitTrailingLocation(header);

    if (split.location !== "" && location === "") {
      location = split.location;
    }

    if (split.rest === "") {
      continue;
    }

    const gpa = GPA_PATTERN.exec(split.rest);

    if (gpa) {
      grade = grade || `${gpa[1] ?? gpa[2]} GPA`;
    }

    const parts = split.rest
      .replace(GPA_PATTERN, " ")
      .split(/\s*[|•·,]\s*|\s+[–—]\s+|\s+-\s+/)
      .map(trimSeparators)
      .filter((part) => part !== "");

    for (const part of parts) {
      const degreeMatch = DEGREE_PATTERN.exec(part);

      if (degreeMatch) {
        degree = degree || trimSeparators(degreeMatch[1]);
        area = area || trimSeparators(degreeMatch[2] ?? "");

        const before = trimSeparators(
          part.slice(0, degreeMatch.index),
        );

        if (before !== "") {
          if (looksLikeSchool(before)) {
            school = school || before;
          } else {
            extras.push(before);
          }
        }

        const after = trimSeparators(
          part.slice(degreeMatch.index + degreeMatch[0].length),
        );

        if (after !== "" && area === "") {
          area = trimSeparators(after.replace(/^(?:in|,)\s*/i, ""));
        }

        continue;
      }

      if (looksLikeSchool(part)) {
        school = school || part;
        continue;
      }

      extras.push(part);
    }
  }

  if (school === "" && extras.length > 0) {
    school = extras.shift() ?? "";
  }

  if (area === "" && extras.length > 0) {
    area = extras.shift() ?? "";
  }

  return { school, degree, area, location, grade };
}

function looksLikeSchool(value: string): boolean {
  return SCHOOL_WORDS.test(value);
}

function buildEducation(block: string[]): EducationItem | null {
  const { headers, body, dates } = splitEntryLines(block);
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

  for (const raw of value.split(/[,;|•·]|\s{2,}/)) {
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

function parseSkills(lines: string[]): SkillItem[] {
  const items: SkillItem[] = [];
  let uncategorized: SkillItem | null = null;

  for (const rawLine of lines) {
    const line = stripBullet(
      cleanLine(rawLine).replace(
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
        name: "",
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

function hasContent(
  header: HeaderResult,
  summary: string,
  experience: ExperienceItem[],
  education: EducationItem[],
  skills: SkillItem[],
): boolean {
  return (
    header.basics.name !== "" ||
    header.basics.email !== "" ||
    header.basics.phone !== "" ||
    summary !== "" ||
    experience.length > 0 ||
    education.length > 0 ||
    skills.length > 0
  );
}

export function parsePastedResume(input: string): ResumeDocument | null {
  const lines = normalizeLines(input);

  if (lines.length === 0) {
    return null;
  }

  const { header, sections } = splitSections(lines);
  const headerResult = parseHeader(header);
  const summary = linesToRichText(sections.summary ?? []);
  const experience = splitEntryBlocks(sections.experience ?? [])
    .map(buildExperience)
    .filter((item): item is ExperienceItem => item !== null);
  const education = splitEntryBlocks(sections.education ?? [])
    .map(buildEducation)
    .filter((item): item is EducationItem => item !== null);
  const skills = parseSkills(sections.skills ?? []);

  if (!hasContent(headerResult, summary, experience, education, skills)) {
    return null;
  }

  const doc = createEmptyResume("onyx");

  return {
    ...doc,
    basics: {
      ...doc.basics,
      ...headerResult.basics,
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
        items: headerResult.profiles,
      },
      experience: {
        ...doc.sections.experience,
        items: experience,
      },
      education: {
        ...doc.sections.education,
        items: education,
      },
      skills: {
        ...doc.sections.skills,
        items: skills,
      },
    },
  };
}
