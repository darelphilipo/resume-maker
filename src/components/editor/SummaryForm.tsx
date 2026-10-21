"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useResumeStore } from "@/lib/store/useResumeStore";

import { RichTextField } from "./RichTextField";
import {
  ClearSectionButton,
  FormActions,
} from "./SectionFormControls";
import { useDebouncedCommit } from "./useDebouncedCommit";

const summaryFormSchema = z.object({
  content: z.string(),
});

type SummaryFormValues = z.infer<typeof summaryFormSchema>;

function isRichTextEmpty(html: string): boolean {
  return (
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .trim() === ""
  );
}

export function SummaryForm() {
  const content = useResumeStore((state) => state.doc.summary.content);
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const values = useMemo(() => ({ content }), [content]);

  const form = useForm<SummaryFormValues>({
    defaultValues: values,
    values,
    mode: "onBlur",
    resolver: zodResolver(summaryFormSchema),
  });
  const watched = useWatch({
    control: form.control,
    defaultValue: values,
  }) as typeof values;

  useDebouncedCommit(watched, (next) => {
    patchDoc({ summary: { content: next.content } });
  });

  return (
    <form
      aria-label="Summary"
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-3"
    >
      <RichTextField
        value={watched.content}
        onChange={(html) =>
          form.setValue("content", html, { shouldDirty: true })
        }
        ariaLabel="Summary"
        placeholder="A short professional summary."
      />
      <FormActions>
        <ClearSectionButton
          disabled={isRichTextEmpty(watched.content)}
          onClick={() => form.setValue("content", "", { shouldDirty: true })}
        />
      </FormActions>
    </form>
  );
}
