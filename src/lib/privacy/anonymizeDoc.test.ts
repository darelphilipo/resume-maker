import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import {
  EducationItemSchema,
  ExperienceItemSchema,
  ProfileItemSchema,
} from "@/lib/schema/resume.schema";

import {
  ANONYMIZED_EMAIL,
  ANONYMIZED_LOCATION,
  ANONYMIZED_NAME,
  ANONYMIZED_PHONE,
  ANONYMIZED_PROFILE_URL,
  ANONYMIZED_PROFILE_USERNAME,
  ANONYMIZED_WEBSITE_LABEL,
  ANONYMIZED_WEBSITE_URL,
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
      }),
    ];
    doc.sections.education.items = [
      EducationItemSchema.parse({
        id: "education-1",
        school: "State University",
      }),
    ];

    anonymizeResumeDoc(doc);

    expect(doc.basics.name).toBe("Jordan Alvarez");
    expect(doc.basics.email).toBe("jordan@acme.com");
    expect(doc.picture.hidden).toBe(false);
    expect(doc.sections.experience.items[0].company).toBe("Acme");
    expect(doc.sections.education.items[0].school).toBe("State University");
  });
});
