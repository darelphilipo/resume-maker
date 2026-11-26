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
import type { ExperienceItem } from "@/lib/schema/resume.schema";
import { useResumeStore } from "@/lib/store/useResumeStore";

import { RichTextField } from "./RichTextField";
import {
  AddEntryButton,
  BooleanInput,
  ClearSectionButton,
  EntryActions,
  EntryCard,
  FormActions,
  MonthSelect,
  SortNewestFirstButton,
  TextInput,
} from "./SectionFormControls";
import { useDebouncedCommit } from "./useDebouncedCommit";

const experienceItemSchema = z.object({
  id: z.string().min(1),
  hidden: z.boolean(),
  company: z.string(),
  position: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  current: z.boolean(),
  summary: z.string(),
});

const experienceFormSchema = z.object({
  items: z.array(experienceItemSchema),
});

type ExperienceFormValues = z.infer<typeof experienceFormSchema>;
type ExperienceFormItem = ExperienceFormValues["items"][number];

function createEmptyItem(): ExperienceFormItem {
  return {
    id: newId(),
    hidden: false,
    company: "",
    position: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    summary: "",
  };
}

function toFormValues(items: ExperienceItem[]): ExperienceFormValues {
  return {
    items: items.map((item) => ({ ...item })),
  };
}

export function ExperienceForm() {
  const items = useResumeStore((state) => state.doc.sections.experience.items);
  const groupSameCompany = useResumeStore(
    (state) => state.doc.sections.experience.groupSameCompany === true,
  );
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const values = useMemo(() => toFormValues(items), [items]);

  const form = useForm<ExperienceFormValues>({
    defaultValues: values,
    values,
    mode: "onBlur",
    resolver: zodResolver(experienceFormSchema),
  });
  const watched = useWatch({
    control: form.control,
    defaultValue: values,
  }) as typeof values;

  useDebouncedCommit(watched, (next) => {
    patchDoc({
      sections: {
        experience: {
          items: next.items,
        },
      },
    });
  });

  function updateItem<K extends keyof ExperienceFormItem>(
    index: number,
    key: K,
    value: ExperienceFormItem[K],
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

  function setGroupSameCompany(next: boolean): void {
    patchDoc({
      sections: {
        experience: {
          groupSameCompany: next,
        },
      },
    });
  }

  const showSortButton =
    watched.items.length > 1 && !isNewestFirst(watched.items);

  return (
    <form
      aria-label="Experience"
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-3"
    >
      <div className="rounded-xl border border-line bg-surface p-3">
        <BooleanInput
          id="experience-group-same-company"
          label="Group promotions at the same company"
          checked={groupSameCompany}
          onChange={setGroupSameCompany}
        />
        <p className="pl-7 text-xs text-muted">
          Consecutive roles at one employer share a company and combined date
          header.
        </p>
      </div>
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
            id={`experience-${item.id}-company`}
            label="Company"
            value={item.company}
            onChange={(value) => updateItem(index, "company", value)}
            autoComplete="organization"
            placeholder="Acme"
          />
          <TextInput
            id={`experience-${item.id}-position`}
            label="Position"
            value={item.position}
            onChange={(value) => updateItem(index, "position", value)}
            autoComplete="organization-title"
            placeholder="Software engineer"
          />
          <TextInput
            id={`experience-${item.id}-location`}
            label="Location"
            value={item.location}
            onChange={(value) => updateItem(index, "location", value)}
            autoComplete="address-level2"
            placeholder="Remote"
          />
          <div className="grid gap-3">
            <MonthSelect
              id={`experience-${item.id}-start-date`}
              label="Start date"
              value={item.startDate}
              onChange={(value) => updateItem(index, "startDate", value)}
            />
            <MonthSelect
              id={`experience-${item.id}-end-date`}
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
          <RichTextField
            value={item.summary}
            onChange={(html) => updateItem(index, "summary", html)}
            ariaLabel={`Description for entry ${index + 1}`}
            placeholder="What did you build and what changed?"
            actionHelpers
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
          count={watched.items.length}
          disabled={watched.items.length === 0}
          onClick={clearItems}
        />
      </FormActions>
    </form>
  );
}
