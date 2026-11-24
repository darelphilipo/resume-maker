import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import {
  CertificationItemSchema,
  CustomSectionSchema,
  EducationItemSchema,
  ExperienceItemSchema,
  ProfileItemSchema,
  ProjectItemSchema,
  PublicationItemSchema,
  SkillItemSchema,
} from "@/lib/schema/resume.schema";

import { buildAtsCopyBlocks, buildAtsText, richTextToPlainText } from "./atsText";

function lineIndex(text: string, line: string): number {
  return text.split("\n").indexOf(line);
}

describe("richTextToPlainText", () => {
  it("keeps line breaks and bullet items", () => {
    expect(
      richTextToPlainText(
        "<p>Built <strong>APIs</strong>.</p><ul><li>Cut latency</li><li>Led &amp; mentored</li></ul>",
      ),
    ).toBe("Built APIs.\n- Cut latency\n- Led & mentored");
  });

  it("returns an empty string for blank markup", () => {
    expect(richTextToPlainText("   ")).toBe("");
    expect(richTextToPlainText("<p></p>")).toBe("");
  });

  it("drops empty trailing bullet items", () => {
    expect(
      richTextToPlainText(
        "<ul><li>Cut latency</li><li><p></p></li><li>   </li></ul>",
      ),
    ).toBe("- Cut latency");
  });
});

