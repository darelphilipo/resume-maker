import { describe, expect, it } from "vitest";

import { buildAtsText } from "@/lib/ats/atsText";
import { createEmptyResume } from "@/lib/schema/defaults";
import {
  CertificationItemSchema,
  CustomSectionSchema,
  EducationItemSchema,
  ExperienceItemSchema,
  ProfileItemSchema,
  ProjectItemSchema,
  PublicationItemSchema,
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

  it("does not mutate the saved document", () => {
    const doc = createEmptyResume();

    doc.basics.name = "Jordan Alvarez";
    doc.basics.email = "jordan@acme.com";
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
    expect(doc.picture.hidden).toBe(false);
    expect(doc.sections.experience.items[0].company).toBe("Acme");
    expect(doc.sections.experience.items[0].location).toBe("Oakland, CA");
    expect(doc.sections.education.items[0].school).toBe("State University");
    expect(doc.sections.education.items[0].location).toBe("Berkeley, CA");
    expect(doc.sections.projects.items[0].url).toBe(
      "https://github.com/jordan/resume-maker",
    );
  });
});
