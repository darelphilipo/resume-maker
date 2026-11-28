import type { TemplateDefinition } from "../registry";

/**
 * One compact label per template option. Single-column layouts advertise their
 * ATS safety; the two-column layout explains who it is best for instead.
 */
export function TemplateBadge({
  template,
}: {
  template: TemplateDefinition;
}) {
  const label = template.atsSafe ? "ATS-Safe" : template.badge;

  if (!label) {
    return null;
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        template.atsSafe
          ? "bg-primary/10 text-primary"
          : "bg-surface-muted text-muted"
      }`}
    >
      {label}
    </span>
  );
}
