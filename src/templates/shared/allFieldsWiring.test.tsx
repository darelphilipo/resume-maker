import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildAtsText } from "@/lib/ats/atsText";
import { createEmptyResume } from "@/lib/schema/defaults";
import {
  CertificationItemSchema,
  CustomSectionSchema,
  EducationItemSchema,
  ExperienceItemSchema,
  PublicationItemSchema,
  type ResumeDocument,
} from "@/lib/schema/resume.schema";

import { HeaderSlot } from "./HeaderSlot";
import { SectionRenderer } from "./SectionRenderer";

/**
 * Every user-editable text field gets its own sentinel. The same document is
 * rendered through the Visual Preview/PDF components and through the ATS text
 * builder, so a field that silently stops rendering fails in both places.
 */
const SENTINEL = {
  basics: {
    name: "SENTINEL_BASICS_NAME",
    headline: "SENTINEL_BASICS_HEADLINE",
    email: "SENTINEL_BASICS_EMAIL@example.com",
    phone: "SENTINEL_BASICS_PHONE",
    location: "SENTINEL_BASICS_LOCATION",
    workAuth: "SENTINEL_BASICS_WORKAUTH",
    websiteUrl: "example.com/SENTINEL_BASICS_WEBSITE",
  },
  summary: "SENTINEL_SUMMARY_CONTENT",
  profiles: {
    network: "SENTINEL_PROFILE_NETWORK",
    username: "SENTINEL_PROFILE_USERNAME",
    url: "example.com/SENTINEL_PROFILE_URL",
  },
  experience: {
    company: "SENTINEL_EXPERIENCE_COMPANY",
    position: "SENTINEL_EXPERIENCE_POSITION",
    location: "SENTINEL_EXPERIENCE_LOCATION",
    summary: "SENTINEL_EXPERIENCE_SUMMARY",
  },
  education: {
    school: "SENTINEL_EDUCATION_SCHOOL",
    degree: "SENTINEL_EDUCATION_DEGREE",
    area: "SENTINEL_EDUCATION_AREA",
    location: "SENTINEL_EDUCATION_LOCATION",
    grade: "SENTINEL_EDUCATION_GRADE",
    summary: "SENTINEL_EDUCATION_SUMMARY",
  },
  projects: {
    name: "SENTINEL_PROJECT_NAME",
    description: "SENTINEL_PROJECT_DESCRIPTION",
    url: "example.com/SENTINEL_PROJECT_URL",
    keyword: "SENTINEL_PROJECT_KEYWORD",
  },
  skills: {
    name: "SENTINEL_SKILLS_NAME",
    keyword: "SENTINEL_SKILLS_KEYWORD",
  },
  certifications: {
    name: "SENTINEL_CERTIFICATION_NAME",
    issuer: "SENTINEL_CERTIFICATION_ISSUER",
    url: "example.com/SENTINEL_CERTIFICATION_URL",
  },
  awards: {
    title: "SENTINEL_AWARD_TITLE",
    awarder: "SENTINEL_AWARD_AWARDER",
    summary: "SENTINEL_AWARD_SUMMARY",
  },
  languages: {
    name: "SENTINEL_LANGUAGE_NAME",
    fluency: "SENTINEL_LANGUAGE_FLUENCY",
  },
  interests: {
    name: "SENTINEL_INTEREST_NAME",
    keyword: "SENTINEL_INTEREST_KEYWORD",
  },
  volunteer: {
    organization: "SENTINEL_VOLUNTEER_ORGANIZATION",
    position: "SENTINEL_VOLUNTEER_POSITION",
    location: "SENTINEL_VOLUNTEER_LOCATION",
    summary: "SENTINEL_VOLUNTEER_SUMMARY",
  },
  publications: {
    title: "SENTINEL_PUBLICATION_TITLE",
    publisher: "SENTINEL_PUBLICATION_PUBLISHER",
    url: "example.com/SENTINEL_PUBLICATION_URL",
    summary: "SENTINEL_PUBLICATION_SUMMARY",
  },
  references: {
    name: "SENTINEL_REFERENCE_NAME",
    position: "SENTINEL_REFERENCE_POSITION",
    company: "SENTINEL_REFERENCE_COMPANY",
    phone: "SENTINEL_REFERENCE_PHONE",
    email: "SENTINEL_REFERENCE_EMAIL@example.com",
    summary: "SENTINEL_REFERENCE_SUMMARY",
  },
  custom: {
    title: "SENTINEL_CUSTOM_TITLE",
    name: "SENTINEL_CUSTOM_NAME",
    description: "SENTINEL_CUSTOM_DESCRIPTION",
    location: "SENTINEL_CUSTOM_LOCATION",
    url: "example.com/SENTINEL_CUSTOM_URL",
  },
} as const;

