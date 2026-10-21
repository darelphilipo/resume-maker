"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import type {
  PictureConfig,
  ResumeBasics,
} from "@/lib/schema/resume.schema";
import { useResumeStore } from "@/lib/store/useResumeStore";

import { BooleanInput, TextInput } from "./SectionFormControls";
import { useDebouncedCommit } from "./useDebouncedCommit";

const basicsFormSchema = z.object({
  name: z.string(),
  headline: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  websiteUrl: z.string(),
  websiteLabel: z.string(),
  pictureUrl: z.string(),
  pictureHidden: z.boolean(),
});

type BasicsFormValues = z.infer<typeof basicsFormSchema>;

function toFormValues(
  basics: ResumeBasics,
  picture: PictureConfig,
): BasicsFormValues {
  return {
    name: basics.name,
    headline: basics.headline,
    email: basics.email,
    phone: basics.phone,
    location: basics.location,
    websiteUrl: basics.website.url,
    websiteLabel: basics.website.label,
    pictureUrl: picture.url,
    pictureHidden: picture.hidden,
  };
}

export function BasicsForm() {
  const basics = useResumeStore((state) => state.doc.basics);
  const picture = useResumeStore((state) => state.doc.picture);
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const values = useMemo(
    () => toFormValues(basics, picture),
    [basics, picture],
  );

  const form = useForm<BasicsFormValues>({
    defaultValues: values,
    values,
    mode: "onBlur",
    resolver: zodResolver(basicsFormSchema),
  });
  const watched = useWatch({
    control: form.control,
    defaultValue: values,
  }) as typeof values;

  useDebouncedCommit(watched, (next) => {
    patchDoc({
      basics: {
        name: next.name,
        headline: next.headline,
        email: next.email,
        phone: next.phone,
        location: next.location,
        website: {
          url: next.websiteUrl,
          label: next.websiteLabel,
        },
      },
      picture: {
        url: next.pictureUrl,
        hidden: next.pictureHidden,
      },
    });
  });

  return (
    <form
      aria-label="Basics"
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-3"
    >
      <TextInput
        id="basics-name"
        label="Name"
        value={watched.name}
        onChange={(value) => form.setValue("name", value, { shouldDirty: true })}
        autoComplete="name"
        placeholder="Ada Lovelace"
      />
      <TextInput
        id="basics-headline"
        label="Headline"
        value={watched.headline}
        onChange={(value) =>
          form.setValue("headline", value, { shouldDirty: true })
        }
        autoComplete="organization-title"
        placeholder="Software engineer"
      />
      <TextInput
        id="basics-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={watched.email}
        onChange={(value) => form.setValue("email", value, { shouldDirty: true })}
        placeholder="you@example.com"
      />
      <TextInput
        id="basics-phone"
        label="Phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={watched.phone}
        onChange={(value) => form.setValue("phone", value, { shouldDirty: true })}
        placeholder="+1 555 0100"
      />
      <TextInput
        id="basics-location"
        label="Location"
        autoComplete="address-level2"
        value={watched.location}
        onChange={(value) =>
          form.setValue("location", value, { shouldDirty: true })
        }
        placeholder="Berlin, Germany"
      />
      <TextInput
        id="basics-website-url"
        label="Website URL"
        type="url"
        inputMode="url"
        autoComplete="url"
        value={watched.websiteUrl}
        onChange={(value) =>
          form.setValue("websiteUrl", value, { shouldDirty: true })
        }
        placeholder="https://example.com"
      />
      <TextInput
        id="basics-website-label"
        label="Website label"
        value={watched.websiteLabel}
        onChange={(value) =>
          form.setValue("websiteLabel", value, { shouldDirty: true })
        }
        placeholder="example.com"
      />
      <TextInput
        id="basics-picture-url"
        label="Picture URL"
        type="url"
        inputMode="url"
        value={watched.pictureUrl}
        onChange={(value) =>
          form.setValue("pictureUrl", value, { shouldDirty: true })
        }
        placeholder="https://example.com/photo.jpg"
      />
      <BooleanInput
        id="basics-picture-hidden"
        label="Hide picture"
        checked={watched.pictureHidden}
        onChange={(checked) =>
          form.setValue("pictureHidden", checked, { shouldDirty: true })
        }
      />
    </form>
  );
}
