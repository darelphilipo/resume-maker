"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CaretDown } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { websiteLabelFromUrl } from "@/lib/links/contactLinks";
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
  workAuth: z.string(),
  websiteUrl: z.string(),
  pictureUrl: z.string(),
  pictureHidden: z.boolean(),
});

type BasicsFormValues = z.infer<typeof basicsFormSchema>;

const WORK_AUTH_PRESETS = [
  "Authorized to work in US",
  "Immediate Joiner",
] as const;

/**
 * Shows the picture URL the moment it changes, and replaces a broken image
 * with a readable message instead of the browser's broken-image icon. The
 * parent keys this by URL, so a new link starts from a fresh loading state.
 */
function PicturePreview({
  url,
  hidden,
}: {
  url: string;
  hidden: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const trimmed = url.trim();

  if (trimmed === "" || hidden) {
    return null;
  }

  if (failed) {
    return (
      <p
        role="status"
        className="rounded-lg border border-amber-700/20 bg-amber-50 px-3 py-2 text-xs text-amber-900"
      >
        That picture could not load. Check the URL — it must point directly to a
        public image file.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={trimmed}
        alt="Picture preview"
        onError={() => {
          setFailed(true);
        }}
        className="h-12 w-12 shrink-0 rounded-md border border-line object-cover"
      />
      <p className="text-xs text-muted">
        Live preview. Hidden pictures never appear in the resume.
      </p>
    </div>
  );
}

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
    workAuth: basics.workAuth,
    websiteUrl: basics.website.url,
    pictureUrl: picture.url,
    pictureHidden: picture.hidden,
  };
}

export type BasicsFormProps = {
  /**
   * Publishes the name on every keystroke. The full form is still committed
   * through the 50 ms debounce (which owns undo history and persistence), but
   * that commit is skipped while typing continues — so without this callback
   * the header and preview canvas only follow the name once typing pauses.
   */
  onLiveNameChange?: (name: string) => void;
  /** Opens the existing Profiles editor; the header link list is derived there. */
  onManageProfiles?: () => void;
};

export function BasicsForm({
  onLiveNameChange,
  onManageProfiles,
}: BasicsFormProps) {
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
    const urlChanged = next.websiteUrl.trim() !== basics.website.url.trim();
    // Keep a custom label imported from JSON until the URL itself changes.
    const websiteLabel =
      !urlChanged && basics.website.label.trim() !== ""
        ? basics.website.label
        : websiteLabelFromUrl(next.websiteUrl);

    patchDoc({
      basics: {
        name: next.name,
        headline: next.headline,
        email: next.email,
        phone: next.phone,
        location: next.location,
        workAuth: next.workAuth,
        website: {
          url: next.websiteUrl,
          label: websiteLabel,
        },
      },
      picture: {
        url: next.pictureUrl,
        hidden: next.pictureHidden,
      },
    });
  });

  const websitePreview = websiteLabelFromUrl(watched.websiteUrl);
  const [contactDetailsOpen, setContactDetailsOpen] = useState(false);

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
        onChange={(value) => {
          form.setValue("name", value, { shouldDirty: true });
          onLiveNameChange?.(value);
        }}
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
      {/*
       * Name, headline, email, phone, and location are the fields most resumes
       * need; everything else is optional and stays behind one compact
       * disclosure so the Content panel does not bury the section list.
       */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          aria-expanded={contactDetailsOpen}
          aria-controls="basics-contact-details"
          onClick={() => {
            setContactDetailsOpen((open) => !open);
          }}
          className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-1 text-left text-sm font-medium text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <span>More contact details</span>
          <CaretDown
            size={16}
            aria-hidden
            data-contact-details-chevron=""
            className={`shrink-0 opacity-70 transition-transform ${
              contactDetailsOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        <div
          id="basics-contact-details"
          hidden={!contactDetailsOpen}
          className="flex flex-col gap-3"
        >
          <TextInput
            id="basics-work-auth"
            label="Work auth / notice period"
            value={watched.workAuth}
            onChange={(value) =>
              form.setValue("workAuth", value, { shouldDirty: true })
            }
            placeholder="Authorized to work in US"
            hint="Optional one-liner shown in the header. Keep it short."
          />
          <div className="flex flex-wrap gap-1.5">
            {WORK_AUTH_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={watched.workAuth === preset}
                onClick={() =>
                  form.setValue(
                    "workAuth",
                    watched.workAuth === preset ? "" : preset,
                    { shouldDirty: true },
                  )
                }
                className={`inline-flex min-h-11 items-center rounded-full border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  watched.workAuth === preset
                    ? "border-primary bg-primary/5"
                    : "border-black/10 hover:border-black/30 active:bg-black/5"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
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
            hint={
              websitePreview !== "" ? `Shown as ${websitePreview}` : undefined
            }
          />
          {onManageProfiles ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-muted px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">Profile links</p>
                <p className="text-xs text-muted">
                  GitHub, LinkedIn, or portfolio — shown in the header.
                </p>
              </div>
              <button
                type="button"
                onClick={onManageProfiles}
                className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-black/10 bg-surface px-3 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Manage profiles
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {/*
       * A hidden picture cannot be used, so its URL field is not shown at all
       * while "Hide picture" is checked. The checkbox stays visible so the
       * picture can be brought back in one tap.
       */}
      {watched.pictureHidden ? null : (
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
      )}
      <PicturePreview
        key={watched.pictureUrl.trim()}
        url={watched.pictureUrl}
        hidden={watched.pictureHidden}
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
