import { Fragment } from "react";
import {
  EnvelopeSimple,
  Globe,
  LinkSimple,
  MapPin,
  Phone,
} from "@phosphor-icons/react";

import type { ResumeDocument } from "@/lib/schema/resume.schema";

import { AvatarSlot, shouldShowAvatar } from "./AvatarSlot";

type ContactKind = "email" | "phone" | "location" | "website" | "custom";

type ContactEntry = {
  id: string;
  kind: ContactKind;
  text: string;
};

function ContactIcon({ kind }: { kind: ContactKind }) {
  const Icon =
    kind === "email"
      ? EnvelopeSimple
      : kind === "phone"
        ? Phone
        : kind === "location"
          ? MapPin
          : kind === "website"
            ? Globe
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

  if (doc.basics.website.label.trim() !== "") {
    entries.push({
      id: "website",
      kind: "website",
      text: doc.basics.website.label.trim(),
    });
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
  const hasAvatar = shouldShowAvatar(doc.picture);
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
      <AvatarSlot picture={doc.picture} />
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
                  className="resume-contact-item"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3pt",
                  }}
                >
                  {hideIcons ? null : <ContactIcon kind={entry.kind} />}
                  <span>{entry.text}</span>
                </span>
              </Fragment>
            ))}
          </p>
        ) : null}
      </div>
    </header>
  );
}