describe("buildAtsText", () => {
  it("starts with name, headline, and contacts in header order", () => {
    const doc = createEmptyResume();

    doc.basics.name = "Ada Lovelace";
    doc.basics.headline = "Software Engineer";
    doc.basics.email = "ada@example.com";
    doc.basics.phone = "+1 555 0100";
    doc.basics.location = "London";
    doc.basics.workAuth = "Authorized to work in US";
    doc.basics.website.label = "ada.dev";
    doc.basics.customFields = [
      { id: "custom-1", icon: "", text: "github.com/ada" },
    ];

    expect(buildAtsText(doc)).toBe(
      [
        "Ada Lovelace",
        "Software Engineer",
        "ada@example.com | +1 555 0100 | London | Authorized to work in US | ada.dev | github.com/ada",
      ].join("\n"),
    );
  });

  it("follows the layout section order and skips empty or hidden sections", () => {
    const doc = createEmptyResume();

    doc.metadata.layout.pages = [
      {
        fullWidth: false,
        main: ["summary", "experience", "skills"],
        sidebar: [],
      },
    ];
    doc.summary.content = "<p>Engineer with a focus on developer tools.</p>";
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Acme",
        position: "Senior Engineer",
      }),
    ];
    doc.sections.skills.items = [
      SkillItemSchema.parse({
        id: "skill-1",
        name: "Languages",
        level: 5,
        keywords: ["TypeScript", "SQL"],
      }),
    ];
    doc.sections.education.items = [
      EducationItemSchema.parse({
        id: "edu-1",
        school: "University",
        degree: "BSc",
        hidden: true,
      }),
    ];

    const text = buildAtsText(doc);
    const summary = lineIndex(text, "Summary");
    const experience = lineIndex(text, "Experience");
    const skills = lineIndex(text, "Skills");

    expect(summary).toBeGreaterThan(-1);
    expect(experience).toBeGreaterThan(summary);
    expect(skills).toBeGreaterThan(experience);
    expect(text).toContain("Engineer with a focus on developer tools.");
    expect(text).toContain("Senior Engineer");
    expect(text).toContain("Acme");
    expect(text).toContain("Languages");
    expect(text).toContain("TypeScript, SQL");
    expect(text).not.toContain("Proficiency");
    expect(text).not.toContain("Education");
  });

  it("prints keyword-only skills without a category line", () => {
    const doc = createEmptyResume();

    doc.sections.skills.items = [
      SkillItemSchema.parse({
        id: "skill-1",
        name: "",
        level: 0,
        keywords: ["SQL", "Excel", "Tableau"],
      }),
    ];

    expect(buildAtsText(doc)).toBe("Skills\nSQL, Excel, Tableau");
  });

  it("omits headings when the section heading is turned off", () => {
    const doc = createEmptyResume();

    doc.sections.experience.showHeading = false;
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Acme",
        position: "Engineer",
      }),
    ];

    const text = buildAtsText(doc);

    expect(text).not.toContain("Experience");
    expect(text).toContain("Engineer");
  });

  it("keeps hidden entries out of the extracted text", () => {
    const doc = createEmptyResume();

    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Visible Co",
        position: "Engineer",
      }),
      ExperienceItemSchema.parse({
        id: "exp-2",
        company: "Hidden Co",
        position: "Manager",
        hidden: true,
      }),
    ];

    const text = buildAtsText(doc);

    expect(text).toContain("Visible Co");
    expect(text).not.toContain("Hidden Co");
  });

  it("stays linear when company grouping is on", () => {
    const doc = createEmptyResume();

    doc.sections.experience.groupSameCompany = true;
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Acme",
        position: "Engineer",
        startDate: "2020-01",
        endDate: "2021-12",
      }),
      ExperienceItemSchema.parse({
        id: "exp-2",
        company: "Acme",
        position: "Senior Engineer",
        startDate: "2022-01",
        endDate: "2023-06",
      }),
    ];

    const text = buildAtsText(doc);

    expect(text).toContain("Engineer\nAcme\nJan 2020 — Dec 2021");
    expect(text).toContain("Senior Engineer\nAcme\nJan 2022 — Jun 2023");
    // ATS text keeps one linear entry per role; the company is not hoisted
    // into a shared group header.
    expect(text.match(/Acme/g)).toHaveLength(2);
  });

  it("expands date ranges, current roles, keywords, and rich summaries", () => {
    const doc = createEmptyResume();

    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Acme",
        position: "Engineer",
        location: "Remote",
        startDate: "2020-01",
        current: true,
        summary: "<ul><li>Shipped the API</li></ul>",
      }),
    ];
    doc.sections.projects.items = [
      ProjectItemSchema.parse({
        id: "proj-1",
        name: "Resume Maker",
        url: "example.com/resume",
        keywords: ["TypeScript"],
      }),
    ];
    doc.sections.certifications.items = [
      CertificationItemSchema.parse({
        id: "cert-1",
        name: "AWS Solutions Architect",
        issuer: "Amazon",
        date: "2023-10-15",
      }),
    ];

    const text = buildAtsText(doc);

    expect(text).toContain("Engineer\nAcme · Remote\nJan 2020 — Present");
    expect(text).toContain("- Shipped the API");
    expect(text).toContain("Resume Maker\nexample.com/resume · TypeScript");
    expect(text).toContain("AWS Solutions Architect\nAmazon\nOct 2023");
  });

  it("includes custom sections in layout order", () => {
    const doc = createEmptyResume();
    const custom = CustomSectionSchema.parse({
      id: "talks",
      title: "Talks",
      items: [{ id: "talk-1", name: "Typing at scale" }],
    });

    doc.customSections = [custom];
    doc.metadata.layout.pages = [
      { fullWidth: false, main: ["summary", "talks"], sidebar: [] },
    ];

    expect(buildAtsText(doc)).toBe("Talks\nTyping at scale");
  });

  it("ignores ids that are not sections", () => {
    const doc = createEmptyResume();

    doc.basics.name = "Ada";
    doc.metadata.layout.pages = [
      { fullWidth: false, main: ["summary", "missing-id"], sidebar: [] },
    ];

    expect(buildAtsText(doc)).toBe("Ada");
  });

  it("prints URL-only profiles and falls back to the website URL", () => {
    const doc = createEmptyResume();

    doc.basics.website = { url: "https://example.com/portfolio", label: "" };
    doc.metadata.layout.pages = [
      { fullWidth: false, main: ["profiles"], sidebar: [] },
    ];
    doc.sections.profiles.items = [
      ProfileItemSchema.parse({
        id: "profile-1",
        network: "",
        username: "",
        url: "https://example.com/ada",
      }),
    ];

    const text = buildAtsText(doc);

    expect(text).toContain("https://example.com/portfolio");
    // The promoted profile uses the same cleaned label as the visual header.
    expect(text).toContain("example.com/ada");
  });

  it("promotes Network + Username profiles without a URL to the ATS contact line", () => {
    const doc = createEmptyResume();

    doc.metadata.layout.pages = [
      { fullWidth: false, main: ["profiles"], sidebar: [] },
    ];
    doc.sections.profiles.items = [
      ProfileItemSchema.parse({
        id: "profile-1",
        network: "GitHub",
        username: "ada",
        url: "",
      }),
      ProfileItemSchema.parse({
        id: "profile-2",
        network: "Portfolio",
        username: "ada",
        url: "",
      }),
    ];

    const text = buildAtsText(doc);

    expect(text).toContain("github.com/ada");
    expect(text).toContain("Portfolio: ada");
    // Both rows are in the contact line, so the body section is not repeated.
    expect(text).not.toContain("PROFILES");
  });

  it("prints education grades and certification/publication URLs", () => {
    const doc = createEmptyResume();

    doc.sections.education.items = [
      EducationItemSchema.parse({
        id: "edu-1",
        school: "University of Example",
        degree: "BSc",
        area: "Computer Science",
        location: "Berlin",
        grade: "3.9",
      }),
    ];
    doc.sections.certifications.items = [
      CertificationItemSchema.parse({
        id: "cert-1",
        name: "AWS Solutions Architect",
        issuer: "Amazon",
        date: "2023-10",
        url: "https://example.com/cert",
      }),
    ];
    doc.sections.publications.items = [
      PublicationItemSchema.parse({
        id: "pub-1",
        title: "Scaling static exports",
        publisher: "Example Press",
        date: "2024-02",
        url: "https://example.com/paper",
      }),
    ];

    const text = buildAtsText(doc);

    expect(text).toContain(
      "BSc\nUniversity of Example · Computer Science · Berlin · 3.9",
    );
    expect(text).toContain("https://example.com/cert");
    expect(text).toContain("https://example.com/paper");
  });
});

