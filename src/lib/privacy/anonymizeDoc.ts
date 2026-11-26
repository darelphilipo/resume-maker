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
  const referenceNameLabel = entityAnonymizer("Reference");
  const referencePositionLabel = entityAnonymizer("Position");

  return {
    ...doc,
    picture: {
      ...doc.picture,
      hidden: true,
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
        })),
      },
      volunteer: {
        ...doc.sections.volunteer,
        items: doc.sections.volunteer.items.map((item) => ({
          ...item,
          location: replaceWhenPresent(
            item.location,
            ANONYMIZED_ENTRY_LOCATION,
          ),
        })),
      },
      projects: {
        ...doc.sections.projects,
        items: doc.sections.projects.items.map((item) => ({
          ...item,
          url: replaceWhenPresent(item.url, ANONYMIZED_ENTRY_URL),
        })),
      },
      certifications: {
        ...doc.sections.certifications,
        items: doc.sections.certifications.items.map((item) => ({
          ...item,
          url: anonymizeCertificationUrl(item.url),
        })),
      },
      publications: {
        ...doc.sections.publications,
        items: doc.sections.publications.items.map((item) => ({
          ...item,
          url: replaceWhenPresent(item.url, ANONYMIZED_ENTRY_URL),
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
      })),
    })),
  };
}
