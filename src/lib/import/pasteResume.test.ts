import { describe, expect, it } from "vitest";

import type { PdfLine } from "./pdfLayout";
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

  it("keeps a comma inside an institution name instead of inventing a location", () => {
    const doc = parsePastedResume(`Dana Wu
Economist
dana@example.com

EDUCATION
University of California, Berkeley
B.A. in Economics
2010 - 2014`);

    const items = doc?.sections.education.items ?? [];

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      school: "University of California, Berkeley",
      degree: "B.A.",
      area: "Economics",
      location: "",
      startDate: "2010-01",
      endDate: "2014-12",
    });
  });

  it("keeps a school and a comma-separated location on one line", () => {
    const doc = parsePastedResume(`Priya Shah
Engineer
priya@example.com

EDUCATION
University of Washington | Seattle, WA
B.S. in Computer Science
2012 - 2016`);

    const items = doc?.sections.education.items ?? [];

    expect(items[0]).toMatchObject({
      school: "University of Washington",
      degree: "B.S.",
      area: "Computer Science",
      location: "Seattle, WA",
    });
  });

  it("keeps skills under heading variants such as Skills & Expertise", () => {
    const doc = parsePastedResume(`Morgan Bell
Designer
morgan@example.com

SKILLS & EXPERTISE
Design: Figma, Prototyping
Research: Interviews, Usability testing`);

    const items = doc?.sections.skills.items ?? [];

    expect(items).toEqual([
      expect.objectContaining({
        name: "Design",
        keywords: ["Figma", "Prototyping"],
      }),
      expect.objectContaining({
        name: "Research",
        keywords: ["Interviews", "Usability testing"],
      }),
    ]);
  });

  it("reads an all-caps inline skills heading", () => {
    const doc = parsePastedResume(`Taylor Reed
Analyst
taylor@example.com

SKILLS: SQL, Python, Tableau`);

    const items = doc?.sections.skills.items ?? [];

    expect(items).toHaveLength(1);
    expect(items[0]?.keywords).toEqual(["SQL", "Python", "Tableau"]);
  });

  it("does not treat a title-case skill category as a new section", () => {
    const doc = parsePastedResume(`Avery Cole
Engineer
avery@example.com

SKILLS
Languages: TypeScript, Python
Cloud: AWS`);

    expect(doc?.sections.skills.items).toEqual([
      expect.objectContaining({
        name: "Languages",
        keywords: ["TypeScript", "Python"],
      }),
      expect.objectContaining({ name: "Cloud", keywords: ["AWS"] }),
    ]);
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

  it("parses projects, certifications, awards, languages, interests, volunteer, publications, and references", () => {
    const doc = parsePastedResume(`Jordan Lee
Data Engineer
jordan.lee@example.com | (206) 555-0102 | Seattle, WA

CONTACT
linkedin.com/in/jordanlee | jordanlee.dev

PROJECTS
Revenue Dashboard
React, TypeScript
Jan 2023 - Present
- Built a dashboard used by 200 analysts.

CERTIFICATIONS & AWARDS
AWS Certified Solutions Architect — Amazon Web Services (2023)
Certified Scrum Master — Scrum Alliance (2022)

AWARDS
Employee of the Year — Acme Corp (2021)
- Recognized for leading the migration.

LANGUAGES
English (Native), Spanish (Professional)

INTERESTS
Hiking • Chess

VOLUNTEER
Volunteer Mentor
Code for Seattle | Seattle, WA
2021 - 2022
- Mentored four junior developers.

PUBLICATIONS
Streaming at Scale — Data Weekly, Mar 2024
- A practical guide to event pipelines.
https://dataweekly.example.com/streaming-at-scale

REFERENCES
Jane Smith
Engineering Manager, Acme Corp
jane.smith@example.com | (555) 987-6543`);

    expect(doc?.basics).toMatchObject({
      name: "Jordan Lee",
      headline: "Data Engineer",
      email: "jordan.lee@example.com",
      phone: "(206) 555-0102",
      location: "Seattle, WA",
    });
    expect(doc?.sections.profiles.items).toEqual([
      expect.objectContaining({ network: "LinkedIn", username: "jordanlee" }),
    ]);
    expect(doc?.basics.website.url).toBe("https://jordanlee.dev");

    expect(doc?.sections.projects.items).toEqual([
      expect.objectContaining({
        name: "Revenue Dashboard",
        keywords: ["React", "TypeScript"],
        startDate: "2023-01",
        endDate: "",
      }),
    ]);
    expect(doc?.sections.projects.items[0]?.description).toContain(
      "Built a dashboard used by 200 analysts.",
    );

    expect(doc?.sections.certifications.items).toEqual([
      expect.objectContaining({
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        date: "2023",
      }),
      expect.objectContaining({
        name: "Certified Scrum Master",
        issuer: "Scrum Alliance",
        date: "2022",
      }),
    ]);

    expect(doc?.sections.awards.items).toEqual([
      expect.objectContaining({
        title: "Employee of the Year",
        awarder: "Acme Corp",
        date: "2021",
      }),
    ]);
    expect(doc?.sections.awards.items[0]?.summary).toContain(
      "Recognized for leading the migration.",
    );

    expect(doc?.sections.languages.items).toEqual([
      expect.objectContaining({ name: "English", fluency: "Native" }),
      expect.objectContaining({ name: "Spanish", fluency: "Professional" }),
    ]);
    expect(doc?.sections.interests.items.map((item) => item.name)).toEqual([
      "Hiking",
      "Chess",
    ]);

    expect(doc?.sections.volunteer.items).toEqual([
      expect.objectContaining({
        organization: "Code for Seattle",
        position: "Volunteer Mentor",
        location: "Seattle, WA",
        startDate: "2021-01",
        endDate: "2022-12",
      }),
    ]);

    expect(doc?.sections.publications.items).toEqual([
      expect.objectContaining({
        title: "Streaming at Scale",
        publisher: "Data Weekly",
        date: "2024-03",
        url: "https://dataweekly.example.com/streaming-at-scale",
      }),
    ]);
    expect(doc?.sections.publications.items[0]?.summary).toContain(
      "A practical guide to event pipelines.",
    );

    expect(doc?.sections.references.items).toEqual([
      expect.objectContaining({
        name: "Jane Smith",
        position: "Engineering Manager",
        company: "Acme Corp",
        email: "jane.smith@example.com",
        phone: "(555) 987-6543",
      }),
    ]);
  });

  it("keeps Hard skills and Soft skills headings as categories and splits inline bullets", () => {
    const doc = parsePastedResume(`Nina Torres
Data Analyst
nina@example.com

SKILLS
Languages: Python • SQL

HARD SKILLS
Docker ▪ Kubernetes ▪ Terraform
dbt • Snowflake

SOFT SKILLS
Communication · Mentoring`);

    expect(doc?.sections.skills.items).toEqual([
      expect.objectContaining({
        name: "Languages",
        keywords: ["Python", "SQL"],
      }),
      expect.objectContaining({
        name: "Hard skills",
        keywords: ["Docker", "Kubernetes", "Terraform", "dbt", "Snowflake"],
      }),
      expect.objectContaining({
        name: "Soft skills",
        keywords: ["Communication", "Mentoring"],
      }),
    ]);
  });

  it("collects links from a Profiles section and de-duplicates header links", () => {
    const doc = parsePastedResume(`Omar Haddad
Product Designer
omar@example.com
linkedin.com/in/omhaddad

PROFILES
github.com/omhaddad
https://omhaddad.design
linkedin.com/in/omhaddad`);

    const items = doc?.sections.profiles.items ?? [];

    expect(items).toHaveLength(3);
    expect(items).toEqual([
      expect.objectContaining({ network: "LinkedIn", username: "omhaddad" }),
      expect.objectContaining({ network: "GitHub", username: "omhaddad" }),
      expect.objectContaining({
        network: "",
        url: "https://omhaddad.design",
      }),
    ]);
  });

  it("routes contact headings to the header and recognizes expanded aliases", () => {
    const doc = parsePastedResume(`Mina Patel
Backend Engineer

CONTACT DETAILS
mina@example.com | +1 415 555 0111 | linkedin.com/in/minapatel

INTERNSHIPS
Software Engineering Intern
Acme | Jun 2022 - Aug 2022
- Shipped an API.

EDUCATION BACKGROUND
B.S. in Computer Science
State University | 2018 - 2022

EXTRACURRICULAR ACTIVITIES
Coding Club Lead
State University | 2021 - 2022
- Ran weekly workshops.`);

    expect(doc?.basics).toMatchObject({
      name: "Mina Patel",
      headline: "Backend Engineer",
      email: "mina@example.com",
      phone: "+1 415 555 0111",
    });
    expect(doc?.sections.profiles.items).toEqual([
      expect.objectContaining({ network: "LinkedIn", username: "minapatel" }),
    ]);

    expect(doc?.sections.experience.items).toEqual([
      expect.objectContaining({
        position: "Software Engineering Intern",
        company: "Acme",
        startDate: "2022-06",
        endDate: "2022-08",
      }),
    ]);
    expect(doc?.sections.education.items).toEqual([
      expect.objectContaining({
        school: "State University",
        degree: "B.S.",
        area: "Computer Science",
      }),
    ]);
    expect(doc?.sections.volunteer.items).toEqual([
      expect.objectContaining({
        organization: "State University",
        position: "Coding Club Lead",
      }),
    ]);
  });
});