describe("buildAtsCopyBlocks", () => {
  it("exposes the same text as buildAtsText, split by section and entry", () => {
    const doc = createEmptyResume();

    doc.basics.name = "Ada Lovelace";
    doc.basics.email = "ada@example.com";
    doc.summary.content = "<p>Engineer with a focus on developer tools.</p>";
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Acme",
        position: "Senior Engineer",
        summary: "<ul><li>Shipped APIs</li></ul>",
      }),
      ExperienceItemSchema.parse({
        id: "exp-2",
        company: "Globex",
        position: "Engineer",
        hidden: true,
      }),
    ];

    const blocks = buildAtsCopyBlocks(doc);

    expect(blocks.text).toBe(buildAtsText(doc));
    expect(blocks.header).toMatchObject({
      id: "header",
      text: "Ada Lovelace\nada@example.com",
    });
    expect(blocks.sections.map((section) => section.id)).toEqual([
      "summary",
      "experience",
    ]);

    const experience = blocks.sections[1];
    const entry = experience.entries[0];

    expect(entry.id).toBe("exp-1");
    expect(entry.label).toBe("Senior Engineer");
    expect(entry.text).toBe("Senior Engineer\nAcme\n- Shipped APIs");
    expect(experience.text).toBe(
      "Experience\nSenior Engineer\nAcme\n- Shipped APIs",
    );
    expect(blocks.text).not.toContain("Globex");
  });

  it("labels keyword-only skills entries by their first keyword", () => {
    const doc = createEmptyResume();

    doc.sections.skills.items = [
      SkillItemSchema.parse({
        id: "skill-1",
        name: "",
        level: 0,
        keywords: ["SQL", "Excel"],
      }),
    ];

    const [skills] = buildAtsCopyBlocks(doc).sections;

    expect(skills.entries[0]).toMatchObject({
      id: "skill-1",
      label: "SQL",
      text: "SQL, Excel",
    });
    expect(skills.text).toBe("Skills\nSQL, Excel");
  });
});
