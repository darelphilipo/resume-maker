"use client";

import { Fragment, useState } from "react";
import {
  BehanceLogo,
  DevToLogo,
  DribbbleLogo,
  EnvelopeSimple,
  GithubLogo,
  GitlabLogo,
  Globe,
  LinkedinLogo,
  LinkSimple,
  MapPin,
  MediumLogo,
  Phone,
  SealCheck,
  StackOverflowLogo,
  TwitterLogo,
  XLogo,
  type Icon,
} from "@phosphor-icons/react";

import {
  externalLinkHref,
  headerProfileLinks,
  websiteLabelFromUrl,
  type HeaderProfileIcon,
} from "@/lib/links/contactLinks";
import type { ResumeDocument } from "@/lib/schema/resume.schema";

import { AvatarSlot, shouldShowAvatar } from "./AvatarSlot";
import { resolveSection } from "./sectionData";

type ContactKind =
  | "email"
  | "phone"
  | "location"
  | "website"
  | "workAuth"
  | "profile"
  | "custom";

type ContactEntry = {
  id: string;
  kind: ContactKind;
  text: string;
  href?: string;
  icon?: HeaderProfileIcon;
};

/** Only resume-relevant networks get a brand mark; everything else is a globe. */
const PROFILE_ICON_COMPONENTS: Record<HeaderProfileIcon, Icon> = {
  github: GithubLogo,
  gitlab: GitlabLogo,
  linkedin: LinkedinLogo,
  "stack-overflow": StackOverflowLogo,
  twitter: TwitterLogo,
  x: XLogo,
  dribbble: DribbbleLogo,
  behance: BehanceLogo,
  medium: MediumLogo,
  dev: DevToLogo,
  globe: Globe,
};

function ContactIcon({
  kind,
  icon,
}: {
  kind: ContactKind;
  icon?: HeaderProfileIcon;
}) {
  const Icon =
    kind === "profile"
      ? PROFILE_ICON_COMPONENTS[icon ?? "globe"]
      : kind === "email"
        ? EnvelopeSimple
        : kind === "phone"
          ? Phone
          : kind === "location"
            ? MapPin
            : kind === "website"
              ? Globe
              : kind === "workAuth"
                ? SealCheck
                : LinkSimple;

  return (
    <Icon
      size={10}
      weight="bold"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    />
  );
}

function buildContactEntries(doc: ResumeDocument): ContactEntry[] {
  const entries: ContactEntry[] = [];

  if (doc.basics.email.trim() !== "") {
    entries.push({ id: "email", kind: "email", text: doc.basics.email.trim() });
  }

  if (doc.basics.phone.trim() !== "") {
    entries.push({ id: "phone", kind: "phone", text: doc.basics.phone.trim() });
  }

  if (doc.basics.location.trim() !== "") {
    entries.push({
      id: "location",
      kind: "location",
      text: doc.basics.location.trim(),
    });
  }

  if (doc.basics.workAuth.trim() !== "") {
    entries.push({
      id: "work-auth",
      kind: "workAuth",
      text: doc.basics.workAuth.trim(),
    });
  }

  const websiteLabel = doc.basics.website.label.trim();
  const websiteUrl = doc.basics.website.url.trim();

  if (websiteLabel !== "" || websiteUrl !== "") {
    entries.push({
      id: "website",
      kind: "website",
      text: websiteLabel || websiteLabelFromUrl(websiteUrl) || websiteUrl,
      href: externalLinkHref(websiteUrl) || undefined,
    });
  }

  // Profiles are promoted into the contact line from the existing Profiles
  // section — there is no second `basics.links` array. The section renderer and
  // ATS text read the same `headerProfileLinks` list, so a row with a stored or
  // canonical URL becomes a link, a `Network: username` row becomes plain text,
  // and the body section is omitted only when every row is promoted.
  const profiles = resolveSection(doc, "profiles");

  if (profiles?.kind === "profiles") {
    for (const link of headerProfileLinks(profiles.items)) {
      entries.push({
        id: `profile-${link.id}`,
        kind: "profile",
        text: link.label,
        href: link.href,
        icon: link.icon,
      });
    }
  }

  doc.basics.customFields.forEach((field, index) => {
    if (field.text.trim() !== "") {
      entries.push({
        id: field.id || `custom-${index}`,
        kind: "custom",
        text: field.text.trim(),
      });
    }
  });

  return entries;
}

export function HeaderSlot({ doc }: { doc: ResumeDocument }) {
  const { basics } = doc;
  const pictureUrl = doc.picture.url.trim();
  const [failedPictureUrl, setFailedPictureUrl] = useState<string | null>(null);
  const avatarFailed = pictureUrl !== "" && failedPictureUrl === pictureUrl;
  const hasAvatar = shouldShowAvatar(doc.picture) && !avatarFailed;
  const contactEntries = buildContactEntries(doc);
  const hideIcons = doc.metadata.page.hideIcons;

  return (
    <header
      className="resume-header"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "14pt",
        alignItems: "center",
      }}
    >
      {hasAvatar ? (
        <AvatarSlot
          picture={doc.picture}
          onError={() => {
            setFailedPictureUrl(pictureUrl);
          }}
        />
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2pt",
          minWidth: 0,
          ...(hasAvatar ? {} : { gridColumn: "1 / -1" }),
        }}
      >
        <h1
          className="resume-name"
          style={{
            margin: 0,
            fontSize: "1.55em",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
          }}
        >
          {basics.name}
        </h1>
        {basics.headline.trim() !== "" ? (
          <p
            className="resume-headline"
            style={{ margin: 0, fontSize: "1.02em", opacity: 0.8 }}
          >
            {basics.headline.trim()}
          </p>
        ) : null}
        {contactEntries.length > 0 ? (
          <p
            className="resume-contact"
            style={{
              margin: 0,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "2pt 7pt",
              fontSize: "0.9em",
            }}
          >
            {contactEntries.map((entry, index) => (
              <Fragment key={entry.id}>
                {index > 0 ? (
                  <span
                    className="resume-contact-separator"
                    aria-hidden="true"
                    style={{ opacity: 0.45 }}
                  >
                    ·
                  </span>
                ) : null}
                <span
                  className={
                    entry.kind === "workAuth"
                      ? "resume-contact-item resume-work-auth"
                      : "resume-contact-item"
                  }
                  data-profile-icon={
                    entry.kind === "profile" ? entry.icon : undefined
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3pt",
                  }}
                >
                  {hideIcons ? null : (
                    <ContactIcon kind={entry.kind} icon={entry.icon} />
                  )}
                  {entry.href ? (
                    <a
                      className="resume-link"
                      href={entry.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {entry.text}
                    </a>
                  ) : (
                    <span>{entry.text}</span>
                  )}
                </span>
              </Fragment>
            ))}
          </p>
        ) : null}
      </div>
    </header>
  );
}