describe("paste-import resume archetypes", () => {
  it("reads a Reactive Resume-style single-column export with icon-only contact lines", () => {
    const doc = parsePastedResume(`Daniel Okafor
Senior Product Manager

daniel.okafor@example.com
(415) 555-0188
San Francisco, CA
linkedin.com/in/danielokafor
github.com/danielokafor

PROFESSIONAL SUMMARY
Product manager with nine years of experience shipping data-driven products.

EXPERIENCE
Senior Product Manager
Acme Corp
San Francisco, CA
Jan 2021 - Present
- Grew activation by 32%.
- Led a team of six engineers.

Product Manager
Beta Labs | 2017 - 2020
- Shipped the first mobile app.

EDUCATION
B.S. in Computer Science
University of California, Berkeley
2012 - 2016

SKILLS
Product: Roadmapping, A/B testing
Analytics: SQL, Amplitude`);

    expect(doc?.basics).toMatchObject({
      name: "Daniel Okafor",
      headline: "Senior Product Manager",
      email: "daniel.okafor@example.com",
      phone: "(415) 555-0188",
      location: "San Francisco, CA",
    });
    expect(doc?.sections.profiles.items.map((item) => item.network)).toEqual([
      "LinkedIn",
      "GitHub",
    ]);
    expect(doc?.summary.content).toContain(
      "Product manager with nine years of experience",
    );

    const experience = doc?.sections.experience.items ?? [];
    expect(experience).toHaveLength(2);
    expect(experience[0]).toMatchObject({
      position: "Senior Product Manager",
      company: "Acme Corp",
      location: "San Francisco, CA",
      startDate: "2021-01",
      current: true,
    });
    expect(experience[0]?.summary).toContain("Grew activation by 32%.");
    expect(experience[1]).toMatchObject({
      position: "Product Manager",
      company: "Beta Labs",
      startDate: "2017-01",
      endDate: "2020-12",
    });
    expect(doc?.sections.education.items[0]).toMatchObject({
      school: "University of California, Berkeley",
      degree: "B.S.",
      area: "Computer Science",
      startDate: "2012-01",
      endDate: "2016-12",
    });
    expect(doc?.sections.skills.items.map((item) => item.name)).toEqual([
      "Product",
      "Analytics",
    ]);
  });

  it("reads an unlabelled opening summary, three-column skills, and non-US dates and locations", () => {
    const doc = parsePastedResume(`Priya Nair
Staff Data Engineer

Results-driven data engineer with a decade of experience building reliable data pipelines. Led platform
migrations for three enterprises and cut costs by 30%. Mentored a team of eight engineers across two sites.

HARD SKILLS
Python • SQL • Spark
dbt • Snowflake • Airflow

SOFT SKILLS
Mentoring • Communication

EXPERIENCE
Analytics Engineer
Gamma Studio
Apr 2026
- Modelled the warehouse.

EDUCATION
B.S. in Computer Science
Bengaluru University
Bengaluru, Karnataka, India
Completed in 2018`);

    expect(doc?.basics.name).toBe("Priya Nair");
    expect(doc?.basics.headline).toBe("Staff Data Engineer");
    expect(doc?.summary.content).toBe(
      "<p>Results-driven data engineer with a decade of experience building reliable data pipelines. Led platform migrations for three enterprises and cut costs by 30%. Mentored a team of eight engineers across two sites.</p>",
    );
    expect(doc?.sections.skills.items).toEqual([
      expect.objectContaining({
        name: "Hard skills",
        keywords: ["Python", "SQL", "Spark", "dbt", "Snowflake", "Airflow"],
      }),
      expect.objectContaining({
        name: "Soft skills",
        keywords: ["Mentoring", "Communication"],
      }),
    ]);
    expect(doc?.sections.experience.items).toEqual([
      expect.objectContaining({
        position: "Analytics Engineer",
        company: "Gamma Studio",
        startDate: "2026-04",
        endDate: "",
      }),
    ]);
    expect(doc?.sections.education.items).toEqual([
      expect.objectContaining({
        school: "Bengaluru University",
        location: "Bengaluru, Karnataka, India",
        endDate: "2018-12",
      }),
    ]);
  });

  it("reads a reconstructed two-page two-column Canva export in banner-left-right order", () => {
    const doc = parsePastedResume(`Maya Chen
Senior UX Researcher

MY CONTACT
maya.chen@example.com | +44 20 7946 0958 | linkedin.com/in/mayachen

PROFESSIONAL SUMMARY
UX researcher with twelve years of experience across fintech and health. Led studies in fourteen countries.

EXPERIENCE
Senior UX Researcher
Northstar Studio as Head of Research
London
Jan 2020 - Present
- Ran 60 discovery interviews.

- Published the research playbook.

Lead UX Researcher
Orbit Labs
2016 - 2019
- Built the insight repository.

SKILLS
Research: Interviews, Usability testing
Tools: Dovetail, Maze`);

    expect(doc?.basics).toMatchObject({
      name: "Maya Chen",
      headline: "Senior UX Researcher",
      email: "maya.chen@example.com",
      phone: "+44 20 7946 0958",
    });
    expect(doc?.sections.profiles.items).toEqual([
      expect.objectContaining({ network: "LinkedIn", username: "mayachen" }),
    ]);

    const experience = doc?.sections.experience.items ?? [];
    expect(experience).toHaveLength(2);
    expect(experience[0]).toMatchObject({
      position: "Head of Research",
      company: "Northstar Studio",
      location: "London",
      startDate: "2020-01",
      current: true,
    });
    expect(experience[0]?.summary).toContain("Published the research playbook.");
    expect(experience[1]).toMatchObject({
      position: "Lead UX Researcher",
      company: "Orbit Labs",
      startDate: "2016-01",
      endDate: "2019-12",
    });
    expect(doc?.sections.skills.items.map((item) => item.name)).toEqual([
      "Research",
      "Tools",
    ]);
  });

  it("falls back to contact details that are not in the top header", () => {
    const doc = parsePastedResume(`Leo Martins
Product Designer

SKILLS
Contact: leo.martins@example.com | +1 415 555 0111 | linkedin.com/in/leomartins
Figma, Prototyping`);

    expect(doc?.basics.email).toBe("leo.martins@example.com");
    expect(doc?.basics.phone).toBe("+1 415 555 0111");
    expect(doc?.sections.profiles.items).toEqual([
      expect.objectContaining({ network: "LinkedIn", username: "leomartins" }),
    ]);
  });

  it("keeps a role intact across PDF paragraph gaps between bullets", () => {
    const doc = parsePastedResume(`Sam Ito
Engineer
sam@example.com

EXPERIENCE
Senior Engineer
Acme | 2020 - Present
- Built the first service.

- Reduced latency by 40%.

- Mentored two engineers.`);

    const items = doc?.sections.experience.items ?? [];
    expect(items).toHaveLength(1);
    expect(items[0]?.summary).toContain("Reduced latency by 40%.");
    expect(items[0]?.summary).toContain("Mentored two engineers.");
  });

  it("reads an expected single date as the education end date", () => {
    const doc = parsePastedResume(`Nora Lang
Analyst
nora@example.com

EDUCATION
M.Sc. in Statistics
State University
Expected May 2027`);

    expect(doc?.sections.education.items).toEqual([
      expect.objectContaining({
        school: "State University",
        degree: "M.Sc.",
        area: "Statistics",
        startDate: "",
        endDate: "2027-05",
        current: false,
      }),
    ]);
  });

  it("reads a bare year on an education entry as a single date", () => {
    const doc = parsePastedResume(`Owen Brooks
Designer
owen@example.com

EDUCATION
B.A. in Design
State University
2014`);

    expect(doc?.sections.education.items[0]).toMatchObject({
      endDate: "2014-12",
    });
  });
});

