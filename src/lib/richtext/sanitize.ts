import DOMPurify from "dompurify";

import {
  SECTION_IDS,
  type ResumeBasics,
  type ResumeDocument,
  type SectionId,
} from "@/lib/schema/resume.schema";

export const RICH_TEXT_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "ul",
  "ol",
  "li",
  "a",
] as const;

const RICH_TEXT_ATTRIBUTES = ["href", "target", "rel"] as const;

const RICH_TEXT_ITEM_FIELDS: Partial<Record<SectionId, readonly string[]>> = {
  experience: ["summary"],
  education: ["summary"],
  projects: ["description"],
  awards: ["summary"],
  volunteer: ["summary"],
  publications: ["summary"],
  references: ["summary"],
};

function isSafeHref(href: string): boolean {
  const normalized = href.trim().toLowerCase();

  return (
    !normalized.startsWith("javascript:") &&
    !normalized.startsWith("data:") &&
    !normalized.startsWith("vbscript:")
  );
}

function normalizeTree(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;

  for (const bold of Array.from(template.content.querySelectorAll("b"))) {
    const strong = document.createElement("strong");
    strong.append(...Array.from(bold.childNodes));
    bold.replaceWith(strong);
  }

  for (const italic of Array.from(template.content.querySelectorAll("i"))) {
    const em = document.createElement("em");
    em.append(...Array.from(italic.childNodes));
    italic.replaceWith(em);
  }

  for (const anchor of Array.from(template.content.querySelectorAll("a"))) {
    const href = anchor.getAttribute("href");

    if (href !== null && !isSafeHref(href)) {
      anchor.removeAttribute("href");
    }

    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  }

  return template.innerHTML;
}

export function sanitizeRichText(html: string): string {
  if (typeof window === "undefined") {
    return html;
  }

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...RICH_TEXT_TAGS],
    ALLOWED_ATTR: [...RICH_TEXT_ATTRIBUTES],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
  });

  return normalizeTree(clean);
}

function sanitizeItemFields(
  item: unknown,
  fields: readonly string[],
): unknown {
  if (typeof item !== "object" || item === null) {
    return item;
  }

  const record = { ...(item as Record<string, unknown>) };

  for (const field of fields) {
    const value = record[field];

    if (typeof value === "string") {
      record[field] = sanitizeRichText(value);
    }
  }

  return record;
}

type SectionWithItems = {
  items: unknown[];
} & Record<string, unknown>;

export function sanitizeResumeDocument(doc: ResumeDocument): ResumeDocument {
  const sections = {
    ...doc.sections,
  } as unknown as Record<string, SectionWithItems>;

  for (const sectionId of SECTION_IDS) {
    const fields = RICH_TEXT_ITEM_FIELDS[sectionId];

    if (!fields) {
      continue;
    }

    const section = sections[sectionId];

    sections[sectionId] = {
      ...section,
      items: section.items.map((item) => sanitizeItemFields(item, fields)),
    };
  }

  const basicsWithSummary = doc.basics as ResumeBasics & {
    summary?: unknown;
  };
  const basics =
    typeof basicsWithSummary.summary === "string"
      ? {
          ...doc.basics,
          summary: sanitizeRichText(basicsWithSummary.summary),
        }
      : doc.basics;

  return {
    ...doc,
    basics,
    summary: {
      ...doc.summary,
      content: sanitizeRichText(doc.summary.content),
    },
    sections: sections as unknown as ResumeDocument["sections"],
    customSections: doc.customSections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        description: sanitizeRichText(item.description),
      })),
    })),
    metadata: { ...doc.metadata },
  };
}
