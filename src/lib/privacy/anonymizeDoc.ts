import type { ResumeDocument } from "@/lib/schema/resume.schema";

export const ANONYMIZED_NAME = "Alex Taylor";
export const ANONYMIZED_EMAIL = "alex.taylor@example.com";
export const ANONYMIZED_PHONE = "+1 (555) 010-0100";
export const ANONYMIZED_LOCATION = "San Francisco, CA";
export const ANONYMIZED_WEBSITE_URL = "https://example.com/alex-taylor";
export const ANONYMIZED_WEBSITE_LABEL = "example.com";
export const ANONYMIZED_PROFILE_USERNAME = "alex-taylor";
export const ANONYMIZED_PROFILE_URL = "https://example.com/alex-taylor";

function replaceWhenPresent(value: string, replacement: string): string {
  return value.trim() === "" ? value : replacement;
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
        })),
      },
      education: {
        ...doc.sections.education,
        items: doc.sections.education.items.map((item) => ({
          ...item,
          school: schoolLabel(item.school),
        })),
      },
    },
  };
}
