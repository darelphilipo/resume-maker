/**
 * Adapter for the open JSON Resume schema (https://jsonresume.org/schema/).
 *
 * JSON Resume is the closest thing the resume ecosystem has to a portable
 * exchange format, so it is the escape hatch from this app's own backup shape.
 * The mapping is deliberately pure and lenient:
 *
 * - Import accepts any object that looks like JSON Resume (standard section
 *   arrays, `$schema`, or JSON Resume-only basics fields), fills missing fields
 *   with this app's defaults, and normalizes ISO dates to `YYYY-MM`.
 * - Export writes standard section keys only, keeps the resume as it is shown
 *   (hidden sections/entries are left out), and turns rich-text bullets into
 *   JSON Resume `highlights` arrays.
 *
 * Fields this app has no standard home for (layout, design, custom sections,
 * work authorization, profile icons, volunteer/education locations) are either
 * omitted or carried as extra keys, which the JSON Resume schema allows. A
 * full-fidelity copy stays available through the Resume Maker backup export.
 */

import { richTextToPlainText } from "@/lib/ats/atsText";
import { parseMonthInput, toMonthValue } from "@/lib/date/month";
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

export const JSON_RESUME_SCHEMA_URL =
  "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(text).filter((item) => item !== "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainToRichText(value: string): string {
  const paragraphs = value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");

  return paragraphs
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

function entrySummary(summary: unknown, highlights: unknown): string {
  const parts: string[] = [];
  const body = text(summary);
  const bullets = textList(highlights);

  if (body !== "") {
    parts.push(plainToRichText(body));
  }

  if (bullets.length > 0) {
    parts.push(
      `<ul>${bullets
        .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
        .join("")}</ul>`,
    );
  }

  return parts.join("");
}

function importMonth(value: unknown): string {
  const raw = text(value);

  if (raw === "") {
    return "";
  }

  const direct = toMonthValue(raw);

  if (direct !== "") {
    return direct;
  }

  // Some exporters emit full ISO timestamps (`2013-12-01T00:00:00.000Z`).
  const prefix = /^(\d{4})-(\d{1,2})/.exec(raw);

  if (prefix) {
    return toMonthValue(`${prefix[1]}-${prefix[2]}`);
  }

  return parseMonthInput(raw) ?? "";
}

function importDateRange(item: JsonRecord): {
  startDate: string;
  endDate: string;
  current: boolean;
} {
  const startDate = importMonth(item.startDate);
  const rawEnd = text(item.endDate);
  const endDate = importMonth(rawEnd);
  const current =
    endDate === "" &&
    (startDate !== "" || /^(present|current|now|ongoing)$/i.test(rawEnd));

  return { startDate, endDate, current };
}

function importLocation(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!isRecord(value)) {
    return "";
  }

  const parts = [text(value.city), text(value.region), text(value.countryCode)]
    .filter((part) => part !== "");

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return [text(value.address), text(value.postalCode)]
    .filter((part) => part !== "")
    .join(", ");
}

function importLevel(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : Number.parseInt(text(value), 10);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.min(5, Math.max(0, Math.trunc(numeric)));
}

function importProfile(value: unknown): ProfileItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const url = text(value.url);
  const detected = url === "" ? null : detectProfileLink(url);
  const network = text(value.network) || detected?.network || "";
  const username = text(value.username) || detected?.username || "";

  if (url === "" && network === "" && username === "") {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    network,
    username,
    url,
    icon: detected?.icon ?? "",
  };
}

function importWork(value: unknown): ExperienceItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const company = text(value.name) || text(value.company);
  const position = text(value.position);

  if (company === "" && position === "") {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    company,
    position,
    location: text(value.location),
    ...importDateRange(value),
    summary: entrySummary(value.summary, value.highlights),
  };
}

function importEducation(value: unknown): EducationItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const school = text(value.institution) || text(value.school);
  const degree = text(value.studyType) || text(value.degree);
  const area = text(value.area);

  if (school === "" && degree === "" && area === "") {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    school,
    degree,
    area,
    location: text(value.location),
    ...importDateRange(value),
    grade: text(value.score) || text(value.grade),
    summary: entrySummary(value.summary, value.courses),
  };
}

function importProject(value: unknown): ProjectItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = text(value.name);

  if (name === "") {
    return null;
  }

  const dates = importDateRange(value);

  return {
    id: newId(),
    hidden: false,
    name,
    description: entrySummary(value.description, value.highlights),
    url: text(value.url),
    startDate: dates.startDate,
    endDate: dates.endDate,
    current: dates.current,
    keywords: textList(value.keywords),
  };
}

function importSkill(value: unknown): SkillItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = text(value.name);
  const keywords = textList(value.keywords);

  if (name === "" && keywords.length === 0) {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    name,
    level: importLevel(value.level),
    keywords,
  };
}

