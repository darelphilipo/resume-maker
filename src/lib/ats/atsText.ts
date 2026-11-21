import { formatMonth } from "@/lib/date/month";
import {
  DEFAULT_SECTION_ORDER,
  SECTION_IDS,
  type ResumeDocument,
  type SectionId,
} from "@/lib/schema/resume.schema";

type ItemRecord = Record<string, unknown>;

const PRIMARY_FIELDS: Record<SectionId, string> = {
  profiles: "network",
  experience: "company",
  education: "school",
  projects: "name",
  skills: "name",
  certifications: "name",
  awards: "title",
  languages: "name",
  interests: "name",
  volunteer: "organization",
  publications: "title",
  references: "name",
};

export interface AtsCopyEntry {
  id: string;
  label: string;
  text: string;
}

export interface AtsCopySection {
  id: string;
  title: string;
  text: string;
  entries: AtsCopyEntry[];
}

export interface AtsCopyBlocks {
  header: AtsCopyEntry | null;
  sections: AtsCopySection[];
  text: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function text(item: ItemRecord, field: string): string {
  const value = item[field];
  return typeof value === "string" ? value : "";
}

function keywordList(item: ItemRecord): string[] {
  const value = item.keywords;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (keyword): keyword is string =>
      typeof keyword === "string" && keyword.trim() !== "",
  );
}

function visibleItems(
  items: readonly unknown[],
  primaryField: string,
  {
    keywordsCountAsContent = false,
    anyOfFields = [],
  }: {
    keywordsCountAsContent?: boolean;
    anyOfFields?: readonly string[];
  } = {},
): ItemRecord[] {
  return items
    .map((item) => item as ItemRecord)
    .filter(
      (item) =>
        item.hidden !== true &&
        (text(item, primaryField).trim() !== "" ||
          (keywordsCountAsContent && keywordList(item).length > 0) ||
          anyOfFields.some((field) => text(item, field).trim() !== "")),
    );
}

function decodeEntities(value: string): string {
  return value.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (match, entity: string) => {
      if (entity.startsWith("#")) {
        const isHex = entity[1]?.toLowerCase() === "x";
        const code = Number.parseInt(
          isHex ? entity.slice(2) : entity.slice(1),
          isHex ? 16 : 10,
        );

        if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
          return String.fromCodePoint(code);
        }

        return match;
      }

      return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
    },
  );
}

export function richTextToPlainText(html: string): string {
  if (html.trim() === "") {
    return "";
  }

  const withBreaks = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "- ")
    .replace(/<\s*\/\s*(?:p|div|li|ul|ol|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "");

  return decodeEntities(withBreaks)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line !== "")
    .join("\n");
}

function pushText(lines: string[], value: string): void {
  const trimmed = value.trim();

  if (trimmed !== "") {
    lines.push(trimmed);
  }
}

function pushRichText(lines: string[], value: string): void {
  const plain = richTextToPlainText(value);

  if (plain !== "") {
    lines.push(...plain.split("\n"));
  }
}

function dateRange(start: string, end: string, current = false): string {
  const parts = [formatMonth(start), current ? "Present" : formatMonth(end)].filter(
    (part) => part !== "",
  );

  return parts.join(" — ");
}

function addDateLine(lines: string[], item: ItemRecord, single = false): void {
  if (single) {
    const date = formatMonth(text(item, "date"));

    if (date !== "") {
      lines.push(date);
    }

    return;
  }

  const range = dateRange(
    text(item, "startDate"),
    text(item, "endDate"),
    item.current === true,
  );

  if (range !== "") {
    lines.push(range);
  }
}

function joinedField(item: ItemRecord, fields: readonly string[]): string {
  return fields
    .map((field) => text(item, field).trim())
    .filter((value) => value !== "")
    .join(" · ");
}

function contactLine(doc: ResumeDocument): string[] {
  const entries: string[] = [];

  pushText(entries, doc.basics.email);
  pushText(entries, doc.basics.phone);
  pushText(entries, doc.basics.location);
  pushText(entries, doc.basics.workAuth);
  pushText(
    entries,
    doc.basics.website.label.trim() || doc.basics.website.url,
  );

  for (const field of doc.basics.customFields) {
    pushText(entries, field.text);
  }

  return entries;
}

