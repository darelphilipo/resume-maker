import type { ResumeDocument } from "@/lib/schema/resume.schema";

export const ANONYMIZED_NAME = "Alex Taylor";
export const ANONYMIZED_EMAIL = "alex.taylor@example.com";
export const ANONYMIZED_PHONE = "+1 (555) 010-0100";
export const ANONYMIZED_LOCATION = "San Francisco, CA";
export const ANONYMIZED_WEBSITE_URL = "https://example.com/alex-taylor";
export const ANONYMIZED_WEBSITE_LABEL = "example.com";
export const ANONYMIZED_PROFILE_USERNAME = "alex-taylor";
export const ANONYMIZED_PROFILE_URL = "https://example.com/alex-taylor";
export const ANONYMIZED_ENTRY_URL = "https://example.com/alex-taylor";
export const ANONYMIZED_ENTRY_LOCATION = "City, ST";
export const ANONYMIZED_REFERENCE_PHONE = "+1 (555) 010-0101";
export const ANONYMIZED_REFERENCE_EMAIL = "reference@example.com";

/**
 * Public certification issuers whose domain is not personal information. Keep
 * the issuer recognisable in review mode; only the badge/profile path (which
 * can carry a real name or username) is redacted.
 */
export const PUBLIC_CERTIFICATION_DOMAINS = [
  "credly.com",
  "aws.amazon.com",
  "scrum.org",
  "coursera.org",
];

/** Generic first path segments that never identify a candidate by themselves. */
const PUBLIC_CERTIFICATION_PATH_PREFIXES = [
  "badges",
  "badge",
  "certification",
  "certifications",
  "verify",
  "validation",
  "credentials",
  "course",
  "courses",
  "learning",
];

/**
 * Redacts a certification link without hiding the issuer. A known public
 * domain keeps its scheme/host and at most one generic path segment; every
 * deeper segment — and any query or fragment that could carry a username — is
 * dropped. Unknown or malformed links fall back to the generic placeholder.
 */