function pdfLine(
  text: string,
  options: {
    isBold?: boolean;
    maxFontSize?: number;
    lineGap?: number;
    breakBefore?: "page" | "column";
  } = {},
): PdfLine {
  return {
    y: 0,
    text,
    phrases: [],
    isBoldLine: options.isBold ?? false,
    maxFontSize: options.maxFontSize ?? 12,
    ...(options.lineGap === undefined ? {} : { lineGap: options.lineGap }),
    ...(options.breakBefore === undefined
      ? {}
      : { breakBefore: options.breakBefore }),
  };
}

describe("parsePastedResume with PDF line metadata", () => {
  it("accepts bold title-case headings and un-bulleted descriptions", () => {
    const doc = parsePastedResume([
      pdfLine("Jane Doe", { isBold: true, maxFontSize: 22 }),
      pdfLine("Senior Software Engineer"),
      pdfLine("jane@example.com | Seattle, WA", { maxFontSize: 10 }),
      pdfLine("Experience", { isBold: true, maxFontSize: 14 }),
      pdfLine("Senior Software Engineer", { isBold: true }),
      pdfLine("Acme Corp"),
      pdfLine("Jan 2020 - Present", { maxFontSize: 10 }),
      pdfLine(
        "Led the checkout platform team and shipped the billing rewrite for three regions.",
        { maxFontSize: 10 },
      ),
      pdfLine("• Cut latency by 40%.", { maxFontSize: 10 }),
      pdfLine("Education", { isBold: true, maxFontSize: 14 }),
      pdfLine("B.S. in Computer Science"),
      pdfLine("University of Washington"),
      pdfLine("CGPA: 8.7/10", { maxFontSize: 10 }),
    ]);

    expect(doc?.basics).toMatchObject({
      name: "Jane Doe",
      headline: "Senior Software Engineer",
      email: "jane@example.com",
      location: "Seattle, WA",
    });

    const experience = doc?.sections.experience.items ?? [];
    expect(experience).toHaveLength(1);
    expect(experience[0]).toMatchObject({
      position: "Senior Software Engineer",
      company: "Acme Corp",
      startDate: "2020-01",
      current: true,
    });
    // The un-bulleted paragraph stays description copy instead of becoming a
    // third header line.
    expect(experience[0]?.summary).toContain(
      "Led the checkout platform team and shipped the billing rewrite",
    );
    expect(experience[0]?.summary).toContain("Cut latency by 40%.");

    expect(doc?.sections.education.items).toEqual([
      expect.objectContaining({
        school: "University of Washington",
        degree: "B.S.",
        area: "Computer Science",
        grade: "8.7/10 CGPA",
      }),
    ]);
  });

  it("reads a percentage grade", () => {
    const doc = parsePastedResume([
      pdfLine("Ravi Shah", { isBold: true, maxFontSize: 22 }),
      pdfLine("Data Analyst"),
      pdfLine("EDUCATION", { isBold: true, maxFontSize: 14 }),
      pdfLine("B.S. in Statistics"),
      pdfLine("State University"),
      pdfLine("85%", { maxFontSize: 10 }),
    ]);

    expect(doc?.sections.education.items[0]).toMatchObject({
      school: "State University",
      degree: "B.S.",
      area: "Statistics",
      grade: "85%",
    });
  });

  it("keeps a non-bold body line that matches a section alias in its section", () => {
    const doc = parsePastedResume([
      pdfLine("Mona Reyes", { isBold: true, maxFontSize: 22 }),
      pdfLine("Designer"),
      pdfLine("EDUCATION", { isBold: true, maxFontSize: 14 }),
      pdfLine("B.A. in Design"),
      pdfLine("State University"),
      pdfLine("Experience"),
      pdfLine("2014", { maxFontSize: 10 }),
    ]);

    // "Experience" is neither bold nor larger than body copy, so it is a stray
    // line inside Education, not a new section.
    expect(doc?.sections.experience.items).toHaveLength(0);
    expect(doc?.sections.education.items).toHaveLength(1);
    expect(doc?.sections.education.items[0]).toMatchObject({
      school: "State University",
      degree: "B.A.",
      area: "Design",
      endDate: "2014-12",
    });
  });

  it("uses a paragraph-sized line gap to split undated roles", () => {
    const doc = parsePastedResume([
      pdfLine("Sam Ito", { isBold: true, maxFontSize: 22 }),
      pdfLine("Engineer"),
      pdfLine("EXPERIENCE", { isBold: true, maxFontSize: 14 }),
      pdfLine("Senior Engineer", { isBold: true }),
      pdfLine("Acme Corp", { lineGap: 12 }),
      pdfLine("• Built billing.", { lineGap: 12, maxFontSize: 10 }),
      pdfLine("Junior Engineer", { isBold: true, lineGap: 30 }),
      pdfLine("Beta Labs", { lineGap: 12 }),
      pdfLine("• Fixed bugs.", { lineGap: 12, maxFontSize: 10 }),
    ]);

    expect(
      doc?.sections.experience.items.map((item) => ({
        position: item.position,
        company: item.company,
      })),
    ).toEqual([
      { position: "Senior Engineer", company: "Acme Corp" },
      { position: "Junior Engineer", company: "Beta Labs" },
    ]);
  });

  it("prefers a bold project name over a regular stack line", () => {
    const doc = parsePastedResume([
      pdfLine("Ada Kim", { isBold: true, maxFontSize: 22 }),
      pdfLine("Product Engineer"),
      pdfLine("PROJECTS", { isBold: true, maxFontSize: 14 }),
      pdfLine("Revenue Dashboard", { isBold: true }),
      pdfLine("React | TypeScript | D3", { maxFontSize: 10 }),
      pdfLine(
        "Built the dashboard that tracked pipeline health for the sales team.",
        { maxFontSize: 10 },
      ),
    ]);

    expect(doc?.sections.projects.items).toEqual([
      expect.objectContaining({
        name: "Revenue Dashboard",
        keywords: ["React", "TypeScript", "D3"],
      }),
    ]);
    expect(doc?.sections.projects.items[0]?.description).toContain(
      "tracked pipeline health",
    );
  });

  it("recognises title-case Hard Skills and Soft Skills headings", () => {
    const doc = parsePastedResume([
      pdfLine("Nina Torres", { isBold: true, maxFontSize: 22 }),
      pdfLine("Data Analyst"),
      pdfLine("Hard Skills", { isBold: true, maxFontSize: 14 }),
      pdfLine("Docker • Kubernetes", { maxFontSize: 10 }),
      pdfLine("Soft Skills", { isBold: true, maxFontSize: 14 }),
      pdfLine("Mentoring • Communication", { maxFontSize: 10 }),
    ]);

    expect(doc?.sections.skills.items).toEqual([
      expect.objectContaining({
        name: "Hard skills",
        keywords: ["Docker", "Kubernetes"],
      }),
      expect.objectContaining({
        name: "Soft skills",
        keywords: ["Mentoring", "Communication"],
      }),
    ]);
  });

  it("reads a two-column Canva resume with Company as Title and a single date", () => {
    const doc = parsePastedResume([
      pdfLine("Priya Nair", { isBold: true, maxFontSize: 24 }),
      pdfLine("Senior Data Engineer", { maxFontSize: 14 }),
      pdfLine("priya@example.com | Mumbai, India", { maxFontSize: 10 }),
      pdfLine("EXPERIENCE", { isBold: true, maxFontSize: 13 }),
      pdfLine("Acme Corp as Senior Data Engineer", { isBold: true }),
      pdfLine("Completed in 2018", { maxFontSize: 10 }),
      pdfLine("• Built the data platform.", { maxFontSize: 10 }),
      pdfLine("EDUCATION", { isBold: true, maxFontSize: 13 }),
      pdfLine("University of Mumbai"),
      pdfLine("B.S. in Computer Science"),
      pdfLine("GPA: 3.8", { maxFontSize: 10 }),
      pdfLine("HARD SKILLS", {
        isBold: true,
        maxFontSize: 13,
        breakBefore: "column",
      }),
      pdfLine("Python • SQL • Spark", { maxFontSize: 10 }),
      pdfLine("SOFT SKILLS", { isBold: true, maxFontSize: 13 }),
      pdfLine("Mentoring • Communication", { maxFontSize: 10 }),
    ]);

    expect(doc?.basics).toMatchObject({
      name: "Priya Nair",
      headline: "Senior Data Engineer",
      email: "priya@example.com",
      location: "Mumbai, India",
    });
    expect(doc?.sections.experience.items).toEqual([
      expect.objectContaining({
        company: "Acme Corp",
        position: "Senior Data Engineer",
        startDate: "2018-12",
      }),
    ]);
    expect(doc?.sections.experience.items[0]?.summary).toContain(
      "Built the data platform.",
    );
    expect(doc?.sections.education.items).toEqual([
      expect.objectContaining({
        school: "University of Mumbai",
        degree: "B.S.",
        area: "Computer Science",
        grade: "3.8 GPA",
      }),
    ]);
    expect(doc?.sections.skills.items).toEqual([
      expect.objectContaining({
        name: "Hard skills",
        keywords: ["Python", "SQL", "Spark"],
      }),
      expect.objectContaining({
        name: "Soft skills",
        keywords: ["Mentoring", "Communication"],
      }),
    ]);
  });

  it("reads an unlabelled summary, certifications, awards, and column skills", () => {
    const doc = parsePastedResume([
      pdfLine("Lena Ortiz", { isBold: true, maxFontSize: 22 }),
      pdfLine("Operations Lead", { maxFontSize: 14 }),
      pdfLine("lena@example.com", { maxFontSize: 10 }),
      pdfLine(
        "I lead operations teams across three regions and build repeatable processes for fast-growing companies. I care about clear communication, measurable outcomes, and calm execution under pressure.",
        { maxFontSize: 10 },
      ),
      pdfLine("CERTIFICATIONS", { isBold: true, maxFontSize: 13 }),
      pdfLine("PMP | Project Management Institute | 2021", { maxFontSize: 10 }),
      pdfLine("AWS Certified Cloud Practitioner | Amazon | 2020", {
        maxFontSize: 10,
      }),
      pdfLine("AWARDS", { isBold: true, maxFontSize: 13 }),
      pdfLine("Employee of the Year | Acme Corp | 2022", { maxFontSize: 10 }),
      pdfLine("SKILLS", { isBold: true, maxFontSize: 13 }),
      pdfLine("• Excel • SQL • Tableau", { maxFontSize: 10 }),
    ]);

    expect(doc?.summary.content).toContain("I lead operations teams");
    expect(doc?.sections.certifications.items).toEqual([
      expect.objectContaining({
        name: "PMP",
        issuer: "Project Management Institute",
        date: "2021",
      }),
      expect.objectContaining({
        name: "AWS Certified Cloud Practitioner",
        issuer: "Amazon",
        date: "2020",
      }),
    ]);
    expect(doc?.sections.awards.items).toEqual([
      expect.objectContaining({
        title: "Employee of the Year",
        awarder: "Acme Corp",
        date: "2022",
      }),
    ]);
    expect(doc?.sections.skills.items).toEqual([
      expect.objectContaining({ keywords: ["Excel", "SQL", "Tableau"] }),
    ]);
  });
});