const CUSTOM_SECTION_ID = "custom-wiring";

/** Human-readable dates the renderers must produce from the stored months. */
const FORMATTED_DATES = [
  "Mar 2013 — Apr 2014", // experience
  "Jan 2011 — Feb 2012", // education
  "May 2015 — Jun 2016", // projects
  "Jul 2017", // certification
  "Aug 2018", // award
  "Sep 2019 — Oct 2020", // volunteer
  "Nov 2021", // publication
  "Dec 2022", // custom
];

function richText(value: string): string {
  return `<p>${value}</p>`;
}

function buildWiringDocument(): ResumeDocument {
  const doc = createEmptyResume();

  doc.basics = {
    ...doc.basics,
    name: SENTINEL.basics.name,
    headline: SENTINEL.basics.headline,
    email: SENTINEL.basics.email,
    phone: SENTINEL.basics.phone,
    location: SENTINEL.basics.location,
    workAuth: SENTINEL.basics.workAuth,
    website: { url: SENTINEL.basics.websiteUrl, label: "" },
  };

  doc.summary.content = richText(SENTINEL.summary);

  doc.sections.profiles.items = [
    {
      id: "profile-1",
      hidden: false,
      network: SENTINEL.profiles.network,
      username: SENTINEL.profiles.username,
      url: SENTINEL.profiles.url,
      icon: "",
    },
  ];

  doc.sections.experience.items = [
    ExperienceItemSchema.parse({
      id: "experience-1",
      company: SENTINEL.experience.company,
      position: SENTINEL.experience.position,
      location: SENTINEL.experience.location,
      startDate: "2013-03",
      endDate: "2014-04",
      summary: richText(SENTINEL.experience.summary),
    }),
  ];

  doc.sections.education.items = [
    EducationItemSchema.parse({
      id: "education-1",
      school: SENTINEL.education.school,
      degree: SENTINEL.education.degree,
      area: SENTINEL.education.area,
      location: SENTINEL.education.location,
      startDate: "2011-01",
      endDate: "2012-02",
      grade: SENTINEL.education.grade,
      summary: richText(SENTINEL.education.summary),
    }),
  ];

  doc.sections.projects.items = [
    {
      id: "project-1",
      hidden: false,
      name: SENTINEL.projects.name,
      description: richText(SENTINEL.projects.description),
      url: SENTINEL.projects.url,
      startDate: "2015-05",
      endDate: "2016-06",
      keywords: [SENTINEL.projects.keyword],
    },
  ];

  doc.sections.skills.items = [
    {
      id: "skill-1",
      hidden: false,
      name: SENTINEL.skills.name,
      level: 0,
      keywords: [SENTINEL.skills.keyword],
    },
  ];

  doc.sections.certifications.items = [
    CertificationItemSchema.parse({
      id: "certification-1",
      name: SENTINEL.certifications.name,
      issuer: SENTINEL.certifications.issuer,
      date: "2017-07",
      url: SENTINEL.certifications.url,
    }),
  ];

  doc.sections.awards.items = [
    {
      id: "award-1",
      hidden: false,
      title: SENTINEL.awards.title,
      awarder: SENTINEL.awards.awarder,
      date: "2018-08",
      summary: richText(SENTINEL.awards.summary),
    },
  ];

  doc.sections.languages.items = [
    {
      id: "language-1",
      hidden: false,
      name: SENTINEL.languages.name,
      level: 4,
      fluency: SENTINEL.languages.fluency,
    },
  ];

  doc.sections.interests.items = [
    {
      id: "interest-1",
      hidden: false,
      name: SENTINEL.interests.name,
      keywords: [SENTINEL.interests.keyword],
    },
  ];

  doc.sections.volunteer.items = [
    {
      id: "volunteer-1",
      hidden: false,
      organization: SENTINEL.volunteer.organization,
      position: SENTINEL.volunteer.position,
      location: SENTINEL.volunteer.location,
      startDate: "2019-09",
      endDate: "2020-10",
      current: false,
      summary: richText(SENTINEL.volunteer.summary),
    },
  ];

  doc.sections.publications.items = [
    PublicationItemSchema.parse({
      id: "publication-1",
      title: SENTINEL.publications.title,
      publisher: SENTINEL.publications.publisher,
      date: "2021-11",
      url: SENTINEL.publications.url,
      summary: richText(SENTINEL.publications.summary),
    }),
  ];

  doc.sections.references.items = [
    {
      id: "reference-1",
      hidden: false,
      name: SENTINEL.references.name,
      position: SENTINEL.references.position,
      company: SENTINEL.references.company,
      phone: SENTINEL.references.phone,
      email: SENTINEL.references.email,
      summary: richText(SENTINEL.references.summary),
    },
  ];

  doc.customSections = [
    CustomSectionSchema.parse({
      id: CUSTOM_SECTION_ID,
      title: SENTINEL.custom.title,
      items: [
        {
          id: "custom-1",
          name: SENTINEL.custom.name,
          description: richText(SENTINEL.custom.description),
          date: "2022-12",
          location: SENTINEL.custom.location,
          url: SENTINEL.custom.url,
        },
      ],
    }),
  ];

  doc.metadata.layout.pages = [
    {
      fullWidth: false,
      main: [
        "summary",
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
        CUSTOM_SECTION_ID,
      ],
      sidebar: [],
    },
  ];

  return doc;
}