function headerLines(doc: ResumeDocument): string[] {
  const lines: string[] = [];

  pushText(lines, doc.basics.name);
  pushText(lines, doc.basics.headline);

  const contacts = contactLine(doc);

  if (contacts.length > 0) {
    lines.push(contacts.join(" | "));
  }

  return lines;
}

function experienceLines(item: ItemRecord): string[] {
  const lines: string[] = [];
  const company = text(item, "company").trim();
  const position = text(item, "position").trim();

  pushText(lines, position || company);
  pushText(
    lines,
    joinedField(item, position !== "" ? ["company", "location"] : ["location"]),
  );
  addDateLine(lines, item);
  pushRichText(lines, text(item, "summary"));

  return lines;
}

function educationLines(item: ItemRecord): string[] {
  const lines: string[] = [];
  const school = text(item, "school").trim();
  const degree = text(item, "degree").trim();

  pushText(lines, degree || school);
  pushText(
    lines,
    joinedField(
      item,
      degree !== ""
        ? ["school", "area", "location", "grade"]
        : ["area", "location", "grade"],
    ),
  );
  addDateLine(lines, item);
  pushRichText(lines, text(item, "summary"));

  return lines;
}

function projectLines(item: ItemRecord): string[] {
  const lines: string[] = [];
  const keywords = keywordList(item).join(", ");

  pushText(lines, text(item, "name"));
  pushText(lines, [text(item, "url").trim(), keywords].filter(Boolean).join(" · "));
  addDateLine(lines, item);
  pushRichText(lines, text(item, "description"));

  return lines;
}

function skillLines(item: ItemRecord): string[] {
  const lines: string[] = [];
  const keywords = keywordList(item).join(", ");

  pushText(lines, text(item, "name"));
  pushText(lines, keywords);

  return lines;
}

function genericLines(kind: string, item: ItemRecord): string[] {
  const lines: string[] = [];

  switch (kind) {
    case "profiles":
      pushText(lines, text(item, "network"));
      pushText(lines, joinedField(item, ["username", "url"]));
      break;
    case "certifications":
      pushText(lines, text(item, "name"));
      pushText(lines, text(item, "issuer"));
      addDateLine(lines, item, true);
      pushText(lines, text(item, "url"));
      break;
    case "awards":
      pushText(lines, text(item, "title"));
      pushText(lines, text(item, "awarder"));
      addDateLine(lines, item, true);
      pushRichText(lines, text(item, "summary"));
      break;
    case "languages":
      pushText(lines, text(item, "name"));
      pushText(lines, text(item, "fluency"));
      break;
    case "interests":
      pushText(lines, text(item, "name"));
      pushText(lines, keywordList(item).join(", "));
      break;
    case "volunteer":
      pushText(lines, text(item, "organization"));
      pushText(lines, joinedField(item, ["position", "location"]));
      addDateLine(lines, item);
      pushRichText(lines, text(item, "summary"));
      break;
    case "publications":
      pushText(lines, text(item, "title"));
      pushText(lines, text(item, "publisher"));
      addDateLine(lines, item, true);
      pushText(lines, text(item, "url"));
      pushRichText(lines, text(item, "summary"));
      break;
    case "references":
      pushText(lines, text(item, "name"));
      pushText(lines, joinedField(item, ["position", "company"]));
      pushText(lines, joinedField(item, ["phone", "email"]));
      pushRichText(lines, text(item, "summary"));
      break;
    case "custom":
      pushText(lines, text(item, "name"));
      pushText(lines, joinedField(item, ["location", "url"]));
      addDateLine(lines, item, true);
      pushRichText(lines, text(item, "description"));
      break;
  }

  return lines;
}

function itemLines(kind: string, item: ItemRecord): string[] {
  switch (kind) {
    case "experience":
      return experienceLines(item);
    case "education":
      return educationLines(item);
    case "projects":
      return projectLines(item);
    case "skills":
      return skillLines(item);
    default:
      return genericLines(kind, item);
  }
}

function entryId(item: ItemRecord, fallback: string): string {
  return typeof item.id === "string" && item.id.trim() !== ""
    ? item.id
    : fallback;
}

