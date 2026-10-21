import {
  DEFAULT_SECTION_ORDER,
  ResumeDocumentSchema,
  type ResumeDocument,
  type TemplateId,
} from "./resume.schema";

export function newId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyResume(template: TemplateId = "onyx"): ResumeDocument {
  const base = ResumeDocumentSchema.parse({});

  return {
    ...base,
    metadata: {
      ...base.metadata,
      template,
      layout: {
        ...base.metadata.layout,
        pages: [
          {
            fullWidth: false,
            main: [...DEFAULT_SECTION_ORDER],
            sidebar: [],
          },
        ],
      },
    },
  };
}
