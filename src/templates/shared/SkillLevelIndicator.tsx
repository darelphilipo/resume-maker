import type { ResumeMetadata } from "@/lib/schema/resume.schema";

type LevelType = ResumeMetadata["design"]["levelType"];

export function SkillLevelIndicator({
  level,
  type,
}: {
  level: number;
  type: LevelType;
}) {
  if (type === "hidden") {
    return null;
  }

  const safeLevel = Math.max(0, Math.min(5, Math.round(level)));
  const label = `Proficiency ${safeLevel} of 5`;

  if (type === "progress-bar") {
    return (
      <span
        role="img"
        aria-label={label}
        className="skill-level skill-level-progress"
        style={{
          display: "inline-flex",
          width: "42pt",
          height: "4pt",
          overflow: "hidden",
          borderRadius: "999px",
          backgroundColor:
            "color-mix(in srgb, var(--brand-primary, #1f2937) 18%, transparent)",
        }}
      >
        <span
          className="skill-level-progress-bar"
          aria-hidden="true"
          style={{
            display: "block",
            height: "100%",
            width: `${(safeLevel / 5) * 100}%`,
            borderRadius: "inherit",
            backgroundColor: "var(--brand-primary, #1f2937)",
          }}
        />
      </span>
    );
  }

  const isCircle = type === "circle";

  return (
    <span
      role="img"
      aria-label={label}
      className={`skill-level skill-level-${type}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "2pt",
      }}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const filled = index < safeLevel;

        return (
          <span
            key={index}
            aria-hidden="true"
            className={`${isCircle ? "skill-level-dot" : "skill-level-bar"}${filled ? " filled" : ""}`}
            style={{
              display: "block",
              width: isCircle ? "5pt" : "7pt",
              height: isCircle ? "5pt" : "3pt",
              borderRadius: isCircle ? "50%" : "1pt",
              backgroundColor: isCircle
                ? filled
                  ? "var(--brand-primary, #1f2937)"
                  : "transparent"
                : filled
                  ? "var(--brand-primary, #1f2937)"
                  : "color-mix(in srgb, var(--brand-primary, #1f2937) 20%, transparent)",
              border: isCircle
                ? "1px solid var(--brand-primary, #1f2937)"
                : undefined,
            }}
          />
        );
      })}
    </span>
  );
}