function importCertification(value: unknown): CertificationItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = text(value.name);

  if (name === "") {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    name,
    issuer: text(value.issuer),
    date: importMonth(value.date),
    url: text(value.url),
  };
}

function importAward(value: unknown): AwardItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = text(value.title);

  if (title === "") {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    title,
    awarder: text(value.awarder),
    date: importMonth(value.date),
    summary: plainToRichText(text(value.summary)),
  };
}

function importLanguage(value: unknown): LanguageItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = text(value.language) || text(value.name);

  if (name === "") {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    name,
    level: importLevel(value.level),
    fluency: text(value.fluency),
  };
}

function importInterest(value: unknown): InterestItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = text(value.name);
  const keywords = textList(value.keywords);

  if (name === "" && keywords.length === 0) {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    name,
    keywords,
  };
}

function importVolunteer(value: unknown): VolunteerItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const organization = text(value.organization) || text(value.name);
  const position = text(value.position);

  if (organization === "" && position === "") {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    organization,
    position,
    location: text(value.location),
    ...importDateRange(value),
    summary: entrySummary(value.summary, value.highlights),
  };
}

function importPublication(value: unknown): PublicationItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = text(value.name) || text(value.title);

  if (title === "") {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    title,
    publisher: text(value.publisher),
    date: importMonth(value.releaseDate) || importMonth(value.date),
    url: text(value.url),
    summary: plainToRichText(text(value.summary)),
  };
}

function importReference(value: unknown): ReferenceItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = text(value.name);

  if (name === "") {
    return null;
  }

  return {
    id: newId(),
    hidden: false,
    name,
    position: text(value.position),
    company: text(value.company),
    phone: text(value.phone),
    email: text(value.email),
    summary: plainToRichText(
      text(value.reference) || text(value.summary),
    ),
  };
}

function mapArray<T>(value: unknown, mapper: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(mapper)
    .filter((item): item is T => item !== null);
}

const STANDARD_LIST_KEYS = [
  "work",
  "volunteer",
  "education",
  "awards",
  "certificates",
  "publications",
  "skills",
  "languages",
  "interests",
  "references",
  "projects",
] as const;

/**
 * True when the object is a JSON Resume document rather than a Resume Maker
 * backup. Resume Maker documents always carry `metadata`, `sections`, or
 * `customSections`, so a file with one of those is never re-interpreted.
 */
export function isJsonResumeDocument(input: unknown): boolean {
  if (!isRecord(input)) {
    return false;
  }

  if (
    isRecord(input.metadata) ||
    isRecord(input.sections) ||
    Array.isArray(input.customSections)
  ) {
    return false;
  }

  if (
    typeof input.$schema === "string" &&
    /jsonresume/i.test(input.$schema)
  ) {
    return true;
  }

  if (STANDARD_LIST_KEYS.some((key) => Array.isArray(input[key]))) {
    return true;
  }

  const basics = input.basics;

  if (!isRecord(basics)) {
    return false;
  }

  if (isRecord(basics.location) || Array.isArray(basics.profiles)) {
    return true;
  }

  return ["label", "summary", "image", "url"].some(
    (key) => text(basics[key]) !== "",
  );
}

/**
 * Map a JSON Resume object into a complete Resume Maker document. Unknown
 * fields are ignored and missing fields fall back to the normal defaults, so a
 * sparse file still opens in the editor.
 */
export function resumeFromJsonResume(input: unknown): ResumeDocument {
  const source = isRecord(input) ? input : {};
  const basics = isRecord(source.basics) ? source.basics : {};
  const doc = createEmptyResume("onyx");
  const websiteUrl = text(basics.url);
  const image = text(basics.image);
  const profiles = mapArray(basics.profiles, importProfile);

  return {
    ...doc,
    picture: image === ""
      ? doc.picture
      : { ...doc.picture, hidden: false, url: image },
    basics: {
      ...doc.basics,
      name: text(basics.name),
      headline: text(basics.label),
      email: text(basics.email),
      phone: text(basics.phone),
      location: importLocation(basics.location),
      website:
        websiteUrl === ""
          ? doc.basics.website
          : {
              url: websiteUrl,
              label: websiteLabelFromUrl(websiteUrl),
            },
    },
    summary: {
      ...doc.summary,
      content: plainToRichText(text(basics.summary)),
    },
    sections: {
      ...doc.sections,
      profiles: { ...doc.sections.profiles, items: profiles },
      experience: {
        ...doc.sections.experience,
        items: mapArray(source.work, importWork),
      },
      education: {
        ...doc.sections.education,
        items: mapArray(source.education, importEducation),
      },
      projects: {
        ...doc.sections.projects,
        items: mapArray(source.projects, importProject),
      },
      skills: {
        ...doc.sections.skills,
        items: mapArray(source.skills, importSkill),
      },
      certifications: {
        ...doc.sections.certifications,
        items: mapArray(source.certificates, importCertification),
      },
      awards: {
        ...doc.sections.awards,
        items: mapArray(source.awards, importAward),
      },
      languages: {
        ...doc.sections.languages,
        items: mapArray(source.languages, importLanguage),
      },
      interests: {
        ...doc.sections.interests,
        items: mapArray(source.interests, importInterest),
      },
      volunteer: {
        ...doc.sections.volunteer,
        items: mapArray(source.volunteer, importVolunteer),
      },
      publications: {
        ...doc.sections.publications,
        items: mapArray(source.publications, importPublication),
      },
      references: {
        ...doc.sections.references,
        items: mapArray(source.references, importReference),
      },
    },
  };
}

