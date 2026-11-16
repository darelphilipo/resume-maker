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

function visibleItems(items: readonly unknown[], primaryField: string): ItemRecord[] {
  return items
    .map((item) => item as ItemRecord)
    .filter(
      (item) =>
        item.hidden !== true && text(item, primaryField).trim() !== "",
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
  pushText(entries, doc.basics.website.label);

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
    joinedField(item, degree !== "" ? ["school", "area", "location"] : ["area", "location"]),
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

function itemBlocks(kind: string, items: ItemRecord[]): string[] {
  return items
    .map((item) => itemLines(kind, item).join("\n"))
    .filter((block) => block !== "");
}

function sectionBlock(title: string, blocks: string[]): string | null {
  const body = blocks.filter((block) => block !== "").join("\n\n");

  if (body === "") {
    return null;
  }

  return title.trim() !== "" ? `${title.trim()}\n${body}` : body;
}

function summaryBlock(doc: ResumeDocument): string | null {
  if (doc.summary.hidden) {
    return null;
  }

  const plain = richTextToPlainText(doc.summary.content);

  if (plain === "") {
    return null;
  }

  return sectionBlock(
    doc.summary.showHeading ? doc.summary.title : "",
    [plain],
  );
}

function knownSectionBlock(
  doc: ResumeDocument,
  sectionId: SectionId,
): string | null {
  const section = doc.sections[sectionId];

  if (section.hidden) {
    return null;
  }

  const items = visibleItems(section.items, PRIMARY_FIELDS[sectionId]);

  if (items.length === 0) {
    return null;
  }

  return sectionBlock(
    section.showHeading ? section.title : "",
    itemBlocks(sectionId, items),
  );
}

function customSectionBlock(
  doc: ResumeDocument,
  sectionId: string,
): string | null {
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

  return sectionBlock(
    section.showHeading ? section.title : "",
    itemBlocks("custom", items),
  );
}

export function resolveAtsSectionOrder(doc: ResumeDocument): string[] {
  const firstPage = doc.metadata.layout.pages[0];

  if (!firstPage) {
    return [...DEFAULT_SECTION_ORDER];
  }

  return [...firstPage.main, ...firstPage.sidebar];
}

export function buildAtsText(doc: ResumeDocument): string {
  const blocks: string[] = [];
  const header = headerLines(doc);

  if (header.length > 0) {
    blocks.push(header.join("\n"));
  }

  for (const sectionId of resolveAtsSectionOrder(doc)) {
    if (sectionId === "summary") {
      const block = summaryBlock(doc);

      if (block) {
        blocks.push(block);
      }

      continue;
    }

    const knownSectionId = SECTION_IDS.find(
      (candidate) => candidate === sectionId,
    );
    const block = knownSectionId
      ? knownSectionBlock(doc, knownSectionId)
      : customSectionBlock(doc, sectionId);

    if (block) {
      blocks.push(block);
    }
  }

  return blocks.join("\n\n");
}
