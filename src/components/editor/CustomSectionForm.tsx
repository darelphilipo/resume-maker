"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { newId } from "@/lib/schema/defaults";
import type { CustomSection } from "@/lib/schema/resume.schema";
import { useResumeStore } from "@/lib/store/useResumeStore";

import { RichTextField } from "./RichTextField";
import {
  AddEntryButton,
  ClearSectionButton,
  EntryActions,
  EntryCard,
  FormActions,
  MonthSelect,
  TextInput,
} from "./SectionFormControls";
import { useDebouncedCommit } from "./useDebouncedCommit";

const customItemSchema = z.object({
  id: z.string().min(1),
  hidden: z.boolean(),
  name: z.string(),
  description: z.string(),
  date: z.string(),
  location: z.string(),
  url: z.string(),
});

const customSectionFormSchema = z.object({
  title: z.string(),
  items: z.array(customItemSchema),
});

type CustomSectionFormValues = z.infer<typeof customSectionFormSchema>;
type CustomItemFormValue = CustomSectionFormValues["items"][number];

function createEmptyItem(): CustomItemFormValue {
  return {
    id: newId(),
    hidden: false,
    name: "",
    description: "",
    date: "",
    location: "",
    url: "",
  };
}

function toFormValues(section: CustomSection | undefined): CustomSectionFormValues {
  if (!section) {
    return { title: "", items: [] };
  }

  return {
    title: section.title,
    items: section.items.map((item) => ({
      id: item.id,
      hidden: item.hidden,
      name: item.name,
      description: item.description,
      date: item.date ?? "",
      location: item.location ?? "",
      url: item.url ?? "",
    })),
  };
}

export function CustomSectionForm({ sectionId }: { sectionId: string }) {
  const section = useResumeStore((state) =>
    state.doc.customSections.find((candidate) => candidate.id === sectionId),
  );
  const customSections = useResumeStore((state) => state.doc.customSections);
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const values = useMemo(() => toFormValues(section), [section]);

  const form = useForm<CustomSectionFormValues>({
    defaultValues: values,
    values,
    mode: "onBlur",
    resolver: zodResolver(customSectionFormSchema),
  });
  const watched = useWatch({
    control: form.control,
    defaultValue: values,
  }) as typeof values;

  useDebouncedCommit(watched, (next) => {
    patchDoc({
      customSections: customSections.map((candidate) =>
        candidate.id === sectionId
          ? {
              ...candidate,
              title: next.title,
              items: next.items,
            }
          : candidate,
      ),
    });
  });

  function updateItem<K extends keyof CustomItemFormValue>(
    index: number,
    key: K,
    value: CustomItemFormValue[K],
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

  if (!section) {
    return null;
  }

  return (
    <form
      aria-label="Custom section"
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-3"
    >
      <TextInput
        id={`custom-${sectionId}-title`}
        label="Section title"
        value={watched.title}
        onChange={(value) =>
          form.setValue("title", value, { shouldDirty: true })
        }
        placeholder="Volunteering"
      />

      {watched.items.map((item, index) => (
        <EntryCard
          key={item.id}
          index={index}
          entryId={item.id}
          hidden={item.hidden}
        >
          <TextInput
            id={`custom-${sectionId}-${item.id}-name`}
            label="Name"
            value={item.name}
            onChange={(value) => updateItem(index, "name", value)}
            placeholder="Entry name"
          />
          <RichTextField
            value={item.description}
            onChange={(html) => updateItem(index, "description", html)}
            ariaLabel={`Description for entry ${index + 1}`}
            label="Description"
            placeholder="Describe this entry."
          />
          <MonthSelect
            id={`custom-${sectionId}-${item.id}-date`}
            label="Date"
            value={item.date}
            onChange={(value) => updateItem(index, "date", value)}
          />
          <TextInput
            id={`custom-${sectionId}-${item.id}-location`}
            label="Location"
            value={item.location}
            onChange={(value) => updateItem(index, "location", value)}
            placeholder="Remote"
          />
          <TextInput
            id={`custom-${sectionId}-${item.id}-url`}
            label="URL"
            type="url"
            inputMode="url"
            value={item.url}
            onChange={(value) => updateItem(index, "url", value)}
            placeholder="https://example.com"
          />
          <EntryActions
            index={index}
            total={watched.items.length}
            hidden={item.hidden}
            onToggleHidden={() => updateItem(index, "hidden", !item.hidden)}
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
