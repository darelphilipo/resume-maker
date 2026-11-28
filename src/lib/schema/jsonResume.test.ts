import { describe, expect, it } from "vitest";

import { ResumeDocumentSchema } from "@/lib/schema/resume.schema";

import {
  isJsonResumeDocument,
  JSON_RESUME_SCHEMA_URL,
  resumeFromJsonResume,
  serializeJsonResume,
  toJsonResume,
} from "./jsonResume";

function docFrom(partial: unknown) {
  return ResumeDocumentSchema.parse(partial);
}

describe("isJsonResumeDocument", () => {
  it("recognises the official schema marker and standard section arrays", () => {
    expect(
      isJsonResumeDocument({ $schema: JSON_RESUME_SCHEMA_URL, basics: {} }),
    ).toBe(true);
    expect(isJsonResumeDocument({ work: [] })).toBe(true);
    expect(isJsonResumeDocument({ projects: [{ name: "Compiler" }] })).toBe(
      true,
    );
  });

  it("recognises JSON Resume-only basics fields", () => {
    expect(isJsonResumeDocument({ basics: { label: "Engineer" } })).toBe(true);
    expect(
      isJsonResumeDocument({ basics: { profiles: [{ url: "github.com/ada" }] } }),
    ).toBe(true);
    expect(
      isJsonResumeDocument({ basics: { location: { city: "Berlin" } } }),
    ).toBe(true);
    expect(
      isJsonResumeDocument({ basics: { url: "https://ada.example.com" } }),
    ).toBe(true);
  });

  it("never re-interprets a Resume Maker backup", () => {
    expect(
      isJsonResumeDocument({
        basics: { name: "Ada" },
        metadata: { layout: { pages: [] } },
      }),
    ).toBe(false);
    expect(isJsonResumeDocument({ sections: { experience: { items: [] } } })).toBe(
      false,
    );
    expect(isJsonResumeDocument({ customSections: [] })).toBe(false);
  });

  it("leaves a minimal plain object to the normal schema", () => {
    expect(isJsonResumeDocument({ basics: { name: "Ada" } })).toBe(false);
    expect(isJsonResumeDocument("resume")).toBe(false);
    expect(isJsonResumeDocument(null)).toBe(false);
  });
});

