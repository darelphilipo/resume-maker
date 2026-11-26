"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { detectProfileLink } from "@/lib/links/contactLinks";
import { newId } from "@/lib/schema/defaults";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import {
  useResumeStore,
  type DeepPartial,
} from "@/lib/store/useResumeStore";

import { RichTextField } from "./RichTextField";
import { formatKeywords, parseKeywords } from "./keywords";
import {
  AddEntryButton,
  BooleanInput,
  ClearSectionButton,
  EntryActions,
  EntryCard,
  FormActions,
  LevelInput,
  MonthSelect,
  TextInput,
} from "./SectionFormControls";
import {
  GENERIC_SECTION_FIELDS,
  type GenericSectionId,
  type SectionFieldDescriptor,
} from "./sectionFields";
import { useDebouncedCommit } from "./useDebouncedCommit";

type GenericFormValue = string | number | boolean;
type GenericFormItem = Record<string, GenericFormValue>;
type GenericFormValues = { items: GenericFormItem[] };

const genericFormSchema = z.object({
  items: z.array(
    z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean()]),
    ),
  ),
});

function stringValue(value: GenericFormValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: GenericFormValue | undefined): number {
  return typeof value === "number" ? value : 0;
}

function booleanValue(value: GenericFormValue | undefined): boolean {
  return value === true;
}

/**
 * A field still holds whatever we derived from the previous URL, so it is safe
 * to replace. Anything the user typed by hand is left alone.
 */
function isDerivedValue(
  current: string,
  previousAutoValue: string | undefined,
): boolean {
  return (
    current.trim() === "" ||
    (previousAutoValue !== undefined && current === previousAutoValue)
  );
}

function applyProfileLinkDetection(
  previous: GenericFormItem,
  next: GenericFormItem,
): GenericFormItem {
  const detected = detectProfileLink(stringValue(next.url));

  if (!detected) {
    return next;
  }

  const previousDetection = detectProfileLink(stringValue(previous.url));
  const result: GenericFormItem = { ...next, icon: detected.icon };

  if (
    detected.network !== "" &&
    isDerivedValue(
      stringValue(previous.network),
      previousDetection?.network,
    )
  ) {
    result.network = detected.network;
  }

  if (
    isDerivedValue(
      stringValue(previous.username),
      previousDetection?.username,
    )
  ) {
    result.username = detected.username;
  }

  return result;
}

function createEmptyItem(
  fields: readonly SectionFieldDescriptor[],
): GenericFormItem {
  const item: GenericFormItem = {
    id: newId(),
    hidden: false,
  };

  for (const field of fields) {
    if (field.kind === "boolean") {
      item[field.key] = false;
    } else if (field.kind === "level") {
      item[field.key] = 0;
    } else {
      item[field.key] = "";
    }
  }

  return item;
}

function toFormValues(
  items: readonly unknown[],
  fields: readonly SectionFieldDescriptor[],
): GenericFormValues {
  return {
    items: items.map((item) => {
      const record =
        typeof item === "object" && item !== null
          ? (item as Record<string, unknown>)
          : {};
      const next: GenericFormItem = {
        id: typeof record.id === "string" ? record.id : newId(),
        hidden: record.hidden === true,
      };

      for (const field of fields) {
        const value = record[field.key];

        if (field.kind === "boolean") {
          next[field.key] = value === true;
        } else if (field.kind === "level") {
          next[field.key] = typeof value === "number" ? value : 0;
        } else if (field.kind === "keywords") {
          next[field.key] = Array.isArray(value)
            ? formatKeywords(
                value.filter(
                  (keyword): keyword is string => typeof keyword === "string",
                ),
              )
            : "";
        } else {
          next[field.key] = typeof value === "string" ? value : "";
        }
      }

      return next;
    }),
  };
}

function toStoreItems(
  items: GenericFormItem[],
  fields: readonly SectionFieldDescriptor[],
): Record<string, unknown>[] {
  return items.map((item) => {
    const next: Record<string, unknown> = {
      id: stringValue(item.id),
      hidden: booleanValue(item.hidden),
    };

    for (const field of fields) {
      const value = item[field.key];

      if (field.kind === "keywords") {
        next[field.key] = parseKeywords(stringValue(value));
      } else if (field.kind === "level") {
        next[field.key] = numberValue(value);
      } else if (field.kind === "boolean") {
        next[field.key] = booleanValue(value);
      } else {
        next[field.key] = stringValue(value);
      }
    }

    return next;
  });
}

