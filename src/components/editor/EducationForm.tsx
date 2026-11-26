"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import {
  dateRangeWarning,
  isNewestFirst,
  sortEntriesNewestFirst,
} from "@/lib/date/sortEntries";
import { newId } from "@/lib/schema/defaults";
import type { EducationItem } from "@/lib/schema/resume.schema";
import { useResumeStore } from "@/lib/store/useResumeStore";

import { RichTextField } from "./RichTextField";
import {
  AddEntryButton,
  ClearSectionButton,
  EntryActions,
  EntryCard,
  FormActions,
  MonthSelect,
  SortNewestFirstButton,
  TextInput,
} from "./SectionFormControls";
import { useDebouncedCommit } from "./useDebouncedCommit";

const educationItemSchema = z.object({
  id: z.string().min(1),
  hidden: z.boolean(),
  school: z.string(),
  degree: z.string(),
  area: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  grade: z.string(),
  summary: z.string(),
  current: z.boolean(),
});

const educationFormSchema = z.object({
  items: z.array(educationItemSchema),
});

type EducationFormValues = z.infer<typeof educationFormSchema>;
type EducationFormItem = EducationFormValues["items"][number];

function createEmptyItem(): EducationFormItem {
  return {
    id: newId(),
    hidden: false,
    school: "",
    degree: "",
    area: "",
    location: "",
    startDate: "",
    endDate: "",
    grade: "",
    summary: "",
    current: false,
  };
}

function toFormValues(items: EducationItem[]): EducationFormValues {
  return {
    items: items.map((item) => ({ ...item })),
  };
}

export function EducationForm() {
  const items = useResumeStore((state) => state.doc.sections.education.items);
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const values = useMemo(() => toFormValues(items), [items]);

  const form = useForm<EducationFormValues>({
    defaultValues: values,
    values,
    mode: "onBlur",
    resolver: zodResolver(educationFormSchema),
  });
  const watched = useWatch({
    control: form.control,
    defaultValue: values,
  }) as typeof values;

  useDebouncedCommit(watched, (next) => {
    patchDoc({
      sections: {
        education: {
          items: next.items,
        },
      },
    });
  });

  function updateItem<K extends keyof EducationFormItem>(
    index: number,
    key: K,
    value: EducationFormItem[K],
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

  function sortNewestFirst(): void {
    form.setValue("items", sortEntriesNewestFirst(form.getValues("items")), {
      shouldDirty: true,
    });
  }

  const showSortButton =
    watched.items.length > 1 && !isNewestFirst(watched.items);

  return (
    <form
      aria-label="Education"
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-3"
    >
      {showSortButton ? (
        <div className="flex justify-end">
          <SortNewestFirstButton onClick={sortNewestFirst} />
        </div>
      ) : null}
      {watched.items.map((item, index) => (
        <EntryCard
          key={item.id}
          index={index}
          entryId={item.id}
          hidden={item.hidden}
        >
          <TextInput
            id={`education-${item.id}-school`}
            label="School"
            value={item.school}
            onChange={(value) => updateItem(index, "school", value)}
            autoComplete="organization"
            placeholder="University of Example"
          />
          <TextInput
            id={`education-${item.id}-degree`}
            label="Degree"
            value={item.degree}
            onChange={(value) => updateItem(index, "degree", value)}
            placeholder="BSc"
          />
          <TextInput
            id={`education-${item.id}-area`}
            label="Field"
            value={item.area}
            onChange={(value) => updateItem(index, "area", value)}
            placeholder="Computer science"
          />
          <TextInput
            id={`education-${item.id}-location`}
            label="Location"
            value={item.location}
            onChange={(value) => updateItem(index, "location", value)}
            autoComplete="address-level2"
            placeholder="City, Country"
          />
          <div className="grid gap-3">
            <MonthSelect
              id={`education-${item.id}-start-date`}
              label="Start date"
              value={item.startDate}
              onChange={(value) => updateItem(index, "startDate", value)}
            />
            <MonthSelect
              id={`education-${item.id}-end-date`}
              label="End date"
              value={item.endDate}
              onChange={(value) => updateItem(index, "endDate", value)}
              warning={
                dateRangeWarning(item.startDate, item.endDate, item.current) ??
                undefined
              }
              present={item.current}
              onPresentChange={(checked) =>
                updateItem(index, "current", checked)
              }
            />
          </div>
          <TextInput
            id={`education-${item.id}-grade`}
            label="Grade"
            value={item.grade}
            onChange={(value) => updateItem(index, "grade", value)}
            placeholder="3.8 GPA / 8.5 CGPA"
          />
          <RichTextField
            value={item.summary}
            onChange={(html) => updateItem(index, "summary", html)}
            ariaLabel={`Description for entry ${index + 1}`}
            label="Summary"
            placeholder="Thesis, honours, or relevant coursework"
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
