import { z } from "zod";

export const TEMPLATE_IDS = [
  "onyx",
  "persian",
  "bronzor",
  "chikorita",
  "azurill",
  "gengar",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const SECTION_IDS = [
  "profiles",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "awards",
  "languages",
  "interests",
  "volunteer",
  "publications",
  "references",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];
export type ResumeSectionKey = SectionId | "summary";

export const DEFAULT_SECTION_ORDER = [
  "summary",
  "profiles",
  "experience",
  "projects",
  "education",
  "skills",
  "certifications",
  "awards",
  "languages",
  "interests",
  "volunteer",
  "publications",
  "references",
] as const;

const text = () => z.string().default("");
const textList = () => z.array(z.string()).default(() => []);
const ColumnsSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const SectionConfigSchema = z.object({
  title: z.string().default(""),
  icon: z.string().default(""),
  columns: ColumnsSchema.default(1),
  hidden: z.boolean().default(false),
  showHeading: z.boolean().default(true),
  keepTogether: z.boolean().default(false),
  startOnNewPage: z.boolean().default(false),
});

export type SectionConfig = z.infer<typeof SectionConfigSchema>;
export type ListSection<T> = SectionConfig & { items: T[] };

const sectionConfigShape = {
  title: z.string().default(""),
  icon: z.string().default(""),
  columns: ColumnsSchema.default(1),
  hidden: z.boolean().default(false),
  showHeading: z.boolean().default(true),
  keepTogether: z.boolean().default(false),
  startOnNewPage: z.boolean().default(false),
};

function sectionFields(title: string, icon: string) {
  return {
    ...sectionConfigShape,
    title: z.string().default(title),
    icon: z.string().default(icon),
  };
}

const itemBaseShape = {
  id: z.string().min(1),
  hidden: z.boolean().default(false),
};

export const ProfileItemSchema = z.object({
  ...itemBaseShape,
  network: text(),
  username: text(),
  url: text(),
  icon: text(),
});

export const ExperienceItemSchema = z.object({
  ...itemBaseShape,
  company: text(),
  position: text(),
  location: text(),
  startDate: text(),
  endDate: text(),
  current: z.boolean().default(false),
  summary: text(),
});

export const EducationItemSchema = z.object({
  ...itemBaseShape,
  school: text(),
  degree: text(),
  area: text(),
  location: text(),
  startDate: text(),
  endDate: text(),
  grade: text(),
  summary: text(),
  current: z.boolean().default(false),
});

export const ProjectItemSchema = z.object({
  ...itemBaseShape,
  name: text(),
  description: text(),
  url: text(),
  startDate: text(),
  endDate: text(),
  current: z.boolean().default(false),
  keywords: textList(),
});

export const SkillItemSchema = z.object({
  ...itemBaseShape,
  name: text(),
  level: z.number().int().min(0).max(5).default(0),
  keywords: textList(),
});

export const CertificationItemSchema = z.object({
  ...itemBaseShape,
  name: text(),
  issuer: text(),
  date: text(),
  url: text(),
});

export const AwardItemSchema = z.object({
  ...itemBaseShape,
  title: text(),
  awarder: text(),
  date: text(),
  summary: text(),
});

export const LanguageItemSchema = z.object({
  ...itemBaseShape,
  name: text(),
  level: z.number().int().min(0).max(5).default(0),
  fluency: text(),
});

export const InterestItemSchema = z.object({
  ...itemBaseShape,
  name: text(),
  keywords: textList(),
});

export const VolunteerItemSchema = z.object({
  ...itemBaseShape,
  organization: text(),
  position: text(),
  location: text(),
  startDate: text(),
  endDate: text(),
  summary: text(),
  current: z.boolean().default(false),
});

export const PublicationItemSchema = z.object({
  ...itemBaseShape,
  title: text(),
  publisher: text(),
  date: text(),
  url: text(),
  summary: text(),
});

export const ReferenceItemSchema = z.object({
  ...itemBaseShape,
  name: text(),
  position: text(),
  company: text(),
  phone: text(),
  email: text(),
  summary: text(),
});

export type ProfileItem = z.infer<typeof ProfileItemSchema>;
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;
export type EducationItem = z.infer<typeof EducationItemSchema>;
export type ProjectItem = z.infer<typeof ProjectItemSchema>;
export type SkillItem = z.infer<typeof SkillItemSchema>;
export type CertificationItem = z.infer<typeof CertificationItemSchema>;
export type AwardItem = z.infer<typeof AwardItemSchema>;
export type LanguageItem = z.infer<typeof LanguageItemSchema>;
export type InterestItem = z.infer<typeof InterestItemSchema>;
export type VolunteerItem = z.infer<typeof VolunteerItemSchema>;
export type PublicationItem = z.infer<typeof PublicationItemSchema>;
export type ReferenceItem = z.infer<typeof ReferenceItemSchema>;

function listSectionSchema<T extends z.ZodType>(
  title: string,
  icon: string,
  itemSchema: T,
) {
  return z.object({
    ...sectionFields(title, icon),
    items: z.array(itemSchema).default(() => []),
  });
}

const ProfilesSectionSchema = listSectionSchema(
  "Profiles",
  "user-circle",
  ProfileItemSchema,
);
const ExperienceSectionSchema = z.object({
  ...sectionFields("Experience", "briefcase"),
  items: z.array(ExperienceItemSchema).default(() => []),
  /**
   * When true, consecutive visible roles at the same company share one company
   * / location / combined-date header in the visual preview and PDF. The ATS
   * text renderer stays linear either way.
   */
  groupSameCompany: z.boolean().default(false),
});
const EducationSectionSchema = listSectionSchema(
  "Education",
  "graduation-cap",
  EducationItemSchema,
);
const ProjectsSectionSchema = listSectionSchema(
  "Projects",
  "folder",
  ProjectItemSchema,
);
const SkillsSectionSchema = z.object({
  ...sectionFields("Skills", "wrench"),
  items: z.array(SkillItemSchema).default(() => []),
  keywordLayout: z.enum(["inline", "list"]).default("inline"),
  layout: z.enum(["default", "inline"]).default("default"),
});
const CertificationsSectionSchema = listSectionSchema(
  "Certifications",
  "certificate",
  CertificationItemSchema,
);
const AwardsSectionSchema = listSectionSchema("Awards", "trophy", AwardItemSchema);
const LanguagesSectionSchema = listSectionSchema(
  "Languages",
  "translate",
  LanguageItemSchema,
);
const InterestsSectionSchema = listSectionSchema(
  "Interests",
  "heart",
  InterestItemSchema,
);
const VolunteerSectionSchema = listSectionSchema(
  "Volunteer",
  "hand-heart",
  VolunteerItemSchema,
);
const PublicationsSectionSchema = listSectionSchema(
  "Publications",
  "book-open",
  PublicationItemSchema,
);
const ReferencesSectionSchema = listSectionSchema(
  "References",
  "users",
  ReferenceItemSchema,
);

export const SectionsSchema = z.object({
  profiles: ProfilesSectionSchema.default(() => ProfilesSectionSchema.parse({})),
  experience: ExperienceSectionSchema.default(() =>
    ExperienceSectionSchema.parse({}),
  ),
  education: EducationSectionSchema.default(() =>
    EducationSectionSchema.parse({}),
  ),
  projects: ProjectsSectionSchema.default(() => ProjectsSectionSchema.parse({})),
  skills: SkillsSectionSchema.default(() => SkillsSectionSchema.parse({})),
  certifications: CertificationsSectionSchema.default(() =>
    CertificationsSectionSchema.parse({}),
  ),
  awards: AwardsSectionSchema.default(() => AwardsSectionSchema.parse({})),
  languages: LanguagesSectionSchema.default(() =>
    LanguagesSectionSchema.parse({}),
  ),
  interests: InterestsSectionSchema.default(() => InterestsSectionSchema.parse({})),
  volunteer: VolunteerSectionSchema.default(() =>
    VolunteerSectionSchema.parse({}),
  ),
  publications: PublicationsSectionSchema.default(() =>
    PublicationsSectionSchema.parse({}),
  ),
  references: ReferencesSectionSchema.default(() =>
    ReferencesSectionSchema.parse({}),
  ),
});

export const CustomFieldSchema = z.object({
  id: z.string().default(""),
  icon: z.string().default(""),
  text: z.string().default(""),
  link: z.string().optional(),
});

export const WebsiteSchema = z.object({
  url: z.string().default(""),
  label: z.string().default(""),
});

export const ResumeBasicsSchema = z.object({
  name: text(),
  headline: text(),
  email: text(),
  phone: text(),
  location: text(),
  workAuth: text(),
  website: WebsiteSchema.default(() => WebsiteSchema.parse({})),
  customFields: z.array(CustomFieldSchema).default(() => []),
});

export type ResumeBasics = z.infer<typeof ResumeBasicsSchema>;

export const PictureConfigSchema = z.object({
  hidden: z.boolean().default(true),
  url: text(),
  size: z.number().default(64),
  aspectRatio: z.number().default(1),
  borderRadius: z.number().default(0),
  fit: z.enum(["cover", "contain"]).default("cover"),
});

export type PictureConfig = z.infer<typeof PictureConfigSchema>;

export const SummarySchema = z.object({
  ...sectionFields("Summary", "article"),
  content: text(),
});

export const CustomItemSchema = z.object({
  ...itemBaseShape,
  name: text(),
  description: text(),
  date: z.string().optional(),
  location: z.string().optional(),
  url: z.string().optional(),
});

export type CustomItem = z.infer<typeof CustomItemSchema>;

export const CustomSectionSchema = z.object({
  ...sectionConfigShape,
  id: z.string().min(1),
  items: z.array(CustomItemSchema).default(() => []),
});

export type CustomSection = z.infer<typeof CustomSectionSchema>;

export const LayoutPageSchema = z.object({
  fullWidth: z.boolean().default(false),
  main: textList(),
  sidebar: textList(),
});

export const LayoutSchema = z.object({
  sidebarWidth: z.number().default(35),
  sidebarSide: z.enum(["left", "right"]).default("left"),
  pages: z.array(LayoutPageSchema).default(() => []),
});

export const PageConfigSchema = z.object({
  format: z.enum(["a4", "letter"]).default("a4"),
  marginX: z.number().default(14),
  marginY: z.number().default(12),
  gapX: z.number().default(8),
  gapY: z.number().default(12),
  hideIcons: z.boolean().default(false),
  fitScale: z.number().min(0.5).max(1).default(1),
});

const BodyTypographySchema = z.object({
  fontFamily: z.string().default("var(--font-sans)"),
  fontSize: z.number().default(11),
  lineHeight: z.number().default(1.4),
});

const HeadingTypographySchema = z.object({
  fontFamily: z.string().default("var(--font-sans)"),
  fontSize: z.number().default(14),
  lineHeight: z.number().default(1.25),
});

export const TypographySchema = z.object({
  body: BodyTypographySchema.default(() => BodyTypographySchema.parse({})),
  heading: HeadingTypographySchema.default(() =>
    HeadingTypographySchema.parse({}),
  ),
});

const ColorsSchema = z.object({
  primary: z.string().default("#1f2937"),
  text: z.string().default("#111827"),
  background: z.string().default("#ffffff"),
});

export const DENSITY_IDS = ["compact", "normal", "relaxed"] as const;
export type DensityId = (typeof DENSITY_IDS)[number];

export const DesignSchema = z.object({
  colors: ColorsSchema.default(() => ColorsSchema.parse({})),
  density: z.enum(DENSITY_IDS).default("normal"),
  levelType: z.enum(["hidden", "circle", "progress-bar", "rectangle"]).default(
    "progress-bar",
  ),
});

export const ResumeMetadataSchema = z.object({
  schemaVersion: z.number().default(1),
  template: z.enum(TEMPLATE_IDS).default("onyx"),
  /**
   * True only for documents built from a starter preset. It powers the one-click
   * "Clear sample data" action and is cleared once the sample content is wiped,
   * so a restored backup keeps the same affordance.
   */
  sampleData: z.boolean().default(false),
  layout: LayoutSchema.default(() => LayoutSchema.parse({})),
  page: PageConfigSchema.default(() => PageConfigSchema.parse({})),
  typography: TypographySchema.default(() => TypographySchema.parse({})),
  design: DesignSchema.default(() => DesignSchema.parse({})),
});

export type ResumeMetadata = z.infer<typeof ResumeMetadataSchema>;

const ResumeDocumentObjectSchema = z.object({
  picture: PictureConfigSchema.default(() => PictureConfigSchema.parse({})),
  basics: ResumeBasicsSchema.default(() => ResumeBasicsSchema.parse({})),
  summary: SummarySchema.default(() => SummarySchema.parse({})),
  sections: SectionsSchema.default(() => SectionsSchema.parse({})),
  customSections: z.array(CustomSectionSchema).default(() => []),
  metadata: ResumeMetadataSchema.default(() => ResumeMetadataSchema.parse({})),
});

export type ResumeDocument = z.infer<typeof ResumeDocumentObjectSchema>;

export const ResumeDocumentSchema: z.ZodType<ResumeDocument> =
  ResumeDocumentObjectSchema.transform((doc) => {
    if (doc.metadata.layout.pages.length > 0) {
      return doc;
    }

    return {
      ...doc,
      metadata: {
        ...doc.metadata,
        layout: {
          ...doc.metadata.layout,
          pages: [
            {
              fullWidth: false,
              main: [...DEFAULT_SECTION_ORDER],
              sidebar: [],
            },
          ],
        },
      },
    };
  });