export function GenericSectionForm({
  sectionId,
}: {
  sectionId: GenericSectionId;
}) {
  const fields = GENERIC_SECTION_FIELDS[sectionId];
  const items = useResumeStore(
    (state) => state.doc.sections[sectionId].items,
  ) as unknown[];
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const values = useMemo(() => toFormValues(items, fields), [items, fields]);

  const form = useForm<GenericFormValues>({
    defaultValues: values,
    values,
    mode: "onBlur",
    resolver: zodResolver(genericFormSchema),
  });
  const watched = useWatch({
    control: form.control,
    defaultValue: values,
  }) as typeof values;

  useDebouncedCommit(watched, (next) => {
    const sectionItems = toStoreItems(next.items, fields);
    const patch = {
      sections: {
        [sectionId]: {
          items: sectionItems,
        },
      },
    } as unknown as DeepPartial<ResumeDocument>;

    patchDoc(patch);
  });

  function updateItem(
    index: number,
    key: string,
    value: GenericFormValue,
  ): void {
    const items = form.getValues("items");
    const previous = items[index];

    if (!previous) {
      return;
    }

    const updated = { ...previous, [key]: value };
    const nextItem =
      sectionId === "profiles" && key === "url"
        ? applyProfileLinkDetection(previous, updated)
        : updated;
    const next = items.map((item, itemIndex) =>
      itemIndex === index ? nextItem : item,
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
    form.setValue("items", [...form.getValues("items"), createEmptyItem(fields)], {
      shouldDirty: true,
    });
  }

  function clearItems(): void {
    form.setValue("items", [], { shouldDirty: true });
  }

  function renderField(
    item: GenericFormItem,
    index: number,
    field: SectionFieldDescriptor,
  ) {
    if (field.hidden) {
      return null;
    }

    const id = `${sectionId}-${stringValue(item.id)}-${field.key}`;

    if (field.kind === "rich") {
      return (
        <RichTextField
          key={field.key}
          value={stringValue(item[field.key])}
          onChange={(html) => updateItem(index, field.key, html)}
          ariaLabel={`${field.label} for entry ${index + 1}`}
          label={field.label}
          placeholder={field.placeholder}
        />
      );
    }

    if (field.kind === "level") {
      return (
        <LevelInput
          key={field.key}
          id={id}
          label={field.label}
          value={numberValue(item[field.key])}
          onChange={(value) => updateItem(index, field.key, value)}
        />
      );
    }

    if (field.kind === "month") {
      const pairsWithPresent = fields.some(
        (candidate) => candidate.kind === "boolean" && candidate.key === "current",
      );

      return (
        <MonthSelect
          key={field.key}
          id={id}
          label={field.label}
          value={stringValue(item[field.key])}
          onChange={(value) => updateItem(index, field.key, value)}
          present={
            pairsWithPresent && field.key === "endDate"
              ? booleanValue(item.current)
              : undefined
          }
          onPresentChange={
            pairsWithPresent && field.key === "endDate"
              ? (checked) => updateItem(index, "current", checked)
              : undefined
          }
        />
      );
    }

    if (field.kind === "boolean") {
      // End dates own the Present toggle (see the month branch above), so the
      // separate `current` checkbox would be a duplicate.
      if (
        field.key === "current" &&
        fields.some(
          (candidate) => candidate.kind === "month" && candidate.key === "endDate",
        )
      ) {
        return null;
      }

      return (
        <BooleanInput
          key={field.key}
          id={id}
          label={field.label}
          checked={booleanValue(item[field.key])}
          onChange={(value) => updateItem(index, field.key, value)}
        />
      );
    }

    return (
      <TextInput
        key={field.key}
        id={id}
        label={field.label}
        value={stringValue(item[field.key])}
        onChange={(value) => updateItem(index, field.key, value)}
        type={
          field.kind === "email" || field.kind === "tel" || field.kind === "url"
            ? field.kind
            : "text"
        }
        inputMode={field.inputMode}
        autoComplete={field.autoComplete}
        placeholder={field.placeholder}
        hint={field.kind === "keywords" ? "Separate keywords with commas." : undefined}
      />
    );
  }

  return (
    <form
      aria-label={sectionId}
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-3"
    >
      {watched.items.map((item, index) => (
        <EntryCard
          key={stringValue(item.id)}
          index={index}
          entryId={stringValue(item.id)}
          hidden={booleanValue(item.hidden)}
        >
          {fields.map((field) => renderField(item, index, field))}
          <EntryActions
            index={index}
            total={watched.items.length}
            hidden={booleanValue(item.hidden)}
            onToggleHidden={() =>
              updateItem(index, "hidden", !booleanValue(item.hidden))
            }
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
