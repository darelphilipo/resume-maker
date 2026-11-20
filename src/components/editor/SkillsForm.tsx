"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { newId } from "@/lib/schema/defaults";
import type { SkillItem } from "@/lib/schema/resume.schema";
import { useResumeStore } from "@/lib/store/useResumeStore";

import { formatKeywords, parseKeywords } from "./keywords";
import {
  AddEntryButton,
  ClearSectionButton,
  EntryActions,
  EntryCard,
  FormActions,
  TextInput,
} from "./SectionFormControls";
import { useDebouncedCommit } from "./useDebouncedCommit";

const skillItemSchema = z.object({
  id: z.string().min(1),
  hidden: z.boolean(),
  name: z.string(),
  level: z.number().int().min(0).max(5),
  keywords: z.string(),
});

const skillsFormSchema = z.object({
  items: z.array(skillItemSchema),
});

type SkillsFormValues = z.infer<typeof skillsFormSchema>;
type SkillsFormItem = SkillsFormValues["items"][number];

function createEmptyItem(): SkillsFormItem {
  return {
    id: newId(),
    hidden: false,
    name: "",
    level: 0,
    keywords: "",
  };
}

function toFormValues(items: SkillItem[]): SkillsFormValues {
  return {
    items: items.map((item) => ({
      id: item.id,
      hidden: item.hidden,
      name: item.name,
      level: item.level,
      keywords: formatKeywords(item.keywords),
    })),
  };
}

export function SkillsForm() {
  const items = useResumeStore((state) => state.doc.sections.skills.items);
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const values = useMemo(() => toFormValues(items), [items]);

  const form = useForm<SkillsFormValues>({
    defaultValues: values,
    values,
    mode: "onBlur",
    resolver: zodResolver(skillsFormSchema),
  });
  const watched = useWatch({
    control: form.control,
    defaultValue: values,
  }) as typeof values;

  useDebouncedCommit(watched, (next) => {
    patchDoc({
      sections: {
        skills: {
          items: next.items.map((item) => ({
            id: item.id,
            hidden: item.hidden,
            name: item.name,
            level: item.level,
            keywords: parseKeywords(item.keywords),
          })),
        },
      },
    });
  });

  function updateItem<K extends keyof SkillsFormItem>(
    index: number,
    key: K,
    value: SkillsFormItem[K],
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
      aria-label="Skills"
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-3"
    >
      {watched.items.map((item, index) => (
        <EntryCard key={item.id} index={index} hidden={item.hidden}>
          <TextInput
            id={`skills-${item.id}-name`}
            label="Category"
            value={item.name}
            onChange={(value) => updateItem(index, "name", value)}
            placeholder="Languages"
            hint="Group related skills under one heading."
          />
          <TextInput
            id={`skills-${item.id}-keywords`}
            label="Keywords"
            value={item.keywords}
            onChange={(value) => updateItem(index, "keywords", value)}
            placeholder="Python, SQL, TypeScript"
            hint="Separate keywords with commas."
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