describe("real-world paste and PDF edge cases", () => {
  it("recognises a letter-spaced section heading", () => {
    const doc = parsePastedResume(`Jane Doe
jane@example.com

E X P E R I E N C E
Senior Engineer
Acme Corp
Jan 2020 - Present
• Built billing.`);

    expect(doc?.sections.experience.items).toEqual([
      expect.objectContaining({
        position: "Senior Engineer",
        company: "Acme Corp",
        current: true,
      }),
    ]);
  });

  it("ignores a trailing parenthetical date on a heading", () => {
    const doc = parsePastedResume(`Jane Doe
jane@example.com

PROFESSIONAL DEVELOPMENT (AUG 2025 - PRESENT)
Google Cloud Professional Certificate`);

    expect(doc?.sections.certifications.items).toEqual([
      expect.objectContaining({ name: "Google Cloud Professional Certificate" }),
    ]);
  });

  it("reads KEY PROJECT as a projects heading", () => {
    const doc = parsePastedResume(`Jane Doe
jane@example.com

KEY PROJECT
Revenue Dashboard
• Built the pipeline dashboard.`);

    expect(doc?.sections.projects.items).toEqual([
      expect.objectContaining({ name: "Revenue Dashboard" }),
    ]);
    expect(doc?.sections.projects.items[0]?.description).toContain(
      "Built the pipeline dashboard.",
    );
  });

  it("reads ACHIEVEMENTS & EXTRACURRICULARS as awards", () => {
    const doc = parsePastedResume(`Jane Doe
jane@example.com

ACHIEVEMENTS & EXTRACURRICULARS
Hackathon Winner | 2022`);

    expect(doc?.sections.awards.items).toEqual([
      expect.objectContaining({ title: "Hackathon Winner", date: "2022" }),
    ]);
  });

  it("routes degree and school lines in a combined section into education", () => {
    const doc = parsePastedResume(`Jane Doe
jane@example.com

CERTIFICATIONS & EDUCATION
AWS Certified Developer | Amazon | 2022
B.S. in Computer Science | State University | 2021`);

    expect(doc?.sections.certifications.items).toEqual([
      expect.objectContaining({
        name: "AWS Certified Developer",
        issuer: "Amazon",
        date: "2022",
      }),
    ]);
    expect(doc?.sections.education.items).toEqual([
      expect.objectContaining({
        school: "State University",
        degree: "B.S.",
        area: "Computer Science",
        endDate: "2021-12",
      }),
    ]);
  });

  it("expands a shortened year range", () => {
    const doc = parsePastedResume(`Jane Doe
jane@example.com

EXPERIENCE
Senior Engineer
Acme Corp
2019–21`);

    expect(doc?.sections.experience.items[0]).toMatchObject({
      startDate: "2019-01",
      endDate: "2021-12",
    });
  });

  it("maps season dates to their months", () => {
    const doc = parsePastedResume(`Jane Doe
jane@example.com

EXPERIENCE
Research Assistant
State University
Spring 2021 - Fall 2022`);

    expect(doc?.sections.experience.items[0]).toMatchObject({
      startDate: "2021-03",
      endDate: "2022-09",
    });
  });

  it("uses a duration line to compute the end date", () => {
    const doc = parsePastedResume(`Jane Doe
jane@example.com

EXPERIENCE
Intern
Acme Corp
Jan 2020
3 Months`);

    expect(doc?.sections.experience.items[0]).toMatchObject({
      startDate: "2020-01",
      endDate: "2020-04",
    });
  });

  it("splits a header on an unspaced en dash", () => {
    const doc = parsePastedResume(`Jane Doe
jane@example.com

EXPERIENCE
Senior Engineer –Infosys
Jan 2020 - Present
• Built billing.`);

    expect(doc?.sections.experience.items[0]).toMatchObject({
      position: "Senior Engineer",
      company: "Infosys",
    });
  });

  it("reads a tight CGPA grade", () => {
    const doc = parsePastedResume(`Jane Doe
jane@example.com

EDUCATION
B.S. in Computer Science
State University
CGPA:7.6`);

    expect(doc?.sections.education.items[0]).toMatchObject({
      school: "State University",
      grade: "7.6 CGPA",
    });
  });

  it("reads a tight percentage grade after a dash", () => {
    const doc = parsePastedResume(`Jane Doe
jane@example.com

EDUCATION
B.S. in Computer Science
State University
12th –92.0%`);

    expect(doc?.sections.education.items[0]).toMatchObject({
      school: "State University",
      grade: "92.0%",
    });
  });

  it("appends headerless page-2 bullets to the last experience entry", () => {
    const doc = parsePastedResume([
      pdfLine("Jane Doe", { isBold: true, maxFontSize: 22 }),
      pdfLine("jane@example.com", { maxFontSize: 10 }),
      pdfLine("EXPERIENCE", { isBold: true, maxFontSize: 14 }),
      pdfLine("Senior Engineer", { isBold: true }),
      pdfLine("Acme Corp"),
      pdfLine("Jan 2020 - Present", { maxFontSize: 10 }),
      pdfLine("• Built the billing service.", { maxFontSize: 10 }),
      pdfLine("• Cut latency by 40%.", {
        breakBefore: "page",
        maxFontSize: 10,
      }),
      pdfLine("• Mentored four engineers.", { maxFontSize: 10 }),
    ]);

    const experience = doc?.sections.experience.items ?? [];

    expect(experience).toHaveLength(1);
    expect(experience[0]).toMatchObject({
      position: "Senior Engineer",
      company: "Acme Corp",
    });
    expect(experience[0]?.summary).toContain("Built the billing service.");
    expect(experience[0]?.summary).toContain("Cut latency by 40%.");
    expect(experience[0]?.summary).toContain("Mentored four engineers.");
  });

  it("keeps wide skill-column gaps as separate keywords", () => {
    const doc = parsePastedResume([
      pdfLine("Jane Doe", { isBold: true, maxFontSize: 22 }),
      pdfLine("jane@example.com", { maxFontSize: 10 }),
      pdfLine("SKILLS", { isBold: true, maxFontSize: 14 }),
      {
        ...pdfLine("Python SQL Spark", { maxFontSize: 10 }),
        phrases: [
          {
            text: "Python",
            x: 0,
            width: 30,
            isBold: false,
            fontSize: 10,
            fontName: "",
          },
          {
            text: "SQL",
            x: 120,
            width: 15,
            isBold: false,
            fontSize: 10,
            fontName: "",
          },
          {
            text: "Spark",
            x: 200,
            width: 25,
            isBold: false,
            fontSize: 10,
            fontName: "",
          },
        ],
      },
    ]);

    expect(doc?.sections.skills.items[0]?.keywords).toEqual([
      "Python",
      "SQL",
      "Spark",
    ]);
  });
});
