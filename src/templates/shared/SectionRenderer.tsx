import { Fragment, type CSSProperties, type ReactNode } from "react";

import { decodeBlock } from "@/lib/pagination/blockIds";
import type { ResumeDocument, SectionId } from "@/lib/schema/resume.schema";

import { DateRange } from "./DateRange";
import {
  itemId,
  resolveSection,
  text,
  type ItemRecord,
  type ListKind,
  type ResolvedSection,
} from "./sectionData";
import { SkillLevelIndicator } from "./SkillLevelIndicator";

type GenericKind = Exclude<
  SectionId,
  "experience" | "education" | "projects" | "skills"
> | "custom";

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

function EntryShell({
  title,
  subtitle,
  date,
  aside,
  extra,
  summary,
  compact = false,
  keepTogether = false,
}: {
  title: string;
  subtitle?: string;
  date?: ReactNode;
  aside?: ReactNode;
  extra?: ReactNode;
  summary?: string;
  compact?: boolean;
  keepTogether?: boolean;
}) {
  const className = [
    "resume-entry",
    compact ? "resume-entry-compact" : "",
    keepTogether ? "resume-entry-keep-together" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className}>
      <div className="resume-entry-header">
        <div className="resume-entry-leading">
          {title !== "" ? (
            <h3 className="resume-entry-title">{title}</h3>
          ) : null}
          {subtitle ? (
            <p className="resume-entry-subtitle">{subtitle}</p>
          ) : null}
          {extra}
        </div>
        {aside || date ? (
          <div className="resume-entry-aside">
            {aside}
            {date}
          </div>
        ) : null}
      </div>
      {summary && summary.trim() !== "" ? (
        <div
          className="resume-rich-text"
          dangerouslySetInnerHTML={{ __html: summary }}
        />
      ) : null}
    </article>
  );
}

function dateNode(item: ItemRecord): ReactNode {
  const start = text(item, "startDate");
  const end = text(item, "endDate");

  if (start.trim() === "" && end.trim() === "") {
    return null;
  }

  return (
    <DateRange start={start} end={end} current={item.current === true} />
  );
}

function ExperienceEntry({ item }: { item: ItemRecord }) {
  const company = text(item, "company");
  const position = text(item, "position");
  const location = text(item, "location");

  return (
    <EntryShell
      title={position || company}
      subtitle={[position ? company : "", location]
        .filter(Boolean)
        .join(" · ")}
      date={dateNode(item)}
      summary={text(item, "summary")}
      keepTogether
    />
  );
}

function EducationEntry({ item }: { item: ItemRecord }) {
  const school = text(item, "school");
  const degree = text(item, "degree");
  const area = text(item, "area");
  const location = text(item, "location");

  return (
    <EntryShell
      title={degree || school}
      subtitle={[degree ? school : "", area, location]
        .filter(Boolean)
        .join(" · ")}
      date={dateNode(item)}
      summary={text(item, "summary")}
    />
  );
}

function ProjectEntry({ item }: { item: ItemRecord }) {
  const keywords = keywordList(item);

  return (
    <EntryShell
      title={text(item, "name")}
      subtitle={[text(item, "url"), keywords.join(", ")]
        .filter(Boolean)
        .join(" · ")}
      date={dateNode(item)}
      summary={text(item, "description")}
      keepTogether
    />
  );
}

function SkillEntry({
  doc,
  item,
}: {
  doc: ResumeDocument;
  item: ItemRecord;
}) {
  const keywords = keywordList(item);
  const keywordLayout = doc.sections.skills.keywordLayout;

  return (
    <article className="resume-entry resume-entry-compact">
      <div className="resume-entry-header resume-skill-heading">
        <h3 className="resume-entry-title">{text(item, "name")}</h3>
      </div>
      {keywords.length > 0 ? (
        keywordLayout === "list" ? (
          <p className="resume-skill-keywords-list">{keywords.join(", ")}</p>
        ) : (
          <div className="resume-skill-keywords">
            {keywords.map((keyword) => (
              <span key={keyword} className="resume-skill-pill">
                {keyword}
              </span>
            ))}
          </div>
        )
      ) : null}
    </article>
  );
}

