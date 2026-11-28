import type { ReactNode } from "react";

import type { TemplateId } from "@/lib/schema/resume.schema";

/**
 * Tiny, dependency-free wireframes that make the six template choices
 * distinguishable at a glance. They are decorative only: the real radio input
 * and the card copy carry the accessible name, so every SVG stays
 * `aria-hidden` and adds no external image request or layout shift.
 */
const INK = "#8b96a3";
const BODY = "#d8d3c9";
const ACCENT = "var(--brand-primary, #1b3a57)";

type Thumbnail = {
  layout: string;
  content: ReactNode;
};

const THUMBNAILS: Record<TemplateId, Thumbnail> = {
  onyx: {
    layout: "single-column",
    content: (
      <>
        <rect x="5" y="6" width="16" height="3" rx="1" fill={INK} />
        <rect x="5" y="11" width="27" height="1" fill={BODY} />
        <rect x="5" y="16" width="9" height="1.5" fill={INK} />
        <rect x="5" y="19.5" width="30" height="1" fill={BODY} />
        <rect x="5" y="22" width="28" height="1" fill={BODY} />
        <rect x="5" y="28" width="9" height="1.5" fill={INK} />
        <rect x="5" y="31.5" width="30" height="1" fill={BODY} />
        <rect x="5" y="34" width="26" height="1" fill={BODY} />
        <rect x="5" y="40" width="9" height="1.5" fill={INK} />
        <rect x="5" y="43.5" width="30" height="1" fill={BODY} />
        <rect x="5" y="46" width="24" height="1" fill={BODY} />
      </>
    ),
  },
  persian: {
    layout: "centered-header",
    content: (
      <>
        <rect x="11" y="6" width="18" height="3" rx="1" fill={INK} />
        <rect x="13" y="11" width="14" height="1" fill={BODY} />
        <rect x="8" y="15" width="24" height="0.8" fill={INK} />
        <rect x="5" y="19" width="9" height="1.5" fill={INK} />
        <rect x="5" y="22.5" width="30" height="1" fill={BODY} />
        <rect x="5" y="25" width="27" height="1" fill={BODY} />
        <rect x="5" y="31" width="9" height="1.5" fill={INK} />
        <rect x="5" y="34.5" width="30" height="1" fill={BODY} />
        <rect x="5" y="37" width="26" height="1" fill={BODY} />
        <rect x="5" y="43" width="9" height="1.5" fill={INK} />
        <rect x="5" y="46.5" width="30" height="1" fill={BODY} />
        <rect x="5" y="49" width="20" height="1" fill={BODY} />
      </>
    ),
  },
  bronzor: {
    layout: "accent-rule",
    content: (
      <>
        <rect x="5" y="6" width="18" height="3.5" rx="1" fill={ACCENT} />
        <rect x="5" y="11.5" width="30" height="1.2" fill={ACCENT} />
        <rect x="5" y="16" width="9" height="1.5" fill={ACCENT} />
        <rect x="5" y="19.5" width="30" height="1" fill={BODY} />
        <rect x="5" y="22" width="28" height="1" fill={BODY} />
        <rect x="5" y="28" width="9" height="1.5" fill={ACCENT} />
        <rect x="5" y="31.5" width="30" height="1" fill={BODY} />
        <rect x="5" y="34" width="26" height="1" fill={BODY} />
        <rect x="5" y="40" width="9" height="1.5" fill={ACCENT} />
        <rect x="5" y="43.5" width="30" height="1" fill={BODY} />
        <rect x="5" y="46" width="24" height="1" fill={BODY} />
      </>
    ),
  },
  chikorita: {
    layout: "dense",
    content: (
      <>
        <rect x="5" y="5.5" width="14" height="2.5" rx="1" fill={INK} />
        <rect x="5" y="9.5" width="24" height="1" fill={BODY} />
        <rect x="5" y="13" width="30" height="1" fill={BODY} />
        <rect x="5" y="16.3" width="28" height="1" fill={BODY} />
        <rect x="5" y="19.6" width="30" height="1" fill={BODY} />
        <rect x="5" y="22.9" width="26" height="1" fill={BODY} />
        <rect x="5" y="26.2" width="30" height="1" fill={BODY} />
        <rect x="5" y="29.5" width="24" height="1" fill={BODY} />
        <rect x="5" y="32.8" width="30" height="1" fill={BODY} />
        <rect x="5" y="36.1" width="28" height="1" fill={BODY} />
        <rect x="5" y="39.4" width="30" height="1" fill={BODY} />
        <rect x="5" y="42.7" width="25" height="1" fill={BODY} />
        <rect x="5" y="46" width="30" height="1" fill={BODY} />
        <rect x="5" y="49.3" width="22" height="1" fill={BODY} />
      </>
    ),
  },
  azurill: {
    layout: "skills-box",
    content: (
      <>
        <rect x="5" y="5.5" width="16" height="2.5" rx="1" fill={INK} />
        <rect x="5" y="9.5" width="24" height="1" fill={BODY} />
        <rect
          x="5"
          y="13"
          width="30"
          height="12"
          rx="1.5"
          fill={ACCENT}
          fillOpacity="0.08"
          stroke={ACCENT}
          strokeWidth="0.8"
        />
        <rect x="7" y="15.5" width="11" height="1.6" rx="0.8" fill={ACCENT} />
        <rect x="19.5" y="15.5" width="8" height="1.6" rx="0.8" fill={ACCENT} />
        <rect x="7" y="19" width="8" height="1.6" rx="0.8" fill={ACCENT} />
        <rect x="16.5" y="19" width="12" height="1.6" rx="0.8" fill={ACCENT} />
        <rect x="7" y="22.5" width="12" height="1.6" rx="0.8" fill={ACCENT} />
        <rect x="20.5" y="22.5" width="7" height="1.6" rx="0.8" fill={ACCENT} />
        <rect x="5" y="29" width="9" height="1.5" fill={INK} />
        <rect x="5" y="32.5" width="30" height="1" fill={BODY} />
        <rect x="5" y="35" width="26" height="1" fill={BODY} />
        <rect x="5" y="41" width="9" height="1.5" fill={INK} />
        <rect x="5" y="44.5" width="30" height="1" fill={BODY} />
        <rect x="5" y="47" width="22" height="1" fill={BODY} />
      </>
    ),
  },
  gengar: {
    layout: "two-column",
    content: (
      <>
        <rect x="5" y="6" width="18" height="2.5" rx="1" fill={INK} />
        <rect x="5" y="10" width="16" height="1" fill={BODY} />
        <rect x="25.5" y="5.5" width="0.8" height="43" fill={BODY} />
        <rect
          x="27.5"
          y="8"
          width="7.5"
          height="38"
          rx="1"
          fill={BODY}
          fillOpacity="0.5"
        />
        <rect x="29" y="11" width="4.5" height="1" fill={INK} />
        <rect x="29" y="14" width="3.5" height="1" fill={BODY} />
        <rect x="29" y="17" width="4.5" height="1" fill={BODY} />
        <rect x="29" y="23" width="4" height="1" fill={INK} />
        <rect x="29" y="26" width="3.5" height="1" fill={BODY} />
        <rect x="29" y="29" width="4.5" height="1" fill={BODY} />
        <rect x="29" y="35" width="4" height="1" fill={INK} />
        <rect x="29" y="38" width="3.5" height="1" fill={BODY} />
        <rect x="5" y="15" width="9" height="1.5" fill={INK} />
        <rect x="5" y="18.5" width="17" height="1" fill={BODY} />
        <rect x="5" y="21" width="15" height="1" fill={BODY} />
        <rect x="5" y="27" width="9" height="1.5" fill={INK} />
        <rect x="5" y="30.5" width="17" height="1" fill={BODY} />
        <rect x="5" y="33" width="13" height="1" fill={BODY} />
        <rect x="5" y="39" width="9" height="1.5" fill={INK} />
        <rect x="5" y="42.5" width="17" height="1" fill={BODY} />
        <rect x="5" y="45" width="14" height="1" fill={BODY} />
      </>
    ),
  },
};

export function TemplateThumbnail({ id }: { id: TemplateId }) {
  const thumbnail = THUMBNAILS[id];

  return (
    <svg
      viewBox="0 0 40 54"
      width={40}
      height={54}
      aria-hidden="true"
      focusable="false"
      data-template-thumb={id}
      data-thumb-layout={thumbnail.layout}
      className="h-[54px] w-10 shrink-0 rounded-[3px] border border-line bg-white"
    >
      {thumbnail.content}
    </svg>
  );
}