describe("resumeFromJsonResume", () => {
  it("maps basics, profiles, and the summary into editable fields", () => {
    const doc = resumeFromJsonResume({
      basics: {
        name: "Grace Hopper",
        label: "Rear Admiral",
        email: "grace@example.com",
        phone: "555-0100",
        url: "https://grace.example.com/",
        image: "https://grace.example.com/photo.png",
        summary: "Built compilers.\n\nTaught COBOL.",
        location: { city: "Arlington", region: "VA", countryCode: "US" },
        profiles: [
          {
            network: "",
            username: "",
            url: "https://github.com/grace",
          },
        ],
      },
    });

    expect(doc.basics.name).toBe("Grace Hopper");
    expect(doc.basics.headline).toBe("Rear Admiral");
    expect(doc.basics.email).toBe("grace@example.com");
    expect(doc.basics.location).toBe("Arlington, VA, US");
    expect(doc.basics.website).toEqual({
      url: "https://grace.example.com/",
      label: "grace.example.com",
    });
    expect(doc.picture).toMatchObject({
      hidden: false,
      url: "https://grace.example.com/photo.png",
    });
    expect(doc.summary.content).toBe(
      "<p>Built compilers.</p><p>Taught COBOL.</p>",
    );
    expect(doc.sections.profiles.items[0]).toMatchObject({
      network: "GitHub",
      username: "grace",
      url: "https://github.com/grace",
      icon: "github",
    });
  });

  it("maps work, volunteer, and projects with ISO dates and highlights", () => {
    const doc = resumeFromJsonResume({
      work: [
        {
          name: "US Navy",
          position: "Computer Scientist",
          location: "Arlington, VA",
          startDate: "1944-01-01T00:00:00.000Z",
          endDate: "1986-01-01",
          summary: "Worked on compilers.",
          highlights: ["Built the first compiler", "Standardized COBOL"],
        },
        { name: "Harvard", position: "Instructor", startDate: "1946-01" },
      ],
      volunteer: [
        {
          organization: "Computing History",
          position: "Advisor",
          summary: "Mentored students.",
        },
      ],
      projects: [
        {
          name: "Compiler",
          description: "A compiler for FLOW-MATIC.",
          highlights: ["Shipped to the Navy"],
          keywords: ["compilers", "COBOL"],
          startDate: "1952-03",
          url: "https://example.com/compiler",
        },
      ],
    });

    expect(doc.sections.experience.items[0]).toMatchObject({
      company: "US Navy",
      position: "Computer Scientist",
      location: "Arlington, VA",
      startDate: "1944-01",
      endDate: "1986-01",
      current: false,
    });
    expect(doc.sections.experience.items[0].summary).toContain(
      "Built the first compiler",
    );
    expect(doc.sections.experience.items[1]).toMatchObject({
      startDate: "1946-01",
      endDate: "",
      current: true,
    });
    expect(doc.sections.volunteer.items[0]).toMatchObject({
      organization: "Computing History",
      position: "Advisor",
    });
    expect(doc.sections.projects.items[0]).toMatchObject({
      name: "Compiler",
      startDate: "1952-03",
      endDate: "",
      current: true,
      keywords: ["compilers", "COBOL"],
    });
    expect(doc.sections.projects.items[0].description).toContain(
      "Shipped to the Navy",
    );
  });

  it("keeps year-first slash dates when importing entries", () => {
    const doc = resumeFromJsonResume({
      work: [
        {
          name: "Acme",
          position: "Engineer",
          startDate: "2023/10/15",
          endDate: "2024/3",
        },
      ],
      education: [
        {
          institution: "University",
          area: "CS",
          startDate: "2019/9",
          endDate: "2023/6/30",
        },
      ],
    });

    expect(doc.sections.experience.items[0]).toMatchObject({
      startDate: "2023-10",
      endDate: "2024-03",
    });
    expect(doc.sections.education.items[0]).toMatchObject({
      startDate: "2019-09",
      endDate: "2023-06",
    });
  });

  it("maps education, skills, awards, certificates, languages, interests, publications, and references", () => {
    const doc = resumeFromJsonResume({
      education: [
        {
          institution: "Yale University",
          studyType: "PhD",
          area: "Mathematics",
          score: "4.0",
          startDate: "1930-09-01",
          endDate: "1934-06-01",
          courses: ["Algebra", "Number theory"],
        },
      ],
      skills: [
        { name: "Languages", level: "4", keywords: ["COBOL", "FLOW-MATIC"] },
        { keywords: ["Debugging"] },
      ],
      awards: [
        {
          title: "Presidential Medal of Freedom",
          date: "2016-11-22",
          awarder: "United States",
          summary: "For contributions to computing.",
        },
      ],
      certificates: [
        {
          name: "Compiler Design",
          date: "1952-01-01",
          issuer: "US Navy",
          url: "https://example.com/cert",
        },
      ],
      languages: [{ language: "English", fluency: "Native" }],
      interests: [{ name: "Computing", keywords: ["Compilers"] }],
      publications: [
        {
          name: "The Education of a Computer",
          publisher: "ACM",
          releaseDate: "1952-05-01",
          url: "https://example.com/paper",
          summary: "A paper on compilers.",
        },
      ],
      references: [
        {
          name: "Ada Lovelace",
          reference: "A brilliant collaborator.",
        },
      ],
    });

    expect(doc.sections.education.items[0]).toMatchObject({
      school: "Yale University",
      degree: "PhD",
      area: "Mathematics",
      grade: "4.0",
      startDate: "1930-09",
      endDate: "1934-06",
    });
    expect(doc.sections.education.items[0].summary).toContain("Algebra");
    expect(doc.sections.skills.items[0]).toMatchObject({
      name: "Languages",
      level: 4,
      keywords: ["COBOL", "FLOW-MATIC"],
    });
    expect(doc.sections.skills.items[1]).toMatchObject({
      name: "",
      keywords: ["Debugging"],
    });
    expect(doc.sections.awards.items[0]).toMatchObject({
      title: "Presidential Medal of Freedom",
      date: "2016-11",
      awarder: "United States",
    });
    expect(doc.sections.certifications.items[0]).toMatchObject({
      name: "Compiler Design",
      issuer: "US Navy",
      date: "1952-01",
      url: "https://example.com/cert",
    });
    expect(doc.sections.languages.items[0]).toMatchObject({
      name: "English",
      fluency: "Native",
    });
    expect(doc.sections.interests.items[0]).toMatchObject({
      name: "Computing",
      keywords: ["Compilers"],
    });
    expect(doc.sections.publications.items[0]).toMatchObject({
      title: "The Education of a Computer",
      publisher: "ACM",
      date: "1952-05",
      url: "https://example.com/paper",
    });
    expect(doc.sections.references.items[0]).toMatchObject({
      name: "Ada Lovelace",
      summary: "<p>A brilliant collaborator.</p>",
    });
  });

  it("skips entries that carry no usable identity", () => {
    const doc = resumeFromJsonResume({
      work: [{ summary: "Orphan notes" }, { name: "" }],
      education: [{}],
      skills: [{}],
      awards: [{}],
      references: [{}],
    });

    expect(doc.sections.experience.items).toEqual([]);
    expect(doc.sections.education.items).toEqual([]);
    expect(doc.sections.skills.items).toEqual([]);
    expect(doc.sections.awards.items).toEqual([]);
    expect(doc.sections.references.items).toEqual([]);
  });
});