export type JsonResumeProfile = {
  network?: string;
  username?: string;
  url?: string;
};

export type JsonResumeLocation = {
  address?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  region?: string;
};

export type JsonResumeBasics = {
  name?: string;
  label?: string;
  image?: string;
  email?: string;
  phone?: string;
  url?: string;
  summary?: string;
  location?: JsonResumeLocation;
  profiles?: JsonResumeProfile[];
};

export type JsonResumeWork = {
  name?: string;
  position?: string;
  location?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
};

export type JsonResumeEducation = {
  institution?: string;
  location?: string;
  url?: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  score?: string;
  summary?: string;
  courses?: string[];
};

export type JsonResumeAward = {
  title?: string;
  date?: string;
  awarder?: string;
  summary?: string;
};

export type JsonResumeCertificate = {
  name?: string;
  date?: string;
  issuer?: string;
  url?: string;
};

export type JsonResumePublication = {
  name?: string;
  publisher?: string;
  releaseDate?: string;
  url?: string;
  summary?: string;
};

export type JsonResumeSkill = {
  name?: string;
  level?: string;
  keywords?: string[];
};

export type JsonResumeLanguage = {
  language?: string;
  fluency?: string;
};

export type JsonResumeInterest = {
  name?: string;
  keywords?: string[];
};

export type JsonResumeReference = {
  name?: string;
  reference?: string;
  position?: string;
  company?: string;
  phone?: string;
  email?: string;
};

export type JsonResumeProject = {
  name?: string;
  description?: string;
  highlights?: string[];
  keywords?: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
};

export type JsonResumeDocument = {
  $schema?: string;
  basics?: JsonResumeBasics;
  work?: JsonResumeWork[];
  volunteer?: JsonResumeWork[];
  education?: JsonResumeEducation[];
  awards?: JsonResumeAward[];
  certificates?: JsonResumeCertificate[];
  publications?: JsonResumePublication[];
  skills?: JsonResumeSkill[];
  languages?: JsonResumeLanguage[];
  interests?: JsonResumeInterest[];
  references?: JsonResumeReference[];
  projects?: JsonResumeProject[];
};

function visibleItems<T extends { hidden?: boolean }>(
  section: { hidden: boolean; items: T[] },
): T[] {
  if (section.hidden) {
    return [];
  }

  return section.items.filter((item) => item.hidden !== true);
}

function jsonDate(value: string): string {
  const month = toMonthValue(value);

  return month === "" ? value.trim() : `${month}-01`;
}

function jsonLocation(value: string): JsonResumeLocation | null {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");

  if (parts.length === 0) {
    return null;
  }

  if (parts.length === 1) {
    return { city: parts[0] };
  }

  return { city: parts[0], region: parts.slice(1).join(", ") };
}

