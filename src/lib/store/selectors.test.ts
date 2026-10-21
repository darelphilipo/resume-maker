import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import {
  CustomSectionSchema,
  EducationItemSchema,
  ExperienceItemSchema,
  ProfileItemSchema,
  SkillItemSchema,
} from "@/lib/schema/resume.schema";

import {
  PRIMARY_FIELD,
  isDraft,
  selectSection,
  selectVisibleSectionIds,
} from "./selectors";

describe("PRIMARY_FIELD", () => {
  it("maps every section to its primary field", () => {
    expect(PRIMARY_FIELD).toMatchObject({
      profiles: "network",
      experience: "company",
      education: "school",
      projects: "name",
      skills: "name",
      certifications: "name",
      awards: "title",
      languages: "name",
      interests: "name",
      volunteer: "organization",
      publications: "title",
      references: "name",
      summary: "content",
    });
  });
});

describe("isDraft", () => {
  it("treats a blank or missing primary field as a draft", () => {
    expect(isDraft("experience", { company: "   " })).toBe(true);
    expect(isDraft("experience", { company: "Acme" })).toBe(false);
    expect(isDraft("experience", {})).toBe(true);

    expect(isDraft("skills", { name: "" })).toBe(true);
    expect(isDraft("skills", { name: "TypeScript" })).toBe(false);

    expect(isDraft("education", { school: "" })).toBe(true);
    expect(isDraft("education", { school: "MIT" })).toBe(false);
  });
});

describe("selectSection", () => {
  it("returns a known section and null for an unknown id", () => {
    const doc = createEmptyResume();
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({ id: "e1", company: "Acme" }),
    ];

    expect(selectSection({ doc }, "experience")?.items).toHaveLength(1);
    expect(selectSection({ doc }, "nope")).toBeNull();
  });
});

describe("selectVisibleSectionIds", () => {
  it("drops hidden sections, all-draft sections, unknown ids, and empty summary", () => {
    const doc = createEmptyResume();
    doc.metadata.layout.pages = [
      {
        fullWidth: false,
        main: ["summary", "experience", "skills", "education", "nope"],
        sidebar: ["profiles"],
      },
    ];
    doc.summary.content = "";
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({ id: "e1", company: "Acme" }),
      ExperienceItemSchema.parse({ id: "e2", company: "" }),
    ];
    doc.sections.skills.hidden = true;
    doc.sections.skills.items = [
      SkillItemSchema.parse({ id: "s1", name: "TypeScript" }),
    ];
    doc.sections.education.items = [
      EducationItemSchema.parse({ id: "ed1", school: "   " }),
    ];
    doc.sections.profiles.items = [
      ProfileItemSchema.parse({ id: "p1", network: "GitHub" }),
    ];

    expect(selectVisibleSectionIds({ doc })).toEqual([
      "experience",
      "profiles",
    ]);
  });

  it("drops every item when all are hidden", () => {
    const doc = createEmptyResume();
    doc.metadata.layout.pages = [
      { fullWidth: false, main: ["experience"], sidebar: [] },
    ];
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({ id: "e1", company: "Acme", hidden: true }),
    ];

    expect(selectVisibleSectionIds({ doc })).toEqual([]);
  });

  it("keeps a non-empty summary first, in main then sidebar order", () => {
    const doc = createEmptyResume();
    doc.metadata.layout.pages = [
      { fullWidth: false, main: ["summary", "experience"], sidebar: ["skills"] },
    ];
    doc.summary.content = "  Staff engineer  ";
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({ id: "e1", company: "Acme" }),
    ];
    doc.sections.skills.items = [
      SkillItemSchema.parse({ id: "s1", name: "TypeScript" }),
    ];

    expect(selectVisibleSectionIds({ doc })).toEqual([
      "summary",
      "experience",
      "skills",
    ]);
  });

  it("falls back to the default order when there is no page", () => {
    const doc = createEmptyResume();
    doc.metadata.layout.pages = [];
    doc.summary.content = "Hello";
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({ id: "e1", company: "Acme" }),
    ];

    expect(selectVisibleSectionIds({ doc })).toEqual([
      "summary",
      "experience",
    ]);
  });

  it("omits a hidden summary", () => {
    const doc = createEmptyResume();
    doc.metadata.layout.pages = [
      { fullWidth: false, main: ["summary"], sidebar: [] },
    ];
    doc.summary.content = "Hello";
    doc.summary.hidden = true;

    expect(selectVisibleSectionIds({ doc })).toEqual([]);
  });

  it("includes visible custom sections in layout order", () => {
    const doc = createEmptyResume();
    doc.metadata.layout.pages = [
      { fullWidth: false, main: ["summary", "projects-custom", "skills"], sidebar: [] },
    ];
    doc.summary.content = "Hello";
    doc.sections.skills.items = [
      SkillItemSchema.parse({ id: "s1", name: "TypeScript" }),
    ];
    doc.customSections.push(
      CustomSectionSchema.parse({
        id: "projects-custom",
        title: "Side Projects",
        items: [{ id: "c1", name: "Resume Maker" }],
      }),
    );

    expect(selectVisibleSectionIds({ doc })).toEqual([
      "summary",
      "projects-custom",
      "skills",
    ]);
  });

  it("excludes a hidden custom section", () => {
    const doc = createEmptyResume();
    doc.metadata.layout.pages = [
      { fullWidth: false, main: ["projects-custom"], sidebar: [] },
    ];
    doc.customSections.push(
      CustomSectionSchema.parse({
        id: "projects-custom",
        hidden: true,
        items: [{ id: "c1", name: "Resume Maker" }],
      }),
    );

    expect(selectVisibleSectionIds({ doc })).toEqual([]);
  });

  it("excludes a custom section whose items all have empty names", () => {
    const doc = createEmptyResume();
    doc.metadata.layout.pages = [
      { fullWidth: false, main: ["projects-custom"], sidebar: [] },
    ];
    doc.customSections.push(
      CustomSectionSchema.parse({
        id: "projects-custom",
        items: [
          { id: "c1", name: "   " },
          { id: "c2", name: "" },
        ],
      }),
    );

    expect(selectVisibleSectionIds({ doc })).toEqual([]);
  });

  it("lets a built-in id win over a custom section with the same id", () => {
    const doc = createEmptyResume();
    doc.metadata.layout.pages = [
      { fullWidth: false, main: ["skills"], sidebar: [] },
    ];
    doc.sections.skills.hidden = true;
    doc.sections.skills.items = [
      SkillItemSchema.parse({ id: "s1", name: "TypeScript" }),
    ];
    doc.customSections.push(
      CustomSectionSchema.parse({
        id: "skills",
        items: [{ id: "c1", name: "Custom skills" }],
      }),
    );

    expect(selectVisibleSectionIds({ doc })).toEqual([]);
  });
});