describe("toJsonResume", () => {
  it("writes standard sections, split highlights, and full ISO dates", () => {
    const doc = docFrom({
      basics: {
        name: "Ada Lovelace",
        headline: "Mathematician",
        email: "ada@example.com",
        phone: "555-0101",
        location: "London, UK",
        website: { url: "https://ada.example.com", label: "ada.example.com" },
      },
      picture: { hidden: false, url: "https://ada.example.com/ada.png" },
      summary: { content: "<p>Wrote the first algorithm.</p>" },
      sections: {
        profiles: {
          items: [
            {
              id: "p1",
              network: "GitHub",
              username: "ada",
              url: "https://github.com/ada",
            },
          ],
        },
        experience: {
          items: [
            {
              id: "e1",
              company: "Analytical Engines",
              position: "Mathematician",
              location: "London",
              startDate: "1842-06",
              endDate: "1843-09",
              summary:
                "<p>Wrote notes.</p><ul><li>First algorithm</li><li>Looping</li></ul>",
            },
          ],
        },
        projects: {
          items: [
            {
              id: "pr1",
              name: "Notes",
              description:
                "<p>Annotated the engine.</p><ul><li>Published 1843</li></ul>",
              url: "https://example.com/notes",
              keywords: ["engines"],
            },
          ],
        },
        skills: {
          items: [{ id: "s1", name: "Mathematics", keywords: ["Algebra"] }],
        },
      },
    });

    const json = toJsonResume(doc);

    expect(json.$schema).toBe(JSON_RESUME_SCHEMA_URL);
    expect(json.basics).toMatchObject({
      name: "Ada Lovelace",
      label: "Mathematician",
      image: "https://ada.example.com/ada.png",
      summary: "Wrote the first algorithm.",
      location: { city: "London", region: "UK" },
      profiles: [
        {
          network: "GitHub",
          username: "ada",
          url: "https://github.com/ada",
        },
      ],
    });
    expect(json.work?.[0]).toEqual({
      name: "Analytical Engines",
      position: "Mathematician",
      location: "London",
      url: "",
      startDate: "1842-06-01",
      endDate: "1843-09-01",
      summary: "Wrote notes.",
      highlights: ["First algorithm", "Looping"],
    });
    expect(json.projects?.[0]).toMatchObject({
      name: "Notes",
      description: "Annotated the engine.",
      highlights: ["Published 1843"],
      keywords: ["engines"],
      url: "https://example.com/notes",
    });
    expect(json.skills).toEqual([
      { name: "Mathematics", keywords: ["Algebra"] },
    ]);
  });

  it("omits hidden sections, hidden entries, and empty sections", () => {
    const doc = docFrom({
      sections: {
        experience: {
          hidden: true,
          items: [{ id: "e1", company: "Secret Co" }],
        },
        skills: {
          items: [
            { id: "s1", name: "Rust", hidden: true },
            { id: "s2", name: "Go" },
          ],
        },
        awards: { items: [] },
      },
    });

    const json = toJsonResume(doc);

    expect(json.work).toBeUndefined();
    expect(json.awards).toBeUndefined();
    expect(json.skills).toEqual([{ name: "Go", keywords: [] }]);
  });

  it("keeps a current role open-ended instead of inventing an end date", () => {
    const doc = docFrom({
      sections: {
        experience: {
          items: [
            {
              id: "e1",
              company: "Open Co",
              position: "Engineer",
              startDate: "2024-02",
              endDate: "2025-01",
              current: true,
            },
          ],
        },
      },
    });

    expect(toJsonResume(doc).work?.[0]).toMatchObject({
      startDate: "2024-02-01",
      endDate: "",
    });
  });

  it("keeps a current project open-ended instead of exporting a stale end date", () => {
    const doc = docFrom({
      sections: {
        projects: {
          items: [
            {
              id: "p1",
              name: "Open Dashboard",
              startDate: "2024-02",
              endDate: "2025-01",
              current: true,
            },
          ],
        },
      },
    });

    expect(toJsonResume(doc).projects?.[0]).toMatchObject({
      startDate: "2024-02-01",
      endDate: "",
    });
  });
});