function plainTextLines(html: string): string[] {
  return richTextToPlainText(html)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function splitRichText(html: string): {
  summary: string;
  highlights: string[];
} {
  const lines = plainTextLines(html);
  const highlights: string[] = [];
  const prose: string[] = [];

  for (const line of lines) {
    if (line.startsWith("- ")) {
      const bullet = line.slice(2).trim();

      if (bullet !== "") {
        highlights.push(bullet);
      }
    } else {
      prose.push(line);
    }
  }

  return { summary: prose.join("\n"), highlights };
}

function workToJson(
  item: ExperienceItem | VolunteerItem,
): JsonResumeWork {
  const { summary, highlights } = splitRichText(item.summary);
  const isExperience = "company" in item;

  return {
    name: isExperience ? item.company : item.organization,
    position: item.position,
    location: item.location,
    url: "",
    startDate: jsonDate(item.startDate),
    endDate: item.current ? "" : jsonDate(item.endDate),
    summary,
    highlights,
  };
}

function educationToJson(item: EducationItem): JsonResumeEducation {
  const { summary, highlights } = splitRichText(item.summary);

  return {
    institution: item.school,
    location: item.location,
    url: "",
    area: item.area,
    studyType: item.degree,
    startDate: jsonDate(item.startDate),
    endDate: item.current ? "" : jsonDate(item.endDate),
    score: item.grade,
    summary,
    courses: highlights,
  };
}

function awardToJson(item: AwardItem): JsonResumeAward {
  return {
    title: item.title,
    date: jsonDate(item.date),
    awarder: item.awarder,
    summary: richTextToPlainText(item.summary),
  };
}

function certificationToJson(
  item: CertificationItem,
): JsonResumeCertificate {
  return {
    name: item.name,
    date: jsonDate(item.date),
    issuer: item.issuer,
    url: item.url,
  };
}

function publicationToJson(
  item: PublicationItem,
): JsonResumePublication {
  return {
    name: item.title,
    publisher: item.publisher,
    releaseDate: jsonDate(item.date),
    url: item.url,
    summary: richTextToPlainText(item.summary),
  };
}

function skillToJson(item: SkillItem): JsonResumeSkill {
  return {
    name: item.name,
    keywords: [...item.keywords],
  };
}

function languageToJson(item: LanguageItem): JsonResumeLanguage {
  return {
    language: item.name,
    fluency: item.fluency,
  };
}

function interestToJson(item: InterestItem): JsonResumeInterest {
  return {
    name: item.name,
    keywords: [...item.keywords],
  };
}

function referenceToJson(item: ReferenceItem): JsonResumeReference {
  return {
    name: item.name,
    reference: richTextToPlainText(item.summary),
    position: item.position,
    company: item.company,
    phone: item.phone,
    email: item.email,
  };
}

function projectToJson(item: ProjectItem): JsonResumeProject {
  const { summary, highlights } = splitRichText(item.description);

  return {
    name: item.name,
    description: summary,
    highlights,
    keywords: [...item.keywords],
    startDate: jsonDate(item.startDate),
    endDate: item.current ? "" : jsonDate(item.endDate),
    url: item.url,
  };
}

function compact<T extends object>(items: T[]): T[] | undefined {
  return items.length > 0 ? items : undefined;
}

/**
 * Map a Resume Maker document to the open JSON Resume shape. Only visible
 * sections and entries are exported, matching the PDF and ATS output; design,
 * layout, and custom sections have no standard home and stay in the Resume
 * Maker backup.
 */
export function toJsonResume(doc: ResumeDocument): JsonResumeDocument {
  const basics: JsonResumeBasics = {
    name: doc.basics.name,
    label: doc.basics.headline,
    image: doc.picture.hidden ? "" : doc.picture.url,
    email: doc.basics.email,
    phone: doc.basics.phone,
    url: doc.basics.website.url,
    summary: richTextToPlainText(doc.summary.content),
  };

  const location = jsonLocation(doc.basics.location);

  if (location) {
    basics.location = location;
  }

  const profiles = visibleItems(doc.sections.profiles).map((item) => ({
    network: item.network,
    username: item.username,
    url: item.url,
  }));

  if (profiles.length > 0) {
    basics.profiles = profiles;
  }

  const result: JsonResumeDocument = {
    $schema: JSON_RESUME_SCHEMA_URL,
    basics,
    work: compact(visibleItems(doc.sections.experience).map(workToJson)),
    volunteer: compact(
      visibleItems(doc.sections.volunteer).map(workToJson),
    ),
    education: compact(
      visibleItems(doc.sections.education).map(educationToJson),
    ),
    awards: compact(visibleItems(doc.sections.awards).map(awardToJson)),
    certificates: compact(
      visibleItems(doc.sections.certifications).map(certificationToJson),
    ),
    publications: compact(
      visibleItems(doc.sections.publications).map(publicationToJson),
    ),
    skills: compact(visibleItems(doc.sections.skills).map(skillToJson)),
    languages: compact(
      visibleItems(doc.sections.languages).map(languageToJson),
    ),
    interests: compact(
      visibleItems(doc.sections.interests).map(interestToJson),
    ),
    references: compact(
      visibleItems(doc.sections.references).map(referenceToJson),
    ),
    projects: compact(
      visibleItems(doc.sections.projects).map(projectToJson),
    ),
  };

  // Drop keys whose section had no visible entries so the file stays tidy.
  for (const key of Object.keys(result) as Array<keyof JsonResumeDocument>) {
    if (key !== "$schema" && key !== "basics" && result[key] === undefined) {
      delete result[key];
    }
  }

  return result;
}

export function serializeJsonResume(doc: ResumeDocument): string {
  return JSON.stringify(toJsonResume(doc), null, 2);
}
