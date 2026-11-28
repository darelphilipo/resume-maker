import { Fragment, type CSSProperties, type ReactNode } from "react";

import {
  groupExperienceItems,
  type ExperienceGroup,
} from "@/lib/experience/groupExperience";
import {
  externalLinkHref,
  profilesPromotedToHeader,
  websiteLabelFromUrl,
} from "@/lib/links/contactLinks";
import {
  decodeBlock,
  type BlockFragment,
} from "@/lib/pagination/blockIds";
import { highlightScanMetrics } from "@/lib/preview/scanMetrics";
import {
  parseEntryBulletSlices,
  sliceEntryBullets,
} from "@/lib/richtext/bulletSlices";
import { stripEmptyListItems } from "@/lib/richtext/stripEmptyListItems";
import type { ResumeDocument, SectionId } from "@/lib/schema/resume.schema";

import { DateRange } from "./DateRange";
import {
  ScanHighlightContext,
  useScanHighlight,
} from "./scanHighlightContext";
import {
  itemId,
  keywordList,
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

/**
 * One display rule for every rendered URL: drop the scheme, `www.`, query,
 * hash, and trailing slash. The same helper backs links and the plain-text
 * URL labels in Projects and custom sections, so those never show a raw
 * `https://` while Certifications and Publications look clean.
 */
function urlLabel(url: string): string {
  const trimmed = url.trim();

  return websiteLabelFromUrl(trimmed) || trimmed;
}

function ResumeLink({ url }: { url: string }) {
  const trimmed = url.trim();
  const label = urlLabel(trimmed);

  if (label === "") {
    return null;
  }

  const href = externalLinkHref(trimmed);

  if (href === "") {
    return <span>{label}</span>;
  }

  return (
    <a className="resume-link" href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

function richTextHtml(html: string, scanHighlight: boolean): string {
  const cleaned = stripEmptyListItems(html);

  return scanHighlight ? highlightScanMetrics(cleaned) : cleaned;
}

/**
 * Renders only the bullets a page owns. Fragments are created only for a
 * single-list field, so an unparseable value falls back to the whole entry
 * rather than dropping prose.
 */
function slicedRichText(
  html: string,
  fragment: BlockFragment | undefined,
): string {
  if (!fragment) {
    return html;
  }

  const slices = parseEntryBulletSlices(html);

  return slices ? sliceEntryBullets(slices, fragment.start, fragment.end) : html;
}

function isContinuation(fragment: BlockFragment | undefined): boolean {
  return fragment !== undefined && fragment.start > 0;
}

function EntryShell({
  entryId,
  title,
  subtitle,
  date,
  aside,
  extra,
  summary,
  compact = false,
  keepTogether = false,
  continuation = false,
}: {
  /** Rendered item id, used by the trim tips to jump to the editor entry. */
  entryId?: string;
  title: string;
  subtitle?: ReactNode;
  date?: ReactNode;
  aside?: ReactNode;
  extra?: ReactNode;
  summary?: string;
  compact?: boolean;
  keepTogether?: boolean;
  continuation?: boolean;
}) {
  const className = [
    "resume-entry",
    compact ? "resume-entry-compact" : "",
    keepTogether ? "resume-entry-keep-together" : "",
    continuation ? "resume-entry-continuation" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const scanHighlight = useScanHighlight();
  const showHeader =
    !continuation && (title !== "" || Boolean(subtitle) || Boolean(extra) || Boolean(aside) || Boolean(date));

  return (
    <article className={className} data-entry-id={entryId}>
      {showHeader ? (
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
      ) : null}
      {summary && summary.trim() !== "" ? (
        <div
          className="resume-rich-text"
          dangerouslySetInnerHTML={{
            __html: richTextHtml(summary, scanHighlight),
          }}
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

function ExperienceEntry({
  item,
  entryId,
  fragment,
}: {
  item: ItemRecord;
  entryId: string;
  fragment?: BlockFragment;
}) {
  const company = text(item, "company");
  const position = text(item, "position");
  const location = text(item, "location");

  return (
    <EntryShell
      entryId={entryId}
      title={position || company}
      subtitle={[position ? company : "", location]
        .filter(Boolean)
        .join(" · ")}
      date={dateNode(item)}
      summary={slicedRichText(text(item, "summary"), fragment)}
      keepTogether
      continuation={isContinuation(fragment)}
    />
  );
}

/**
 * One promoted role under a shared company header. The company and combined
 * dates live in the group header, so each role shows only its title, its own
 * dates, and its bullets. `keepTogether` keeps a single role from splitting
 * across pages.
 */
function ExperienceRole({
  item,
  entryId,
}: {
  item: ItemRecord;
  entryId: string;
}) {
  return (
    <EntryShell
      entryId={entryId}
      title={text(item, "position")}
      date={dateNode(item)}
      summary={text(item, "summary")}
      keepTogether
    />
  );
}

function ExperienceCompanyGroup({ group }: { group: ExperienceGroup }) {
  const { start, end, current } = group.dateSpan;
  const showDate = start.trim() !== "" || end.trim() !== "";

  return (
    <article className="resume-company-group">
      <div className="resume-entry resume-company-group-header">
        <div className="resume-entry-header">
          <div className="resume-entry-leading">
            <h3 className="resume-entry-title">{group.company}</h3>
            {group.location !== "" ? (
              <p className="resume-entry-subtitle">{group.location}</p>
            ) : null}
          </div>
          {showDate ? (
            <div className="resume-entry-aside">
              <DateRange start={start} end={end} current={current} />
            </div>
          ) : null}
        </div>
      </div>
      <div className="resume-company-roles">
        {group.items.map((item, index) => (
          <Fragment key={itemId(item, index)}>
            <ExperienceRole item={item} entryId={itemId(item, index)} />
          </Fragment>
        ))}
      </div>
    </article>
  );
}

/**
 * Grouped rendering for the Experience section. Consecutive roles at the same
 * company share one header; every other entry keeps the normal layout. The ATS
 * text renderer is intentionally separate and stays a linear list.
 */
function renderExperienceItems(items: ItemRecord[]): ReactNode[] {
  return groupExperienceItems(items).map((group) =>
    group.grouped ? (
      <ExperienceCompanyGroup key={group.key} group={group} />
    ) : (
      <Fragment key={group.key}>
        <ExperienceEntry
          item={group.items[0]}
          entryId={itemId(group.items[0], 0)}
        />
      </Fragment>
    ),
  );
}

function EducationEntry({
  item,
  entryId,
  fragment,
}: {
  item: ItemRecord;
  entryId: string;
  fragment?: BlockFragment;
}) {
  const school = text(item, "school");
  const degree = text(item, "degree");
  const area = text(item, "area");
  const location = text(item, "location");
  const grade = text(item, "grade");

  return (
    <EntryShell
      entryId={entryId}
      title={degree || school}
      subtitle={[degree ? school : "", area, location, grade]
        .filter(Boolean)
        .join(" · ")}
      date={dateNode(item)}
      summary={slicedRichText(text(item, "summary"), fragment)}
      continuation={isContinuation(fragment)}
    />
  );
}

function ProjectEntry({
  item,
  entryId,
  fragment,
}: {
  item: ItemRecord;
  entryId: string;
  fragment?: BlockFragment;
}) {
  const keywords = keywordList(item);

  return (
    <EntryShell
      entryId={entryId}
      title={text(item, "name")}
      subtitle={[urlLabel(text(item, "url")), keywords.join(", ")]
        .filter(Boolean)
        .join(" · ")}
      date={dateNode(item)}
      summary={slicedRichText(text(item, "description"), fragment)}
      keepTogether
      continuation={isContinuation(fragment)}
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
  const category = text(item, "name").trim();

  return (
    <article className="resume-entry resume-entry-compact">
      {category !== "" ? (
        <div className="resume-entry-header resume-skill-heading">
          <h3 className="resume-entry-title">{category}</h3>
        </div>
      ) : null}
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
  entryId,
  fragment,
}: {
  doc: ResumeDocument;
  kind: GenericKind;
  item: ItemRecord;
  entryId: string;
  fragment?: BlockFragment;
}) {
  let title = "";
  let subtitle: ReactNode = "";
  let summary = "";
  let date: ReactNode = null;
  let aside: ReactNode = null;
  let extra: ReactNode = null;

  switch (kind) {
    case "profiles": {
      const network = text(item, "network").trim();
      const username = text(item, "username").trim();
      const url = text(item, "url").trim();

      title = network;

      if (username !== "" || url !== "") {
        subtitle = (
          <>
            {username !== "" ? username : null}
            {username !== "" && url !== "" ? " · " : null}
            {url !== "" ? <ResumeLink url={url} /> : null}
          </>
        );
      }
      break;
    }
    case "certifications": {
      const url = text(item, "url").trim();

      title = text(item, "name");
      subtitle = text(item, "issuer");
      if (text(item, "date").trim() !== "") {
        date = <DateRange start={text(item, "date")} end="" />;
      }
      if (url !== "") {
        extra = (
          <p className="resume-entry-extra">
            <ResumeLink url={url} />
          </p>
        );
      }
      break;
    }
    case "awards":
      title = text(item, "title");
      subtitle = text(item, "awarder");
      summary = slicedRichText(text(item, "summary"), fragment);
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
      summary = slicedRichText(text(item, "summary"), fragment);
      date = dateNode(item);
      break;
    case "publications": {
      const url = text(item, "url").trim();

      title = text(item, "title");
      subtitle = text(item, "publisher");
      summary = slicedRichText(text(item, "summary"), fragment);
      if (text(item, "date").trim() !== "") {
        date = <DateRange start={text(item, "date")} end="" />;
      }
      if (url !== "") {
        extra = (
          <p className="resume-entry-extra">
            <ResumeLink url={url} />
          </p>
        );
      }
      break;
    }
    case "references":
      title = text(item, "name");
      subtitle = [text(item, "position"), text(item, "company")]
        .filter(Boolean)
        .join(" · ");
      extra = [text(item, "phone"), text(item, "email")]
        .filter(Boolean)
        .join(" · ");
      extra = extra !== "" ? <p className="resume-entry-extra">{extra}</p> : null;
      summary = slicedRichText(text(item, "summary"), fragment);
      break;
    case "custom":
      title = text(item, "name");
      subtitle = [text(item, "location"), urlLabel(text(item, "url"))]
        .filter(Boolean)
        .join(" · ");
      summary = slicedRichText(text(item, "description"), fragment);
      if (text(item, "date").trim() !== "") {
        date = <DateRange start={text(item, "date")} end="" />;
      }
      break;
  }

  return (
    <EntryShell
      entryId={entryId}
      title={title}
      subtitle={subtitle}
      date={date}
      aside={aside}
      extra={extra}
      summary={summary}
      continuation={isContinuation(fragment)}
    />
  );
}

function renderItem(
  doc: ResumeDocument,
  kind: ListKind,
  item: ItemRecord,
  index: number,
  fragment?: BlockFragment,
): ReactNode {
  const id = itemId(item, index);
  let entry: ReactNode;

  switch (kind) {
    case "experience":
      entry = (
        <ExperienceEntry item={item} entryId={id} fragment={fragment} />
      );
      break;
    case "education":
      entry = <EducationEntry item={item} entryId={id} fragment={fragment} />;
      break;
    case "projects":
      entry = <ProjectEntry item={item} entryId={id} fragment={fragment} />;
      break;
    case "skills":
      entry = <SkillEntry doc={doc} item={item} />;
      break;
    default:
      entry = (
        <GenericEntry
          doc={doc}
          kind={kind}
          item={item}
          entryId={id}
          fragment={fragment}
        />
      );
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
  /**
   * A continuation block that resumes its section mid-page after a different
   * section. It carries no heading of its own, so the renderer supplies a
   * `(cont.)` heading; otherwise a spilled Studio Sidebar entry would read as
   * part of the section printed above it.
   */
  continuationHeading: boolean;
  /** Inclusive bullet range owned by this page for a split entry. */
  fragments: Record<string, BlockFragment>;
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

      if (block.fragment) {
        const current = last.fragments[block.fragment.entryId];

        last.fragments[block.fragment.entryId] = current
          ? {
              entryId: block.fragment.entryId,
              start: Math.min(current.start, block.fragment.start),
              end: Math.max(current.end, block.fragment.end),
            }
          : { ...block.fragment };
      }

      last.withHeading = last.withHeading || block.withHeading;
      continue;
    }

    const resolved = resolveSection(doc, block.sectionId);

    if (!resolved) {
      continue;
    }

    const previous = groups[groups.length - 1];

    groups.push({
      sectionId: block.sectionId,
      resolved,
      entryIds: block.entryIds ? [...block.entryIds] : null,
      withHeading: block.withHeading,
      continuationHeading:
        !block.withHeading &&
        previous !== undefined &&
        previous.sectionId !== block.sectionId,
      fragments: block.fragment
        ? { [block.fragment.entryId]: { ...block.fragment } }
        : {},
    });
  }

  return groups;
}

export function SectionRenderer({
  doc,
  pageSectionIds,
  scanHighlight = false,
}: {
  doc: ResumeDocument;
  pageSectionIds: string[];
  /** Preview-only 6-Second Scan: wraps numeric metrics at full contrast. */
  scanHighlight?: boolean;
}) {
  return (
    <ScanHighlightContext.Provider value={scanHighlight}>
      {groupBlocks(doc, pageSectionIds).map((group, sectionIndex) => {
        const { resolved } = group;
        const { config } = resolved;

        // Every visible profile already appears as a clickable link in the
        // header (and the ATS contact line), so the body section would only
        // repeat it. A URL-less row keeps the section so nothing disappears.
        if (
          group.sectionId === "profiles" &&
          resolved.kind === "profiles" &&
          profilesPromotedToHeader(resolved.items)
        ) {
          return null;
        }

        const hasSectionHeading =
          group.withHeading && config.showHeading && config.title.trim() !== "";
        // A continuation block that starts after a different section gets its
        // own `(cont.)` heading. A continuation that starts the page does not:
        // it reads as the natural overflow of the previous page's section.
        const headingText = hasSectionHeading
          ? config.title
          : group.continuationHeading &&
              config.showHeading &&
              config.title.trim() !== ""
            ? `${config.title} (cont.)`
            : null;
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
            aria-label={headingText ? undefined : config.title || undefined}
          >
            {headingText ? (
              <h2 className="resume-section-heading">{headingText}</h2>
            ) : null}
            {resolved.kind === "summary" ? (
              <div
                className="resume-rich-text"
                dangerouslySetInnerHTML={{
                  __html: richTextHtml(doc.summary.content, scanHighlight),
                }}
              />
            ) : (
              <div
                className="resume-section-items"
                style={
                  { "--section-columns": config.columns } as CSSProperties
                }
              >
                {resolved.kind === "experience" &&
                doc.sections.experience.groupSameCompany === true
                  ? renderExperienceItems(items)
                  : items.map((item, index) =>
                      renderItem(
                        doc,
                        resolved.kind,
                        item,
                        index,
                        group.fragments[itemId(item, index)],
                      ),
                    )}
              </div>
            )}
          </section>
        );
      })}
    </ScanHighlightContext.Provider>
  );
}