describe("round trip", () => {
  it("returns the same editable core after export and import", () => {
    const source = docFrom({
      basics: {
        name: "Grace Hopper",
        headline: "Computer Scientist",
        email: "grace@example.com",
        location: "New York, NY",
      },
      summary: { content: "<p>Compiler pioneer.</p>" },
      sections: {
        experience: {
          items: [
            {
              id: "e1",
              company: "US Navy",
              position: "Rear Admiral",
              startDate: "1944-01",
              endDate: "1986-01",
              summary: "<p>Led computing.</p><ul><li>Built a compiler</li></ul>",
            },
          ],
        },
        education: {
          items: [
            {
              id: "ed1",
              school: "Yale University",
              degree: "PhD",
              area: "Mathematics",
              grade: "4.0",
            },
          ],
        },
        skills: {
          items: [
            { id: "s1", name: "Languages", keywords: ["COBOL", "FLOW-MATIC"] },
          ],
        },
      },
    });

    const roundTripped = resumeFromJsonResume(
      JSON.parse(serializeJsonResume(source)),
    );

    expect(roundTripped.basics.name).toBe("Grace Hopper");
    expect(roundTripped.basics.headline).toBe("Computer Scientist");
    expect(roundTripped.summary.content).toBe("<p>Compiler pioneer.</p>");
    expect(roundTripped.sections.experience.items[0]).toMatchObject({
      company: "US Navy",
      position: "Rear Admiral",
      startDate: "1944-01",
      endDate: "1986-01",
    });
    expect(roundTripped.sections.experience.items[0].summary).toContain(
      "Built a compiler",
    );
    expect(roundTripped.sections.education.items[0]).toMatchObject({
      school: "Yale University",
      degree: "PhD",
      area: "Mathematics",
      grade: "4.0",
    });
    expect(roundTripped.sections.skills.items[0]).toMatchObject({
      name: "Languages",
      keywords: ["COBOL", "FLOW-MATIC"],
    });
  });
});

describe("serializeJsonResume", () => {
  it("produces indented, parseable JSON", () => {
    const serialized = serializeJsonResume(docFrom({ basics: { name: "Ada" } }));

    expect(serialized).toContain('"$schema"');
    expect(JSON.parse(serialized)).toMatchObject({
      basics: { name: "Ada" },
    });
  });
});