function entryLabel(kind: string, item: ItemRecord): string {
  switch (kind) {
    case "experience":
      return text(item, "position").trim() || text(item, "company").trim();
    case "education":
      return text(item, "degree").trim() || text(item, "school").trim();
    case "skills":
      return text(item, "name").trim() || keywordList(item)[0]?.trim() || "";
    default: {
      const primaryField = (PRIMARY_FIELDS as Record<string, string>)[kind];

      return text(item, primaryField ?? "name").trim();
    }
  }
}

function copyEntries(kind: string, items: ItemRecord[]): AtsCopyEntry[] {
  return items
    .map((item, index) => ({
      id: entryId(item, `${kind}-${index + 1}`),
      label: entryLabel(kind, item),
      text: itemLines(kind, item).join("\n"),
    }))
    .filter((entry) => entry.text !== "");
}

function copySection(
  id: string,
  title: string,
  showHeading: boolean,
  entries: AtsCopyEntry[],
): AtsCopySection | null {
  const body = entries
    .map((entry) => entry.text)
    .filter((entry) => entry !== "")
    .join("\n\n");

  if (body === "") {
    return null;
  }

  const heading = showHeading ? title.trim() : "";
  const text = heading !== "" ? `${heading}\n${body}` : body;

  return {
    id,
    title: title.trim() || id,
    text,
    entries,
  };
}

function summaryCopySection(doc: ResumeDocument): AtsCopySection | null {
  if (doc.summary.hidden) {
    return null;
  }

  const plain = richTextToPlainText(doc.summary.content);

  if (plain === "") {
    return null;
  }

  return copySection("summary", doc.summary.title, doc.summary.showHeading, [
    {
      id: "summary-text",
      label: doc.summary.title.trim() || "Summary",
      text: plain,
    },
  ]);
}

function knownCopySection(
  doc: ResumeDocument,
  sectionId: SectionId,
): AtsCopySection | null {
  const section = doc.sections[sectionId];

  if (section.hidden) {
    return null;
  }

  const items = visibleItems(
    section.items,
    PRIMARY_FIELDS[sectionId],
    {
      keywordsCountAsContent: sectionId === "skills",
      anyOfFields: sectionId === "profiles" ? ["username", "url"] : [],
    },
  );

  if (items.length === 0) {
    return null;
  }

  return copySection(
    sectionId,
    section.title,
    section.showHeading,
    copyEntries(sectionId, items),
  );
}

function customCopySection(
  doc: ResumeDocument,
  sectionId: string,
): AtsCopySection | null {
  const section = doc.customSections.find(
    (candidate) => candidate.id === sectionId,
  );

  if (!section || section.hidden) {
    return null;
  }

  const items = visibleItems(section.items, "name");

  if (items.length === 0) {
    return null;
  }

  return copySection(
    section.id,
    section.title,
    section.showHeading,
    copyEntries("custom", items),
  );
}

export function resolveAtsSectionOrder(doc: ResumeDocument): string[] {
  const firstPage = doc.metadata.layout.pages[0];

  if (!firstPage) {
    return [...DEFAULT_SECTION_ORDER];
  }

  return [...firstPage.main, ...firstPage.sidebar];
}

export function buildAtsCopyBlocks(doc: ResumeDocument): AtsCopyBlocks {
  const sections: AtsCopySection[] = [];

  for (const sectionId of resolveAtsSectionOrder(doc)) {
    if (sectionId === "summary") {
      const block = summaryCopySection(doc);

      if (block) {
        sections.push(block);
      }

      continue;
    }

    const knownSectionId = SECTION_IDS.find(
      (candidate) => candidate === sectionId,
    );
    const block = knownSectionId
      ? knownCopySection(doc, knownSectionId)
      : customCopySection(doc, sectionId);

    if (block) {
      sections.push(block);
    }
  }

  const header = headerLines(doc);
  const headerBlock: AtsCopyEntry | null =
    header.length > 0
      ? {
          id: "header",
          label: "Contact details",
          text: header.join("\n"),
        }
      : null;

  const blocks = [
    headerBlock?.text ?? "",
    ...sections.map((section) => section.text),
  ].filter((block) => block !== "");

  return {
    header: headerBlock,
    sections,
    text: blocks.join("\n\n"),
  };
}

export function buildAtsText(doc: ResumeDocument): string {
  return buildAtsCopyBlocks(doc).text;
}
