import type { TemplateId } from "@/lib/schema/resume.schema";

/**
 * Root classes the real templates render. The measure layer must use the same
 * classes so variant spacing (for example Compact 1-Pager's tighter gaps) and
 * the Studio Sidebar's two-column grid apply to the measured DOM too. Keep this
 * in sync with `registry.ts`; `registry.test.tsx` renders every template and
 * asserts its root class matches this map.
 */
const TEMPLATE_ROOT_CLASS: Partial<Record<TemplateId, string>> = {
  onyx: "onyx",
  persian: "onyx onyx--ivy",
  bronzor: "onyx onyx--accent",
  chikorita: "onyx onyx--compact",
  azurill: "onyx onyx--skills-first",
  gengar: "onyx onyx--studio",
};

export function templateRootClassName(template: TemplateId): string {
  return TEMPLATE_ROOT_CLASS[template] ?? "onyx";
}
