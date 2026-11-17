"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { newId } from "@/lib/schema/defaults";
import type { ProjectItem } from "@/lib/schema/resume.schema";
import { useResumeStore } from "@/lib/store/useResumeStore";

import { RichTextField } from "./RichTextField";
import { formatKeywords, parseKeywords } from "./keywords";
import {
  AddEntryButton,
  BooleanInput,
  ClearSectionButton,
  EntryActions,
  EntryCard,
  FormActions,
  MonthSelect,
  TextInput,
} from "./SectionFormControls";
import { useDebouncedCommit } from "./useDebouncedCommit";

const projectItemSchema = z.object({
  id: z.string().min(1),
  hidden: z.boolean(),
  name: z.string(),
  description: z.string(),
  url: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  keywords: z.string(),
});

const projectsFormSchema = z.object({
  items: z.array(projectItemSchema),
});

type ProjectsFormValues = z.infer<typeof projectsFormSchema>;
type ProjectsFormItem = ProjectsFormValues["items"][number];

function createEmptyItem(): ProjectsFormItem {
  return {
    id: newId(),
    hidden: false,
    name: "",
    description: "",
    url: "",
    startDate: "",
    endDate: "",
    keywords: "",
  };
}

function toFormValues(items: ProjectItem[]): ProjectsFormValues {
  return {
    items: items.map((item) => ({
      id: item.id,
      hidden: item.hidden,
      name: item.name,
      description: item.description,
      url: item.url,
      startDate: item.startDate,
      endDate: item.endDate,
      keywords: formatKeywords(item.keywords),
    })),
  };
}

export function ProjectsForm() {
  const items = useResumeStore((state) => state.doc.sections.projects.items);
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const values = useMemo(() => toFormValues(items), [items]);

  const form = useForm<ProjectsFormValues>({
    defaultValues: values,
    values,
    mode: "onBlur",
    resolver: zodResolver(projectsFormSchema),
  });
  const watched = useWatch({
    control: form.control,
    defaultValue: values,
  }) as typeof values;

  useDebouncedCommit(watched, (next) => {
    patchDoc({
      sections: {
        projects: {
          items: next.items.map((item) => ({
            id: item.id,
            hidden: item.hidden,
            name: item.name,
            description: item.description,
            url: item.url,
            startDate: item.startDate,
            endDate: item.endDate,
            keywords: parseKeywords(item.keywords),
          })),
        },
      },
    });
  });

  function updateItem<K extends keyof ProjectsFormItem>(
    index: number,
    key: K,
    value: ProjectsFormItem[K],
  ): void {
    const next = form
      .getValues("items")
      .map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      );

    form.setValue("items", next, { shouldDirty: true });
  }

  function moveItem(index: number, direction: -1 | 1): void {
    const next = [...form.getValues("items")];
    const target = index + direction;

    if (target < 0 || target >= next.length) {
      return;
    }

    const current = next[index];
    next[index] = next[target];
    next[target] = current;
    form.setValue("items", next, { shouldDirty: true });
  }

  function deleteItem(index: number): void {
    const next = form
      .getValues("items")
      .filter((_, itemIndex) => itemIndex !== index);
    form.setValue("items", next, { shouldDirty: true });
  }

  function addItem(): void {
    form.setValue("items", [...form.getValues("items"), createEmptyItem()], {
      shouldDirty: true,
    });
  }

  function clearItems(): void {
    form.setValue("items", [], { shouldDirty: true });
  }

  return (
    <form
      aria-label="Projects"
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-3"
    >
      {watched.items.map((item, index) => (
        <EntryCard key={item.id} index={index}>
          <TextInput
            id={`projects-${item.id}-name`}
            label="Name"
            value={item.name}
            onChange={(value) => updateItem(index, "name", value)}
            placeholder="Resume builder"
          />
          <RichTextField
            value={item.description}
            onChange={(html) => updateItem(index, "description", html)}
            ariaLabel={`Description for entry ${index + 1}`}
            placeholder="What the project does and your role"
            actionHelpers
          />
          <TextInput
            id={`projects-${item.id}-url`}
            label="Project URL"
            type="url"
            inputMode="url"
            value={item.url}
            onChange={(value) => updateItem(index, "url", value)}
            placeholder="https://example.com/project"
          />
          <TextInput
            id={`projects-${item.id}-keywords`}
            label="Keywords"
            value={item.keywords}
            onChange={(value) => updateItem(index, "keywords", value)}
            placeholder="TypeScript, accessibility"
            hint="Separate keywords with commas."
          />
          <div className="grid gap-3">
            <MonthSelect
              id={`projects-${item.id}-start-date`}
              label="Start date"
              value={item.startDate}
              onChange={(value) => updateItem(index, "startDate", value)}
            />
            <MonthSelect
              id={`projects-${item.id}-end-date`}
              label="End date"
              value={item.endDate}
              onChange={(value) => updateItem(index, "endDate", value)}
            />
          </div>
          <BooleanInput
            id={`projects-${item.id}-hidden`}
            label="Hide entry"
            checked={item.hidden}
            onChange={(checked) => updateItem(index, "hidden", checked)}
          />
          <EntryActions
            index={index}
            total={watched.items.length}
            onMoveUp={() => moveItem(index, -1)}
            onMoveDown={() => moveItem(index, 1)}
            onDelete={() => deleteItem(index)}
          />
        </EntryCard>
      ))}

      <FormActions>
        <AddEntryButton onClick={addItem} />
        <ClearSectionButton
          disabled={watched.items.length === 0}
          onClick={clearItems}
        />
      </FormActions>
    </form>
  );
}