function GenericEntry({
  doc,
  kind,
  item,
}: {
  doc: ResumeDocument;
  kind: GenericKind;
  item: ItemRecord;
}) {
  let title = "";
  let subtitle = "";
  let summary = "";
  let date: ReactNode = null;
  let aside: ReactNode = null;
  let extra: ReactNode = null;

  switch (kind) {
    case "profiles":
      title = text(item, "network");
      subtitle = [text(item, "username"), text(item, "url")]
        .filter(Boolean)
        .join(" · ");
      break;
    case "certifications":
      title = text(item, "name");
      subtitle = text(item, "issuer");
      if (text(item, "date").trim() !== "") {
        date = <DateRange start={text(item, "date")} end="" />;
      }
      break;
    case "awards":
      title = text(item, "title");
      subtitle = text(item, "awarder");
      summary = text(item, "summary");
      if (text(item, "date").trim() !== "") {
        date = <DateRange start={text(item, "date")} end="" />;
      }
      break;
    case "languages":
      title = text(item, "name");
      subtitle = text(item, "fluency");
      aside = (
        <SkillLevelIndicator
          level={typeof item.level === "number" ? item.level : 0}
          type={doc.metadata.design.levelType}
        />
      );
      break;
    case "interests":
      title = text(item, "name");
      extra =
        keywordList(item).length > 0 ? (
          <p className="resume-keywords">{keywordList(item).join(", ")}</p>
        ) : null;
      break;
    case "volunteer":
      title = text(item, "organization");
      subtitle = [text(item, "position"), text(item, "location")]
        .filter(Boolean)
        .join(" · ");
      summary = text(item, "summary");
      date = dateNode(item);
      break;
    case "publications":
      title = text(item, "title");
      subtitle = text(item, "publisher");
      summary = text(item, "summary");
      if (text(item, "date").trim() !== "") {
        date = <DateRange start={text(item, "date")} end="" />;
      }
      break;
    case "references":
      title = text(item, "name");
      subtitle = [text(item, "position"), text(item, "company")]
        .filter(Boolean)
        .join(" · ");
      extra = [text(item, "phone"), text(item, "email")]
        .filter(Boolean)
        .join(" · ");
      extra = extra !== "" ? <p className="resume-entry-extra">{extra}</p> : null;
      summary = text(item, "summary");
      break;
    case "custom":
      title = text(item, "name");
      subtitle = [text(item, "location"), text(item, "url")]
        .filter(Boolean)
        .join(" · ");
      summary = text(item, "description");
      if (text(item, "date").trim() !== "") {
        date = <DateRange start={text(item, "date")} end="" />;
      }
      break;
  }

  return (
    <EntryShell
      title={title}
      subtitle={subtitle}
      date={date}
      aside={aside}
      extra={extra}
      summary={summary}
    />
  );
}

function renderItem(
  doc: ResumeDocument,
  kind: ListKind,
  item: ItemRecord,
  index: number,
): ReactNode {
  const id = itemId(item, index);
  let entry: ReactNode;

  switch (kind) {
    case "experience":
      entry = <ExperienceEntry item={item} />;
      break;
    case "education":
      entry = <EducationEntry item={item} />;
      break;
    case "projects":
      entry = <ProjectEntry item={item} />;
      break;
    case "skills":
      entry = <SkillEntry doc={doc} item={item} />;
      break;
    default:
      entry = <GenericEntry doc={doc} kind={kind} item={item} />;
      break;
  }

  return <Fragment key={id}>{entry}</Fragment>;
}

type BlockGroup = {
  sectionId: string;
  resolved: ResolvedSection;
  /** `null` means every visible entry (a plain, atomic section id). */
  entryIds: string[] | null;
  withHeading: boolean;
};

/**
 * A split section contributes several consecutive ids to a page. They must
 * still render as ONE `<section>`: collapsing them here preserves the grid row
 * gaps, multi-column layout and CSS section-level break rules that measuring
 * the entries individually would otherwise change.
 */
function groupBlocks(
  doc: ResumeDocument,
  ids: readonly string[],
): BlockGroup[] {
  const groups: BlockGroup[] = [];

  for (const id of ids) {
    const block = decodeBlock(id);

    if (block.kind !== "section") {
      continue;
    }

    const last = groups[groups.length - 1];

    if (last && last.sectionId === block.sectionId) {
      if (block.entryIds === null) {
        last.entryIds = null;
      } else if (last.entryIds !== null) {
        for (const entryId of block.entryIds) {
          if (!last.entryIds.includes(entryId)) {
            last.entryIds.push(entryId);
          }
        }
      }
      last.withHeading = last.withHeading || block.withHeading;
      continue;
    }

    const resolved = resolveSection(doc, block.sectionId);

    if (!resolved) {
      continue;
    }

    groups.push({
      sectionId: block.sectionId,
      resolved,
      entryIds: block.entryIds ? [...block.entryIds] : null,
      withHeading: block.withHeading,
    });
  }

  return groups;
}

export function SectionRenderer({
  doc,
  pageSectionIds,
}: {
  doc: ResumeDocument;
  pageSectionIds: string[];
}) {
  return (
    <>
      {groupBlocks(doc, pageSectionIds).map((group, sectionIndex) => {
        const { resolved } = group;
        const { config } = resolved;
        const hasHeading =
          group.withHeading && config.showHeading && config.title.trim() !== "";
        const items =
          resolved.kind === "summary"
            ? []
            : group.entryIds === null
              ? resolved.items
              : resolved.items.filter((item, itemIndex) =>
                  group.entryIds?.includes(itemId(item, itemIndex)) ?? true,
                );

        return (
          <section
            key={`${group.sectionId}-${sectionIndex}`}
            className="resume-section"
            data-section-id={group.sectionId}
            data-keep-together={config.keepTogether ? "true" : undefined}
            data-start-new-page={config.startOnNewPage ? "true" : undefined}
            aria-label={hasHeading ? undefined : config.title || undefined}
          >
            {hasHeading ? (
              <h2 className="resume-section-heading">{config.title}</h2>
            ) : null}
            {resolved.kind === "summary" ? (
              <div
                className="resume-rich-text"
                dangerouslySetInnerHTML={{ __html: doc.summary.content }}
              />
            ) : (
              <div
                className="resume-section-items"
                style={
                  { "--section-columns": config.columns } as CSSProperties
                }
              >
                {items.map((item, index) =>
                  renderItem(doc, resolved.kind, item, index),
                )}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
