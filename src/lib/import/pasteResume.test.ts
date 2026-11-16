import { describe, expect, it } from "vitest";

import { parsePastedResume } from "./pasteResume";

const SAMPLE = `Jane Doe
Senior Software Engineer
jane.doe@example.com | (555) 123-4567 | Seattle, WA
linkedin.com/in/janedoe | github.com/janedoe | janedoe.dev

SUMMARY
Backend engineer with 8 years of experience building reliable APIs.

EXPERIENCE
Senior Software Engineer
Acme Corp | Seattle, WA
Jan 2020 - Present
- Cut checkout latency by 40%.
- Led a team of 5 engineers.

Software Engineer
Beta Labs | Jan 2017 - Dec 2019
- Built the first billing service.

EDUCATION
B.S. in Computer Science
University of Washington | Seattle, WA
Sep 2012 - Jun 2016
GPA: 3.8

SKILLS
Languages: TypeScript, Python
Cloud: AWS, Docker`;

describe("parsePastedResume", () => {
  it("parses contact details, profiles, and a website from the header", () => {
    const doc = parsePastedResume(SAMPLE);

    expect(doc).not.toBeNull();
    expect(doc?.basics.name).toBe("Jane Doe");
    expect(doc?.basics.headline).toBe("Senior Software Engineer");
    expect(doc?.basics.email).toBe("jane.doe@example.com");
    expect(doc?.basics.phone).toBe("(555) 123-4567");
    expect(doc?.basics.location).toBe("Seattle, WA");
    expect(doc?.basics.website).toEqual({
      url: "https://janedoe.dev",
      label: "janedoe.dev",
    });
    expect(doc?.sections.profiles.items).toEqual([
      expect.objectContaining({ network: "LinkedIn", username: "janedoe" }),
      expect.objectContaining({ network: "GitHub", username: "janedoe" }),
    ]);
  });

  it("parses experience entries, date ranges, and bullets", () => {
    const doc = parsePastedResume(SAMPLE);
    const items = doc?.sections.experience.items ?? [];

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      position: "Senior Software Engineer",
      company: "Acme Corp",
      location: "Seattle, WA",
      startDate: "2020-01",
      endDate: "",
      current: true,
    });
    expect(items[0]?.summary).toContain("<ul>");
    expect(items[0]?.summary).toContain("Cut checkout latency by 40%.");
    expect(items[1]).toMatchObject({
      position: "Software Engineer",
      company: "Beta Labs",
      startDate: "2017-01",
      endDate: "2019-12",
      current: false,
    });
  });

  it("parses education fields and GPA", () => {
    const doc = parsePastedResume(SAMPLE);
    const items = doc?.sections.education.items ?? [];

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      school: "University of Washington",
      degree: "B.S.",
      area: "Computer Science",
      location: "Seattle, WA",
      startDate: "2012-09",
      endDate: "2016-06",
      grade: "3.8 GPA",
    });
  });

  it("keeps labeled skill categories and their keywords", () => {
    const doc = parsePastedResume(SAMPLE);

    expect(doc?.sections.skills.items).toEqual([
      expect.objectContaining({
        name: "Languages",
        keywords: ["TypeScript", "Python"],
      }),
      expect.objectContaining({
        name: "Cloud",
        keywords: ["AWS", "Docker"],
      }),
    ]);
  });

  it("wraps the summary as rich text", () => {
    const doc = parsePastedResume(SAMPLE);

    expect(doc?.summary.content).toBe(
      "<p>Backend engineer with 8 years of experience building reliable APIs.</p>",
    );
  });

  it("handles reversed company/title order and year-only dates", () => {
    const doc = parsePastedResume(`Alex Kim
Product Manager
alex@example.com

EXPERIENCE
Acme Corp — Senior Product Manager
2020 - 2023
- Grew activation by 20%.

Beta Studio - Product Manager
2018 - 2020
- Shipped the first mobile app.`);

    const items = doc?.sections.experience.items ?? [];

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      position: "Senior Product Manager",
      company: "Acme Corp",
      startDate: "2020-01",
      endDate: "2023-12",
    });
    expect(items[1]).toMatchObject({
      position: "Product Manager",
      company: "Beta Studio",
    });
  });

  it("splits multiple entries that have no blank lines between them", () => {
    const doc = parsePastedResume(`Sam Rivera
Engineer
sam@example.com

EXPERIENCE
Senior Engineer
Acme | 2020 - Present
- Did the first thing.
Engineer
Beta | 2018 - 2019
- Did the second thing.`);

    expect(doc?.sections.experience.items).toHaveLength(2);
  });

  it("does not fold unparsed sections into experience", () => {
    const doc = parsePastedResume(`Jamie Lee
Designer
jamie@example.com

EXPERIENCE
Designer
Studio | 2020 - Present
- Designed things.

PROJECTS
Side Project
- Not an experience entry.`);

    const items = doc?.sections.experience.items ?? [];

    expect(items).toHaveLength(1);
    expect(items[0]?.company).toBe("Studio");
  });

  it("merges unlabeled skill lines into one keyword row", () => {
    const doc = parsePastedResume(`Robin Park
Analyst
robin@example.com

SKILLS
SQL, Excel
Python
Tableau`);

    const items = doc?.sections.skills.items ?? [];

    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe("");
    expect(items[0]?.keywords).toEqual(["SQL", "Excel", "Python", "Tableau"]);
  });

  it("escapes HTML in pasted body text", () => {
    const doc = parsePastedResume(`Casey Ng
Engineer
casey@example.com

SUMMARY
Built <script>alert(1)</script> checks.`);

    expect(doc?.summary.content).toContain("&lt;script&gt;");
    expect(doc?.summary.content).not.toContain("<script>");
  });

  it("returns null for text that does not look like a resume", () => {
    expect(parsePastedResume("   ")).toBeNull();
    expect(parsePastedResume("just some notes about my weekend")).toBeNull();
  });
});