function sentinelTextValues(): string[] {
  const values: string[] = [SENTINEL.summary];

  for (const group of Object.values(SENTINEL)) {
    if (typeof group === "string") {
      continue;
    }

    for (const value of Object.values(group)) {
      values.push(value);
    }
  }

  return values;
}

describe("all editable fields wiring", () => {
  const doc = buildWiringDocument();
  const pageSectionIds = doc.metadata.layout.pages[0].main;

  it("renders every editable text field in Visual Preview/PDF", () => {
    const { container } = render(
      <>
        <HeaderSlot doc={doc} />
        <SectionRenderer doc={doc} pageSectionIds={pageSectionIds} />
      </>,
    );
    const rendered = container.textContent ?? "";

    for (const value of sentinelTextValues()) {
      expect(rendered, `missing visual field: ${value}`).toContain(value);
    }

    for (const date of FORMATTED_DATES) {
      expect(rendered, `missing visual date: ${date}`).toContain(date);
    }

    // Numeric proficiency is a visual indicator, not text: assert its label.
    expect(screen.getByRole("img", { name: "Proficiency 4 of 5" })).toBeInTheDocument();
  });

  it("renders clickable links for every URL field", () => {
    render(
      <>
        <HeaderSlot doc={doc} />
        <SectionRenderer doc={doc} pageSectionIds={pageSectionIds} />
      </>,
    );

    // A bare host in the stored value becomes an absolute https href while the
    // visible label stays cleaned (no scheme).
    expect(
      screen.getByRole("link", {
        name: "example.com/SENTINEL_BASICS_WEBSITE",
      }),
    ).toHaveAttribute("href", `https://${SENTINEL.basics.websiteUrl}`);
    // Profiles are promoted into the header as well as the Profiles section,
    // so the same cleaned link appears once in each renderer.
    const profileLinks = screen.getAllByRole("link", {
      name: "example.com/SENTINEL_PROFILE_URL",
    });
    expect(profileLinks).toHaveLength(2);

    for (const link of profileLinks) {
      expect(link).toHaveAttribute(
        "href",
        `https://${SENTINEL.profiles.url}`,
      );
    }

    expect(
      screen.getByRole("link", {
        name: "example.com/SENTINEL_CERTIFICATION_URL",
      }),
    ).toHaveAttribute("href", `https://${SENTINEL.certifications.url}`);
    expect(
      screen.getByRole("link", {
        name: "example.com/SENTINEL_PUBLICATION_URL",
      }),
    ).toHaveAttribute("href", `https://${SENTINEL.publications.url}`);
  });

  it("prints every editable text field in the ATS text", () => {
    const ats = buildAtsText(doc);

    for (const value of sentinelTextValues()) {
      expect(ats, `missing ATS field: ${value}`).toContain(value);
    }

    for (const date of FORMATTED_DATES) {
      expect(ats, `missing ATS date: ${date}`).toContain(date);
    }
  });

  it("keeps a URL-only profile visible in both renderers", () => {
    const urlOnly = createEmptyResume();

    urlOnly.metadata.layout.pages = [
      { fullWidth: false, main: ["profiles"], sidebar: [] },
    ];
    urlOnly.sections.profiles.items = [
      {
        id: "profile-url-only",
        hidden: false,
        network: "",
        username: "",
        url: "example.com/SENTINEL_URL_ONLY_PROFILE",
        icon: "",
      },
    ];

    const { container } = render(
      <SectionRenderer doc={urlOnly} pageSectionIds={["profiles"]} />,
    );

    expect(container.textContent).toContain(
      "example.com/SENTINEL_URL_ONLY_PROFILE",
    );
    expect(
      screen.getByRole("link", {
        name: "example.com/SENTINEL_URL_ONLY_PROFILE",
      }),
    ).toHaveAttribute("href", "https://example.com/SENTINEL_URL_ONLY_PROFILE");
    // ATS text is plain text: it mirrors the stored url value verbatim rather
    // than inventing a scheme the way the clickable preview link does.
    expect(buildAtsText(urlOnly)).toContain(
      "example.com/SENTINEL_URL_ONLY_PROFILE",
    );
  });
});
