import { describe, expect, it } from "vitest";

import { buildAtsText } from "@/lib/ats/atsText";
import { createEmptyResume } from "@/lib/schema/defaults";
import {
  AwardItemSchema,
  CertificationItemSchema,
  CustomSectionSchema,
  EducationItemSchema,
  ExperienceItemSchema,
  ProfileItemSchema,
  ProjectItemSchema,
  PublicationItemSchema,
  ReferenceItemSchema,
  VolunteerItemSchema,
} from "@/lib/schema/resume.schema";

import {
  ANONYMIZED_EMAIL,
  ANONYMIZED_ENTRY_LOCATION,
  ANONYMIZED_ENTRY_URL,
  ANONYMIZED_LOCATION,
  ANONYMIZED_NAME,
  ANONYMIZED_PHONE,
  ANONYMIZED_PROFILE_URL,
  ANONYMIZED_PROFILE_USERNAME,
  ANONYMIZED_REFERENCE_EMAIL,
  ANONYMIZED_REFERENCE_PHONE,
  ANONYMIZED_WEBSITE_LABEL,
  ANONYMIZED_WEBSITE_URL,
  anonymizeCertificationUrl,
  anonymizeResumeDoc,
} from "./anonymizeDoc";

describe("anonymizeResumeDoc", () => {
  it("replaces identifying basics, profiles, and the picture", () => {
    const doc = createEmptyResume();

    doc.basics.name = "Jordan Alvarez";
    doc.basics.email = "jordan@acme.com";
    doc.basics.phone = "+1 415 555 0100";
    doc.basics.location = "Oakland, CA";
    doc.basics.website = {
      url: "https://jordanalvarez.dev",
      label: "jordanalvarez.dev",
    };
    doc.picture = {
      ...doc.picture,
      hidden: false,
      url: "https://example.com/jordan.jpg",
    };
    doc.sections.profiles.items = [
      ProfileItemSchema.parse({
        id: "profile-1",
        network: "LinkedIn",
        username: "jordan-alvarez",
        url: "https://linkedin.com/in/jordan-alvarez",
      }),
    ];

    const anonymized = anonymizeResumeDoc(doc);

    expect(anonymized.basics.name).toBe(ANONYMIZED_NAME);
    expect(anonymized.basics.email).toBe(ANONYMIZED_EMAIL);
    expect(anonymized.basics.phone).toBe(ANONYMIZED_PHONE);
    expect(anonymized.basics.location).toBe(ANONYMIZED_LOCATION);
    expect(anonymized.basics.website).toEqual({
      url: ANONYMIZED_WEBSITE_URL,
      label: ANONYMIZED_WEBSITE_LABEL,
    });
    expect(anonymized.picture.hidden).toBe(true);
    expect(anonymized.sections.profiles.items[0]).toMatchObject({
      network: "LinkedIn",
      username: ANONYMIZED_PROFILE_USERNAME,
      url: ANONYMIZED_PROFILE_URL,
    });
  });

  it("labels distinct companies and schools in first-seen order", () => {
    const doc = createEmptyResume();

    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "experience-1",
        company: "Acme",
        position: "Engineer",
      }),
      ExperienceItemSchema.parse({
        id: "experience-2",
        company: "  acme ",
        position: "Senior Engineer",
      }),
      ExperienceItemSchema.parse({
        id: "experience-3",
        company: "Globex",
        position: "Manager",
      }),
      ExperienceItemSchema.parse({ id: "experience-4", company: "" }),
    ];
    doc.sections.education.items = [
      EducationItemSchema.parse({
        id: "education-1",
        school: "State University",
        degree: "BSc",
      }),
      EducationItemSchema.parse({
        id: "education-2",
        school: "State University",
        degree: "MSc",
      }),
      EducationItemSchema.parse({
        id: "education-3",
        school: "Another College",
        degree: "PhD",
      }),
    ];

    const anonymized = anonymizeResumeDoc(doc);

    expect(
      anonymized.sections.experience.items.map((item) => item.company),
    ).toEqual(["Company A", "Company A", "Company B", ""]);
    expect(
      anonymized.sections.education.items.map((item) => item.school),
    ).toEqual(["University A", "University A", "University B"]);
    expect(anonymized.sections.experience.items[2].position).toBe("Manager");
  });

  it("leaves blank contact fields blank instead of inventing details", () => {
    const anonymized = anonymizeResumeDoc(createEmptyResume());

    expect(anonymized.basics.name).toBe("");
    expect(anonymized.basics.email).toBe("");
    expect(anonymized.basics.phone).toBe("");
    expect(anonymized.basics.location).toBe("");
    expect(anonymized.basics.website).toEqual({ url: "", label: "" });
  });

  it("redacts project, certification, publication, and custom entry URLs", () => {
    const doc = createEmptyResume();

    doc.sections.projects.items = [
      ProjectItemSchema.parse({
        id: "project-1",
        name: "Resume Maker",
        url: "https://github.com/mayachen/resume-maker",
      }),
      ProjectItemSchema.parse({ id: "project-2", name: "No link" }),
    ];
    doc.sections.certifications.items = [
      CertificationItemSchema.parse({
        id: "certification-1",
        name: "Cloud Architect",
        url: "https://github.com/mayachen/certs",
      }),
    ];
    doc.sections.publications.items = [
      PublicationItemSchema.parse({
        id: "publication-1",
        title: "Local-first resumes",
        url: "https://github.com/mayachen/paper",
      }),
    ];
    doc.customSections = [
      CustomSectionSchema.parse({
        id: "custom-1",
        title: "Speaking",
        items: [
          {
            id: "custom-item-1",
            name: "Browser-only tools",
            url: "https://github.com/mayachen/talks",
          },
          { id: "custom-item-2", name: "No link" },
        ],
      }),
    ];

    const anonymized = anonymizeResumeDoc(doc);

    expect(anonymized.sections.projects.items.map((item) => item.url)).toEqual(
      [ANONYMIZED_ENTRY_URL, ""],
    );
    expect(anonymized.sections.certifications.items[0].url).toBe(
      ANONYMIZED_ENTRY_URL,
    );
    expect(anonymized.sections.publications.items[0].url).toBe(
      ANONYMIZED_ENTRY_URL,
    );
    expect(anonymized.customSections[0].items[0].url).toBe(
      ANONYMIZED_ENTRY_URL,
    );
    // An absent optional URL stays absent instead of growing fake content.
    expect(anonymized.customSections[0].items[1].url).toBeUndefined();
    expect(JSON.stringify(anonymized)).not.toContain("mayachen");
  });

  it("keeps public certification issuers while redacting personal badge paths", () => {
    const doc = createEmptyResume();

    doc.sections.certifications.items = [
      CertificationItemSchema.parse({
        id: "cert-credly",
        name: "Cloud Architect",
        url: "https://www.credly.com/badges/jordan-alvarez/aws-architect",
      }),
      CertificationItemSchema.parse({
        id: "cert-scrum",
        name: "Scrum Master",
        url: "https://scrum.org/certification/",
      }),
      CertificationItemSchema.parse({
        id: "cert-aws",
        name: "AWS",
        url: "https://aws.amazon.com/certification/verify?name=jordan",
      }),
      CertificationItemSchema.parse({
        id: "cert-coursera",
        name: "Course",
        url: "https://coursera.org/verify/JORDAN123",
      }),
      CertificationItemSchema.parse({
        id: "cert-personal",
        name: "Personal",
        url: "https://github.com/jordan/certs",
      }),
      CertificationItemSchema.parse({ id: "cert-empty", name: "No link" }),
    ];

    const anonymized = anonymizeResumeDoc(doc);

    expect(
      anonymized.sections.certifications.items.map((item) => item.url),
    ).toEqual([
      "https://www.credly.com/badges/",
      "https://scrum.org/certification/",
      "https://aws.amazon.com/certification/",
      "https://coursera.org/verify/",
      ANONYMIZED_ENTRY_URL,
      "",
    ]);
    expect(JSON.stringify(anonymized)).not.toContain("jordan");
  });

  it("anonymizes malformed, bare, and unknown certification URLs", () => {
    expect(anonymizeCertificationUrl("https://credly.com")).toBe(
      "https://credly.com/",
    );
    expect(anonymizeCertificationUrl("  ")).toBe("  ");
    expect(anonymizeCertificationUrl("not a url")).toBe(ANONYMIZED_ENTRY_URL);
    expect(anonymizeCertificationUrl("ftp://credly.com/badges/jordan")).toBe(
      ANONYMIZED_ENTRY_URL,
    );
  });

  it("keeps entry URLs out of the ATS text too", () => {
    const doc = createEmptyResume();

    doc.sections.projects.items = [
      ProjectItemSchema.parse({
        id: "project-1",
        name: "Resume Maker",
        url: "https://github.com/mayachen/resume-maker",
      }),
    ];

    const atsText = buildAtsText(anonymizeResumeDoc(doc));

    expect(atsText).toContain(ANONYMIZED_ENTRY_URL);
    expect(atsText).not.toContain("mayachen");
  });

  it("redacts entry locations so personal geography cannot leak", () => {
    const doc = createEmptyResume();

    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "experience-1",
        company: "Acme",
        position: "Engineer",
        location: "Oakland, CA",
      }),
      ExperienceItemSchema.parse({
        id: "experience-2",
        company: "Globex",
        position: "Manager",
        location: "  ",
      }),
    ];
    doc.sections.education.items = [
      EducationItemSchema.parse({
        id: "education-1",
        school: "State University",
        location: "Berkeley, CA",
      }),
    ];
    doc.sections.volunteer.items = [
      VolunteerItemSchema.parse({
        id: "volunteer-1",
        organization: "Food Bank",
        location: "San Jose, CA",
      }),
    ];
    doc.customSections = [
      CustomSectionSchema.parse({
        id: "custom-1",
        title: "Speaking",
        items: [
          {
            id: "custom-item-1",
            name: "Browser-only tools",
            location: "Portland, OR",
          },
          { id: "custom-item-2", name: "No location" },
        ],
      }),
    ];

    const anonymized = anonymizeResumeDoc(doc);

    expect(
      anonymized.sections.experience.items.map((item) => item.location),
    ).toEqual([ANONYMIZED_ENTRY_LOCATION, "  "]);
    expect(anonymized.sections.education.items[0].location).toBe(
      ANONYMIZED_ENTRY_LOCATION,
    );
    expect(anonymized.sections.volunteer.items[0].location).toBe(
      ANONYMIZED_ENTRY_LOCATION,
    );
    expect(anonymized.customSections[0].items[0].location).toBe(
      ANONYMIZED_ENTRY_LOCATION,
    );
    // An absent optional location stays absent instead of growing fake content.
    expect(anonymized.customSections[0].items[1].location).toBeUndefined();
    expect(JSON.stringify(anonymized)).not.toContain("Oakland");
    expect(JSON.stringify(anonymized)).not.toContain("Berkeley");
    expect(JSON.stringify(anonymized)).not.toContain("San Jose");
    expect(JSON.stringify(anonymized)).not.toContain("Portland");
  });

  it("keeps redacted entry locations out of the ATS text", () => {
    const doc = createEmptyResume();

    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "experience-1",
        company: "Acme",
        position: "Engineer",
        location: "Oakland, CA",
      }),
    ];
    doc.sections.education.items = [
      EducationItemSchema.parse({
        id: "education-1",
        school: "State University",
        location: "Berkeley, CA",
      }),
    ];

    const atsText = buildAtsText(anonymizeResumeDoc(doc));

    expect(atsText).toContain(ANONYMIZED_ENTRY_LOCATION);
    expect(atsText).not.toContain("Oakland");
    expect(atsText).not.toContain("Berkeley");
  });

  it("redacts reference names, employers, roles, phone, and email", () => {
    const doc = createEmptyResume();

    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "experience-1",
        company: "US Navy",
        position: "Officer",
      }),
    ];
    doc.sections.references.items = [
      ReferenceItemSchema.parse({
        id: "reference-1",
        name: "Grace Hopper",
        position: "CTO",
        company: "US Navy",
        phone: "+1 202 555 0143",
        email: "grace@navy.mil",
        summary: "<p>Led the compiler team.</p>",
      }),
      ReferenceItemSchema.parse({
        id: "reference-2",
        name: "Ada Lovelace",
        position: "Analyst",
        company: "Analytical Engine",
        phone: "",
        email: "",
      }),
    ];

    const anonymized = anonymizeResumeDoc(doc);

    expect(anonymized.sections.references.items.map((item) => item.name)).toEqual(
      ["Reference A", "Reference B"],
    );
    expect(
      anonymized.sections.references.items.map((item) => item.company),
    ).toEqual(["Company A", "Company B"]);
    // Reference employers share the experience label namespace, so the same
    // employer keeps one label and two different employers never collide.
    expect(anonymized.sections.experience.items[0].company).toBe("Company A");
    expect(
      anonymized.sections.references.items.map((item) => item.position),
    ).toEqual(["Position A", "Position B"]);
    expect(
      anonymized.sections.references.items.map((item) => item.phone),
    ).toEqual([ANONYMIZED_REFERENCE_PHONE, ""]);
    expect(
      anonymized.sections.references.items.map((item) => item.email),
    ).toEqual([ANONYMIZED_REFERENCE_EMAIL, ""]);
    // Reference notes are prose, not contact fields, so they stay intact.
    expect(anonymized.sections.references.items[0].summary).toBe(
      "<p>Led the compiler team.</p>",
    );
    expect(JSON.stringify(anonymized)).not.toContain("Grace");
    expect(JSON.stringify(anonymized)).not.toContain("navy");
    expect(JSON.stringify(anonymized)).not.toContain("Ada Lovelace");

    const atsText = buildAtsText(anonymized);

    expect(atsText).toContain("Reference A");
    expect(atsText).toContain(ANONYMIZED_REFERENCE_PHONE);
    expect(atsText).toContain(ANONYMIZED_REFERENCE_EMAIL);
    expect(atsText).not.toContain("Grace Hopper");
    expect(atsText).not.toContain("grace@navy.mil");
  });

  it("redacts optional sections and clears the saved picture URL", () => {
    const doc = createEmptyResume();

    doc.picture = {
      ...doc.picture,
      hidden: false,
      url: "https://example.com/jordan.jpg",
    };
    doc.sections.awards.items = [
      AwardItemSchema.parse({
        id: "award-1",
        title: "Engineer of the Year",
        awarder: "IEEE",
        summary: "<p>Honored by IEEE.</p>",
      }),
      AwardItemSchema.parse({
        id: "award-2",
        title: "Hackathon winner",
        awarder: "Globex",
      }),
    ];
    doc.sections.volunteer.items = [
      VolunteerItemSchema.parse({
        id: "volunteer-1",
        organization: "Food Bank",
        position: "Volunteer",
        location: "San Jose, CA",
      }),
    ];
    doc.sections.publications.items = [
      PublicationItemSchema.parse({
        id: "publication-1",
        title: "Local-first resumes",
        publisher: "ACM",
        url: "https://github.com/jordan/paper",
      }),
    ];
    doc.customSections = [
      CustomSectionSchema.parse({
        id: "custom-1",
        title: "Speaking",
        items: [
          {
            id: "custom-item-1",
            name: "Browser-only tools",
            location: "Portland, OR",
            url: "https://github.com/jordan/talks",
          },
        ],
      }),
    ];

    const anonymized = anonymizeResumeDoc(doc);

    expect(anonymized.picture).toMatchObject({ hidden: true, url: "" });
    expect(anonymized.sections.awards.items.map((item) => item.awarder)).toEqual(
      ["Organization A", "Organization B"],
    );
    expect(anonymized.sections.volunteer.items[0]).toMatchObject({
      organization: "Organization A",
      location: ANONYMIZED_ENTRY_LOCATION,
    });
    expect(anonymized.sections.publications.items[0].url).toBe(
      ANONYMIZED_ENTRY_URL,
    );
    expect(anonymized.customSections[0].items[0]).toMatchObject({
      location: ANONYMIZED_ENTRY_LOCATION,
      url: ANONYMIZED_ENTRY_URL,
    });
    expect(JSON.stringify(anonymized)).not.toContain("IEEE");
    expect(JSON.stringify(anonymized)).not.toContain("Food Bank");
    expect(JSON.stringify(anonymized)).not.toContain("San Jose");
    expect(JSON.stringify(anonymized)).not.toContain("jordan");
  });

  it("scrubs known PII from summary and entry prose", () => {
    const doc = createEmptyResume();

    doc.basics.name = "Jordan Alvarez";
    doc.basics.email = "jordan@acme.com";
    doc.basics.phone = "+1 415 555 0100";
    doc.summary.content =
      "<p>Jordan Alvarez built tools at Wells Fargo.</p>" +
      "<ul><li>Joined Wells Fargo in 2019</li>" +
      "<li>Contact jordan@acme.com or +1 415 555 0100.</li></ul>";
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "experience-1",
        company: "Wells Fargo",
        position: "Engineer",
        summary:
          "<p>Mentored at State University and Food Bank.</p>" +
          "<ul><li>wells fargo recognized the program.</li></ul>",
      }),
    ];
    doc.sections.education.items = [
      EducationItemSchema.parse({
        id: "education-1",
        school: "State University",
        degree: "BSc",
        summary: "<p>State University honors graduate.</p>",
      }),
    ];
    doc.sections.volunteer.items = [
      VolunteerItemSchema.parse({
        id: "volunteer-1",
        organization: "Food Bank",
        position: "Volunteer",
        summary: "<p>Weekends at Food Bank.</p>",
      }),
    ];

    const anonymized = anonymizeResumeDoc(doc);

    expect(anonymized.summary.content).toBe(
      "<p>Alex Taylor built tools at Company A.</p>" +
        `<ul><li>Joined Company A in 2019</li>` +
        `<li>Contact ${ANONYMIZED_EMAIL} or ${ANONYMIZED_PHONE}.</li></ul>`,
    );
    expect(anonymized.sections.experience.items[0].summary).toBe(
      "<p>Mentored at University A and Organization A.</p>" +
        "<ul><li>Company A recognized the program.</li></ul>",
    );
    expect(anonymized.sections.education.items[0].summary).toBe(
      "<p>University A honors graduate.</p>",
    );
    expect(anonymized.sections.volunteer.items[0].summary).toBe(
      "<p>Weekends at Organization A.</p>",
    );
    expect(JSON.stringify(anonymized)).not.toContain("Jordan Alvarez");
    expect(JSON.stringify(anonymized)).not.toContain("jordan@acme.com");
    expect(JSON.stringify(anonymized)).not.toContain("+1 415 555 0100");
    expect(JSON.stringify(anonymized)).not.toContain("Wells Fargo");
    expect(JSON.stringify(anonymized)).not.toContain("State University");
    expect(JSON.stringify(anonymized)).not.toContain("Food Bank");

    const atsText = buildAtsText(anonymized);

    expect(atsText).toContain("Alex Taylor");
    expect(atsText).toContain("Company A");
    expect(atsText).not.toContain("Wells Fargo");
    expect(atsText).not.toContain("Food Bank");
  });

  it("scrubs only whole text-node matches and skips short terms", () => {
    const doc = createEmptyResume();

    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "experience-1",
        company: "Acme",
        position: "Engineer",
        summary:
          '<p class="Acme">Acme helped Acmeology and Acme.</p>',
      }),
      ExperienceItemSchema.parse({
        id: "experience-2",
        company: "AB",
        position: "Analyst",
        summary: "<p>AB worked with AB.</p>",
      }),
    ];

    const anonymized = anonymizeResumeDoc(doc);

    expect(anonymized.sections.experience.items[0].company).toBe("Company A");
    expect(anonymized.sections.experience.items[1].company).toBe("Company B");
    // The attribute keeps the literal text, and a longer word is not a match.
    expect(anonymized.sections.experience.items[0].summary).toBe(
      '<p class="Acme">Company A helped Acmeology and Company A.</p>',
    );
    // A two-character term is too ambiguous to rewrite in prose.
    expect(anonymized.sections.experience.items[1].summary).toBe(
      "<p>AB worked with AB.</p>",
    );
  });

  it("scrubs the longest matching employer before a shorter prefix", () => {
    const doc = createEmptyResume();

    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "experience-1",
        company: "Wells Fargo Bank",
        position: "Engineer",
        summary: "<p>Worked at Wells Fargo Bank.</p>",
      }),
      ExperienceItemSchema.parse({
        id: "experience-2",
        company: "Wells Fargo",
        position: "Analyst",
        summary: "<p>Earlier, Wells Fargo.</p>",
      }),
    ];

    const anonymized = anonymizeResumeDoc(doc);

    expect(anonymized.sections.experience.items[0].summary).toBe(
      "<p>Worked at Company A.</p>",
    );
    expect(anonymized.sections.experience.items[1].summary).toBe(
      "<p>Earlier, Company B.</p>",
    );
  });

  it("does not mutate the saved document", () => {
    const doc = createEmptyResume();

    doc.basics.name = "Jordan Alvarez";
    doc.basics.email = "jordan@acme.com";
    doc.summary.content = "<p>Jordan Alvarez at Acme.</p>";
    doc.picture = {
      ...doc.picture,
      hidden: false,
      url: "https://example.com/jordan.jpg",
    };
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "experience-1",
        company: "Acme",
        position: "Engineer",
        location: "Oakland, CA",
        summary: "<p>Worked at Acme.</p>",
      }),
    ];
    doc.sections.education.items = [
      EducationItemSchema.parse({
        id: "education-1",
        school: "State University",
        location: "Berkeley, CA",
      }),
    ];
    doc.sections.projects.items = [
      ProjectItemSchema.parse({
        id: "project-1",
        name: "Resume Maker",
        url: "https://github.com/jordan/resume-maker",
      }),
    ];

    anonymizeResumeDoc(doc);

    expect(doc.basics.name).toBe("Jordan Alvarez");
    expect(doc.basics.email).toBe("jordan@acme.com");
    expect(doc.summary.content).toBe("<p>Jordan Alvarez at Acme.</p>");
    expect(doc.picture.hidden).toBe(false);
    expect(doc.picture.url).toBe("https://example.com/jordan.jpg");
    expect(doc.sections.experience.items[0].company).toBe("Acme");
    expect(doc.sections.experience.items[0].location).toBe("Oakland, CA");
    expect(doc.sections.experience.items[0].summary).toBe(
      "<p>Worked at Acme.</p>",
    );
    expect(doc.sections.education.items[0].school).toBe("State University");
    expect(doc.sections.education.items[0].location).toBe("Berkeley, CA");
    expect(doc.sections.projects.items[0].url).toBe(
      "https://github.com/jordan/resume-maker",
    );
  });
});
