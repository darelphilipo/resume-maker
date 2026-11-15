import type { SectionId } from "@/lib/schema/resume.schema";

export type GenericSectionId = Exclude<
  SectionId,
  "experience" | "education" | "projects" | "skills"
>;

export type SectionFieldKind =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "month"
  | "rich"
  | "keywords"
  | "level"
  | "boolean";

export type SectionFieldDescriptor = {
  key: string;
  label: string;
  kind: SectionFieldKind;
  inputMode?: "text" | "email" | "tel" | "url" | "numeric";
  autoComplete?: string;
  placeholder?: string;
  /** Kept in the form/store for import compatibility, but never rendered. */
  hidden?: boolean;
};

export const GENERIC_SECTION_FIELDS: Record<
  GenericSectionId,
  readonly SectionFieldDescriptor[]
> = {
  profiles: [
    {
      key: "url",
      label: "Profile URL",
      kind: "url",
      inputMode: "url",
      autoComplete: "url",
      placeholder: "https://github.com/ada",
    },
    {
      key: "network",
      label: "Network",
      kind: "text",
      autoComplete: "off",
      placeholder: "GitHub",
    },
    {
      key: "username",
      label: "Username",
      kind: "text",
      autoComplete: "username",
      placeholder: "ada",
    },
    {
      key: "icon",
      label: "Icon",
      kind: "text",
      hidden: true,
    },
  ],
  certifications: [
    {
      key: "name",
      label: "Certification",
      kind: "text",
      placeholder: "AWS Solutions Architect",
    },
    {
      key: "issuer",
      label: "Issuer",
      kind: "text",
      autoComplete: "organization",
      placeholder: "Amazon Web Services",
    },
    {
      key: "date",
      label: "Date",
      kind: "month",
    },
    {
      key: "url",
      label: "Credential URL",
      kind: "url",
      inputMode: "url",
      autoComplete: "url",
      placeholder: "https://example.com/credential",
    },
  ],
  awards: [
    {
      key: "title",
      label: "Award",
      kind: "text",
      placeholder: "Engineer of the year",
    },
    {
      key: "awarder",
      label: "Awarder",
      kind: "text",
      autoComplete: "organization",
      placeholder: "Acme",
    },
    {
      key: "date",
      label: "Date",
      kind: "month",
    },
    {
      key: "summary",
      label: "Description",
      kind: "rich",
      placeholder: "What the award recognises",
    },
  ],
  languages: [
    {
      key: "name",
      label: "Language",
      kind: "text",
      autoComplete: "off",
      placeholder: "German",
    },
    {
      key: "level",
      label: "Level",
      kind: "level",
    },
    {
      key: "fluency",
      label: "Fluency",
      kind: "text",
      placeholder: "Professional working proficiency",
    },
  ],
  interests: [
    {
      key: "name",
      label: "Interest",
      kind: "text",
      placeholder: "Open-source",
    },
    {
      key: "keywords",
      label: "Keywords",
      kind: "keywords",
      placeholder: "Rust, typography",
    },
  ],
  volunteer: [
    {
      key: "organization",
      label: "Organisation",
      kind: "text",
      autoComplete: "organization",
      placeholder: "Local food bank",
    },
    {
      key: "position",
      label: "Role",
      kind: "text",
      autoComplete: "organization-title",
      placeholder: "Volunteer coordinator",
    },
    {
      key: "location",
      label: "Location",
      kind: "text",
      autoComplete: "address-level2",
      placeholder: "Berlin, Germany",
    },
    {
      key: "startDate",
      label: "Start date",
      kind: "month",
    },
    {
      key: "endDate",
      label: "End date",
      kind: "month",
    },
    {
      key: "current",
      label: "Present",
      kind: "boolean",
    },
    {
      key: "summary",
      label: "Description",
      kind: "rich",
      placeholder: "What you did and the impact",
    },
  ],
  publications: [
    {
      key: "title",
      label: "Publication",
      kind: "text",
      placeholder: "Scaling static exports",
    },
    {
      key: "publisher",
      label: "Publisher",
      kind: "text",
      autoComplete: "organization",
      placeholder: "Example Press",
    },
    {
      key: "date",
      label: "Date",
      kind: "month",
    },
    {
      key: "url",
      label: "Publication URL",
      kind: "url",
      inputMode: "url",
      autoComplete: "url",
      placeholder: "https://example.com/paper",
    },
    {
      key: "summary",
      label: "Description",
      kind: "rich",
      placeholder: "Abstract or contribution",
    },
  ],
  references: [
    {
      key: "name",
      label: "Name",
      kind: "text",
      autoComplete: "name",
      placeholder: "Grace Hopper",
    },
    {
      key: "position",
      label: "Position",
      kind: "text",
      autoComplete: "organization-title",
      placeholder: "Engineering manager",
    },
    {
      key: "company",
      label: "Company",
      kind: "text",
      autoComplete: "organization",
      placeholder: "Acme",
    },
    {
      key: "phone",
      label: "Phone",
      kind: "tel",
      inputMode: "tel",
      autoComplete: "tel",
      placeholder: "+1 555 0100",
    },
    {
      key: "email",
      label: "Email",
      kind: "email",
      inputMode: "email",
      autoComplete: "email",
      placeholder: "grace@example.com",
    },
    {
      key: "summary",
      label: "Notes",
      kind: "rich",
      placeholder: "Context for the reference",
    },
  ],
};