export function anonymizeCertificationUrl(value: string): string {
  const trimmed = value.trim();

  if (trimmed === "") {
    return value;
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return ANONYMIZED_ENTRY_URL;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return ANONYMIZED_ENTRY_URL;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (!PUBLIC_CERTIFICATION_DOMAINS.includes(host)) {
    return ANONYMIZED_ENTRY_URL;
  }

  const base = `${url.protocol}//${url.host}`;
  const first = url.pathname.split("/").filter(Boolean)[0];

  if (
    first !== undefined &&
    PUBLIC_CERTIFICATION_PATH_PREFIXES.includes(first.toLowerCase())
  ) {
    return `${base}/${first}/`;
  }

  return `${base}/`;
}

function replaceWhenPresent(value: string, replacement: string): string {
  return value.trim() === "" ? value : replacement;
}

/** Terms shorter than this are too ambiguous to rewrite in prose safely. */
const MIN_PROSE_PII_LENGTH = 3;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rewrites known personal terms inside HTML text nodes while leaving every tag
 * (and therefore every attribute, class, or href) untouched. The HTML is split
 * into tag/text chunks so a company name that also appears in an attribute is
 * never rewritten.
 */
function scrubHtmlTextNodes(
  html: string,
  pattern: RegExp | null,
  replacements: Map<string, string>,
): string {
  if (html.trim() === "" || pattern === null) {
    return html;
  }

  return html
    .split(/(<[^>]*>)/g)
    .map((chunk, index) => {
      if (index % 2 === 1) {
        return chunk;
      }

      return chunk.replace(
        pattern,
        (match: string, prefix: string, term: string) => {
          const replacement = replacements.get(term.toLowerCase());

          return `${prefix}${replacement ?? term}`;
        },
      );
    })
    .join("");
}

/**
 * Builds a single-pass scrubber from the resume's own structured fields. Terms
 * are deduplicated case-insensitively, sorted longest-first so a full employer
 * name wins over a shorter prefix, and matched on alphanumeric boundaries so
 * "Acme" never rewrites "Acmeology". The replacements reuse the same stable
 * labels as the structured redaction (`Alex Taylor`, `Company A`, ...).
 */
function buildProseScrubber(
  doc: ResumeDocument,
  labels: {
    companyLabel: (value: string) => string;
    schoolLabel: (value: string) => string;
    organizationLabel: (value: string) => string;
    awarderLabel: (value: string) => string;
  },
): (html: string) => string {
  const replacements = new Map<string, string>();

  const add = (value: string, replacement: string): void => {
    const term = value.trim();

    if (term.length < MIN_PROSE_PII_LENGTH) {
      return;
    }

    const key = term.toLowerCase();

    if (!replacements.has(key)) {
      replacements.set(key, replacement);
    }
  };

  add(doc.basics.name, ANONYMIZED_NAME);
  add(doc.basics.email, ANONYMIZED_EMAIL);
  add(doc.basics.phone, ANONYMIZED_PHONE);

  for (const item of doc.sections.experience.items) {
    add(item.company, labels.companyLabel(item.company));
  }

  for (const item of doc.sections.education.items) {
    add(item.school, labels.schoolLabel(item.school));
  }

  for (const item of doc.sections.volunteer.items) {
    add(item.organization, labels.organizationLabel(item.organization));
  }

  for (const item of doc.sections.awards.items) {
    add(item.awarder, labels.awarderLabel(item.awarder));
  }

  if (replacements.size === 0) {
    return (html: string): string => html;
  }

  const terms = [...replacements.keys()].sort(
    (a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0),
  );
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}])(${terms.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}])`,
    "giu",
  );

  return (html: string): string =>
    scrubHtmlTextNodes(html, pattern, replacements);
}

function replaceOptionalWhenPresent(
  value: string | undefined,
  replacement: string,
): string | undefined {
  return value === undefined
    ? undefined
    : replaceWhenPresent(value, replacement);
}

/**
 * Gives every distinct value a stable lettered label in first-seen order:
 * `Company A`, `Company B`, ... Repeats of the same name share one label, and
 * blank values stay blank so an empty field never grows fake content.
 */
function entityAnonymizer(prefix: string): (value: string) => string {
  const labels = new Map<string, string>();

  return (value: string): string => {
    const trimmed = value.trim();

    if (trimmed === "") {
      return value;
    }

    const key = trimmed.toLocaleLowerCase();
    const existing = labels.get(key);

    if (existing !== undefined) {
      return existing;
    }

    const index = labels.size;
    const suffix =
      index < 26
        ? String.fromCharCode("A".charCodeAt(0) + index)
        : String(index + 1);
    const label = `${prefix} ${suffix}`;

    labels.set(key, label);

    return label;
  };
}

/**
 * Returns a display-only copy of the resume with identifying details replaced.
 * The saved document is never mutated: callers use this only for the Preview,
 * ATS text, and the captured print snapshot, so toggling review mode cannot
 * touch Dexie, undo history, or layout measurements.
 */
export function anonymizeResumeDoc(doc: ResumeDocument): ResumeDocument {
  const companyLabel = entityAnonymizer("Company");
  const schoolLabel = entityAnonymizer("University");
  const awarderLabel = entityAnonymizer("Organization");
  const volunteerOrganizationLabel = entityAnonymizer("Organization");
  const referenceNameLabel = entityAnonymizer("Reference");
  const referencePositionLabel = entityAnonymizer("Position");
  const scrubProse = buildProseScrubber(doc, {
    companyLabel,
    schoolLabel,
    organizationLabel: volunteerOrganizationLabel,
    awarderLabel,
  });

  return {
    ...doc,
    picture: {
      ...doc.picture,
      hidden: true,
      url: "",
    },
    basics: {
      ...doc.basics,
      name: replaceWhenPresent(doc.basics.name, ANONYMIZED_NAME),
      email: replaceWhenPresent(doc.basics.email, ANONYMIZED_EMAIL),
      phone: replaceWhenPresent(doc.basics.phone, ANONYMIZED_PHONE),
      location: replaceWhenPresent(doc.basics.location, ANONYMIZED_LOCATION),
      website: {
        ...doc.basics.website,
        url: replaceWhenPresent(
          doc.basics.website.url,
          ANONYMIZED_WEBSITE_URL,
        ),
        label: replaceWhenPresent(
          doc.basics.website.label,
          ANONYMIZED_WEBSITE_LABEL,
        ),
      },
    },
    summary: {
      ...doc.summary,
      content: scrubProse(doc.summary.content),
    },
    sections: {
      ...doc.sections,
      profiles: {
        ...doc.sections.profiles,
        items: doc.sections.profiles.items.map((item) => ({
          ...item,
          username: replaceWhenPresent(
            item.username,
            ANONYMIZED_PROFILE_USERNAME,
          ),
          url: replaceWhenPresent(item.url, ANONYMIZED_PROFILE_URL),
        })),
      },
      experience: {
        ...doc.sections.experience,
        items: doc.sections.experience.items.map((item) => ({
          ...item,
          company: companyLabel(item.company),
          location: replaceWhenPresent(
            item.location,
            ANONYMIZED_ENTRY_LOCATION,
          ),
          summary: scrubProse(item.summary),
        })),
      },
      education: {
        ...doc.sections.education,
        items: doc.sections.education.items.map((item) => ({
          ...item,
          school: schoolLabel(item.school),
          location: replaceWhenPresent(
            item.location,
            ANONYMIZED_ENTRY_LOCATION,
          ),
          summary: scrubProse(item.summary),
        })),
      },
      volunteer: {
        ...doc.sections.volunteer,
        items: doc.sections.volunteer.items.map((item) => ({
          ...item,
          organization: volunteerOrganizationLabel(item.organization),
          location: replaceWhenPresent(
            item.location,
            ANONYMIZED_ENTRY_LOCATION,
          ),
          summary: scrubProse(item.summary),
        })),
      },
      projects: {
        ...doc.sections.projects,
        items: doc.sections.projects.items.map((item) => ({
          ...item,
          url: replaceWhenPresent(item.url, ANONYMIZED_ENTRY_URL),
          description: scrubProse(item.description),
        })),
      },
      certifications: {
        ...doc.sections.certifications,
        items: doc.sections.certifications.items.map((item) => ({
          ...item,
          url: anonymizeCertificationUrl(item.url),
        })),
      },
      awards: {
        ...doc.sections.awards,
        items: doc.sections.awards.items.map((item) => ({
          ...item,
          awarder: awarderLabel(item.awarder),
          summary: scrubProse(item.summary),
        })),
      },
      publications: {
        ...doc.sections.publications,
        items: doc.sections.publications.items.map((item) => ({
          ...item,
          url: replaceWhenPresent(item.url, ANONYMIZED_ENTRY_URL),
          summary: scrubProse(item.summary),
        })),
      },
      references: {
        ...doc.sections.references,
        items: doc.sections.references.items.map((item) => ({
          ...item,
          name: referenceNameLabel(item.name),
          // Reuse the experience employer labels so one company keeps one name
          // across the whole resume.
          company: companyLabel(item.company),
          position: referencePositionLabel(item.position),
          phone: replaceWhenPresent(item.phone, ANONYMIZED_REFERENCE_PHONE),
          email: replaceWhenPresent(item.email, ANONYMIZED_REFERENCE_EMAIL),
          summary: scrubProse(item.summary),
        })),
      },
    },
    customSections: doc.customSections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        location: replaceOptionalWhenPresent(
          item.location,
          ANONYMIZED_ENTRY_LOCATION,
        ),
        url: replaceOptionalWhenPresent(item.url, ANONYMIZED_ENTRY_URL),
        description: scrubProse(item.description),
      })),
    })),
  };
}
