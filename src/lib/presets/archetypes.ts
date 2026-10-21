import { createEmptyResume, newId } from "@/lib/schema/defaults";
import type {
  CertificationItem,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  ResumeDocument,
  SkillItem,
} from "@/lib/schema/resume.schema";

export type Archetype = {
  id: string;
  label: string;
  description: string;
  build(): ResumeDocument;
};

function bulletList(lines: string[]): string {
  return `<ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul>`;
}

type ExperienceInput = {
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
};

function experience(input: ExperienceInput): ExperienceItem {
  return {
    id: newId(),
    hidden: false,
    company: input.company,
    position: input.position,
    location: input.location,
    startDate: input.startDate,
    endDate: input.endDate,
    current: false,
    summary: bulletList(input.bullets),
  };
}

type EducationInput = {
  school: string;
  degree: string;
  area: string;
  location: string;
  startDate: string;
  endDate: string;
  grade: string;
};

function education(input: EducationInput): EducationItem {
  return {
    id: newId(),
    hidden: false,
    school: input.school,
    degree: input.degree,
    area: input.area,
    location: input.location,
    startDate: input.startDate,
    endDate: input.endDate,
    grade: input.grade,
    summary: "",
    current: false,
  };
}

type ProjectInput = {
  name: string;
  url: string;
  startDate: string;
  endDate: string;
  bullets: string[];
  keywords: string[];
};

function project(input: ProjectInput): ProjectItem {
  return {
    id: newId(),
    hidden: false,
    name: input.name,
    description: bulletList(input.bullets),
    url: input.url,
    startDate: input.startDate,
    endDate: input.endDate,
    keywords: input.keywords,
  };
}

function skill(name: string, level: number): SkillItem {
  return { id: newId(), hidden: false, name, level, keywords: [] };
}

function certification(
  name: string,
  issuer: string,
  date: string,
  url: string,
): CertificationItem {
  return { id: newId(), hidden: false, name, issuer, date, url };
}

const SOFTWARE_ENGINEER: Archetype = {
  id: "software-engineer",
  label: "Software Engineer",
  description: "Backend and platform roles with measurable system wins.",
  build() {
    const doc = createEmptyResume("onyx");

    return {
      ...doc,
      basics: {
        ...doc.basics,
        name: "Maya Chen",
        headline: "Senior Backend Engineer",
        email: "maya.chen@example.com",
        phone: "(206) 555-0142",
        location: "Seattle, WA",
        website: { url: "https://mayachen.dev", label: "mayachen.dev" },
      },
      summary: {
        ...doc.summary,
        content:
          "<p>Backend engineer with 6 years of experience building payment and data platforms. Known for turning brittle services into measurable, well-instrumented systems.</p>",
      },
      sections: {
        ...doc.sections,
        experience: {
          ...doc.sections.experience,
          items: [
            experience({
              company: "Northwind Systems",
              position: "Senior Backend Engineer",
              location: "Seattle, WA",
              startDate: "2022-03",
              endDate: "2025-08",
              bullets: [
                "Cut p95 checkout latency by 42% by introducing a read-through cache and query plan rewrites across 14 services.",
                "Led a 6-engineer migration to event-driven billing, reducing failed invoice retries by 2,300 per month.",
                "Raised test coverage from 61% to 88% by adding contract tests and a CI gate that blocked 120 flaky merges.",
              ],
            }),
            experience({
              company: "Brightline Labs",
              position: "Backend Engineer",
              location: "Portland, OR",
              startDate: "2019-06",
              endDate: "2022-02",
              bullets: [
                "Scaled the orders API from 400 to 4,800 requests per second while holding error rates below 0.2%.",
                "Shipped a self-serve onboarding flow that shortened partner setup from 9 days to 36 hours.",
                "Reduced cloud spend by $18,000 per month by right-sizing 60 containers and retiring 3 legacy queues.",
              ],
            }),
          ],
        },
        education: {
          ...doc.sections.education,
          items: [
            education({
              school: "University of Washington",
              degree: "B.S.",
              area: "Computer Science",
              location: "Seattle, WA",
              startDate: "2015-09",
              endDate: "2019-05",
              grade: "3.8 GPA",
            }),
          ],
        },
        skills: {
          ...doc.sections.skills,
          items: [
            skill("TypeScript", 5),
            skill("Node.js", 5),
            skill("PostgreSQL", 4),
            skill("AWS", 4),
            skill("Docker", 4),
            skill("GraphQL", 3),
          ],
        },
        projects: {
          ...doc.sections.projects,
          items: [
            project({
              name: "Ledger API",
              url: "https://github.com/mayachen/ledger-api",
              startDate: "2023-02",
              endDate: "2023-11",
              bullets: [
                "Processed 1.2 million ledger entries per day with idempotent writes and a 99.98% success rate.",
                "Cut reconciliation time by 73% by streaming balance snapshots into a queryable audit log.",
              ],
              keywords: ["TypeScript", "PostgreSQL", "Redis"],
            }),
            project({
              name: "OpenStatus",
              url: "https://github.com/mayachen/openstatus",
              startDate: "2022-05",
              endDate: "2022-10",
              bullets: [
                "Monitored 80 endpoints every 30 seconds with a 9-second median alert delay.",
                "Grew to 1,400 weekly checks after launching a public status page in 6 weeks.",
              ],
              keywords: ["Go", "SQLite", "Grafana"],
            }),
          ],
        },
        certifications: {
          ...doc.sections.certifications,
          items: [
            certification(
              "AWS Certified Solutions Architect - Associate",
              "Amazon Web Services",
              "2023-11",
              "https://www.credly.com",
            ),
          ],
        },
      },
    };
  },
};

const PRODUCT_MANAGER: Archetype = {
  id: "product-manager",
  label: "Product Manager",
  description: "Roadmap, discovery, and growth work for consumer products.",
  build() {
    const doc = createEmptyResume("onyx");

    return {
      ...doc,
      basics: {
        ...doc.basics,
        name: "Jordan Alvarez",
        headline: "Senior Product Manager",
        email: "jordan.alvarez@example.com",
        phone: "(415) 555-0188",
        location: "San Francisco, CA",
        website: {
          url: "https://jordanalvarez.co",
          label: "jordanalvarez.co",
        },
      },
      summary: {
        ...doc.summary,
        content:
          "<p>Product manager with 7 years of experience shipping commerce and health products. Turns ambiguous customer signals into focused roadmaps with measurable outcomes. Works closely with design, engineering, and go-to-market teams.</p>",
      },
      sections: {
        ...doc.sections,
        experience: {
          ...doc.sections.experience,
          items: [
            experience({
              company: "Helio Commerce",
              position: "Senior Product Manager",
              location: "San Francisco, CA",
              startDate: "2021-01",
              endDate: "2025-06",
              bullets: [
                "Grew checkout conversion from 3.1% to 4.6% by running 18 experiments and rebuilding the payment step.",
                "Lifted 30-day retention by 12 points by launching a personalized reorder flow used by 84,000 shoppers.",
                "Cut time to launch from 11 weeks to 6 weeks by introducing a 3-tier discovery and sizing process.",
              ],
            }),
            experience({
              company: "Vantage Health",
              position: "Product Manager",
              location: "Oakland, CA",
              startDate: "2018-04",
              endDate: "2020-12",
              bullets: [
                "Increased appointment completion by 23% by shipping reminders across SMS and email to 46,000 patients.",
                "Reduced support tickets by 1,900 per quarter by redesigning the benefits search experience.",
                "Aligned 5 squads on a single roadmap that delivered 14 releases with zero missed compliance deadlines.",
              ],
            }),
          ],
        },
        education: {
          ...doc.sections.education,
          items: [
            education({
              school: "New York University",
              degree: "B.S.",
              area: "Business Administration",
              location: "New York, NY",
              startDate: "2014-09",
              endDate: "2018-05",
              grade: "3.7 GPA",
            }),
          ],
        },
        skills: {
          ...doc.sections.skills,
          items: [
            skill("Roadmapping", 5),
            skill("Experimentation", 5),
            skill("SQL", 4),
            skill("Analytics", 4),
            skill("Figma", 3),
            skill("Stakeholder Management", 5),
          ],
        },
        projects: {
          ...doc.sections.projects,
          items: [
            project({
              name: "Pricing Refresh",
              url: "https://jordanalvarez.co/work/pricing",
              startDate: "2023-05",
              endDate: "2023-10",
              bullets: [
                "Modeled 3 pricing tiers against 12 months of usage data and lifted expansion revenue by 9%.",
                "Coordinated launch across 4 teams and 1,200 accounts in 10 weeks.",
                "Cut discount approvals by 40% with a self-serve quote calculator.",
              ],
              keywords: ["Pricing", "Research", "Go-to-market"],
            }),
            project({
              name: "Retention Sprint",
              url: "https://jordanalvarez.co/work/retention",
              startDate: "2022-02",
              endDate: "2022-06",
              bullets: [
                "Interviewed 24 churned customers and identified 5 repeatable churn drivers.",
                "Shipped 7 fixes that recovered 310 accounts in 90 days.",
                "Raised onboarding completion by 16% with a 4-step guided checklist.",
              ],
              keywords: ["Retention", "Onboarding", "Analytics"],
            }),
          ],
        },
        certifications: {
          ...doc.sections.certifications,
          items: [
            certification(
              "Certified Product Manager",
              "Pragmatic Institute",
              "2022-04",
              "https://www.pragmaticinstitute.com",
            ),
          ],
        },
      },
    };
  },
};

const UX_UI_DESIGNER: Archetype = {
  id: "ux-ui-designer",
  label: "UX/UI Designer",
  description:
    "Product design, research, and design systems with shipped outcomes.",
  build() {
    const doc = createEmptyResume("onyx");

    return {
      ...doc,
      basics: {
        ...doc.basics,
        name: "Priya Raman",
        headline: "Senior Product Designer",
        email: "priya.raman@example.com",
        phone: "(312) 555-0164",
        location: "Chicago, IL",
        website: { url: "https://priyaraman.design", label: "priyaraman.design" },
      },
      summary: {
        ...doc.summary,
        content:
          "<p>Product designer with 7 years of experience shaping onboarding, checkout, and internal tools. Pairs research with systems thinking to ship work that is both usable and maintainable. Builds accessible interfaces with engineers from the first sketch.</p>",
      },
      sections: {
        ...doc.sections,
        experience: {
          ...doc.sections.experience,
          items: [
            experience({
              company: "Lumen Studio",
              position: "Senior Product Designer",
              location: "Chicago, IL",
              startDate: "2021-09",
              endDate: "2025-07",
              bullets: [
                "Raised task success from 68% to 92% by redesigning a 9-screen onboarding flow after 14 usability sessions.",
                "Built a 120-component design system that cut new-screen build time by 35% across 4 product teams.",
                "Improved checkout accessibility to WCAG 2.2 AA on 26 screens, clearing 47 audit findings.",
              ],
            }),
            experience({
              company: "Northstar Apps",
              position: "Product Designer",
              location: "Madison, WI",
              startDate: "2018-03",
              endDate: "2021-08",
              bullets: [
                "Increased trial signups by 27% by shipping a simplified landing page tested with 220 users.",
                "Reduced design handoff questions by 60% by pairing 8 flows with annotated prototypes.",
                "Led research with 36 customers that reshaped the 2019 roadmap around 3 priority jobs.",
              ],
            }),
          ],
        },
        education: {
          ...doc.sections.education,
          items: [
            education({
              school: "Rhode Island School of Design",
              degree: "B.F.A.",
              area: "Graphic Design",
              location: "Providence, RI",
              startDate: "2014-09",
              endDate: "2018-05",
              grade: "3.9 GPA",
            }),
          ],
        },
        skills: {
          ...doc.sections.skills,
          items: [
            skill("Figma", 5),
            skill("Prototyping", 5),
            skill("Design Systems", 4),
            skill("User Research", 4),
            skill("Accessibility", 4),
            skill("HTML/CSS", 3),
          ],
        },
        projects: {
          ...doc.sections.projects,
          items: [
            project({
              name: "Atlas Design System",
              url: "https://priyaraman.design/work/atlas",
              startDate: "2023-01",
              endDate: "2023-09",
              bullets: [
                "Documented 120 components and 38 tokens adopted by 4 product teams.",
                "Cut design QA cycles from 6 days to 2 days with shared Figma libraries.",
                "Shipped dark mode across 11 surfaces in 5 weeks.",
              ],
              keywords: ["Design Systems", "Figma", "Tokens"],
            }),
            project({
              name: "Transit Wayfinding",
              url: "https://priyaraman.design/work/transit",
              startDate: "2020-03",
              endDate: "2020-08",
              bullets: [
                "Tested 6 signage layouts with 48 riders and improved route-finding success by 31%.",
                "Delivered a 42-screen prototype in 4 weeks for a city pilot.",
                "Reduced missed transfers by 18% in a 90-day field study.",
              ],
              keywords: ["Research", "Wayfinding", "Prototyping"],
            }),
          ],
        },
        certifications: {
          ...doc.sections.certifications,
          items: [
            certification(
              "UX Certification",
              "Nielsen Norman Group",
              "2020-08",
              "https://www.nngroup.com",
            ),
          ],
        },
      },
    };
  },
};

const FINANCE_OPERATIONS: Archetype = {
  id: "finance-operations",
  label: "Finance & Operations",
  description: "FP&A, forecasting, and operations gains with hard numbers.",
  build() {
    const doc = createEmptyResume("onyx");

    return {
      ...doc,
      basics: {
        ...doc.basics,
        name: "Daniel Okafor",
        headline: "Finance & Operations Manager",
        email: "daniel.okafor@example.com",
        phone: "(617) 555-0119",
        location: "Boston, MA",
        website: { url: "https://danielokafor.com", label: "danielokafor.com" },
      },
      summary: {
        ...doc.summary,
        content:
          "<p>Finance and operations leader with 9 years of experience across logistics and professional services. Builds planning models and controls that teams actually use. Combines close-cycle discipline with hands-on vendor and process work.</p>",
      },
      sections: {
        ...doc.sections,
        experience: {
          ...doc.sections.experience,
          items: [
            experience({
              company: "Crestline Logistics",
              position: "Finance & Operations Manager",
              location: "Boston, MA",
              startDate: "2020-02",
              endDate: "2025-09",
              bullets: [
                "Cut monthly close from 9 days to 4 days by automating 22 reconciliations in NetSuite.",
                "Improved forecast accuracy from 82% to 95% by rebuilding the driver-based model across 7 cost centers.",
                "Saved $640,000 annually by renegotiating 14 vendor contracts and consolidating 3 suppliers.",
              ],
            }),
            experience({
              company: "Meridian Partners",
              position: "Senior Financial Analyst",
              location: "Providence, RI",
              startDate: "2016-08",
              endDate: "2020-01",
              bullets: [
                "Built a 5-year planning model that guided a $12 million expansion into 2 new regions.",
                "Reduced invoice processing time by 46% by rolling out approval workflows to 30 users.",
                "Identified $310,000 in duplicate spend through a 12-month vendor audit.",
              ],
            }),
          ],
        },
        education: {
          ...doc.sections.education,
          items: [
            education({
              school: "University of Michigan",
              degree: "B.B.A.",
              area: "Finance",
              location: "Ann Arbor, MI",
              startDate: "2012-09",
              endDate: "2016-05",
              grade: "3.6 GPA",
            }),
          ],
        },
        skills: {
          ...doc.sections.skills,
          items: [
            skill("Financial Modeling", 5),
            skill("FP&A", 5),
            skill("Excel", 5),
            skill("SQL", 3),
            skill("Process Improvement", 4),
            skill("Vendor Negotiation", 4),
          ],
        },
        projects: {
          ...doc.sections.projects,
          items: [
            project({
              name: "Close Automation",
              url: "https://danielokafor.com/work/close",
              startDate: "2023-03",
              endDate: "2023-08",
              bullets: [
                "Automated 22 journal entries and saved 31 hours per month.",
                "Reduced posting errors by 78% across 7 entities.",
                "Documented 18 controls adopted by the 6-person accounting team.",
              ],
              keywords: ["NetSuite", "Controls", "Automation"],
            }),
            project({
              name: "Freight Cost Review",
              url: "https://danielokafor.com/work/freight",
              startDate: "2022-01",
              endDate: "2022-05",
              bullets: [
                "Analyzed 14 months of lane data covering 2,400 shipments.",
                "Identified 3 underperforming carriers and cut freight spend by 11%.",
                "Built a weekly dashboard used by 9 operations managers.",
              ],
              keywords: ["Analytics", "Procurement", "Dashboards"],
            }),
          ],
        },
        certifications: {
          ...doc.sections.certifications,
          items: [
            certification(
              "Certified Management Accountant (CMA)",
              "IMA",
              "2022-09",
              "https://www.imanet.org",
            ),
          ],
        },
      },
    };
  },
};

const FRESH_GRADUATE: Archetype = {
  id: "fresh-graduate",
  label: "Fresh Graduate",
  description: "Internships and coursework projects for an early-career start.",
  build() {
    const doc = createEmptyResume("onyx");

    return {
      ...doc,
      basics: {
        ...doc.basics,
        name: "Aisha Patel",
        headline: "Computer Science Graduate",
        email: "aisha.patel@example.com",
        phone: "(404) 555-0137",
        location: "Atlanta, GA",
        website: { url: "https://aishapatel.dev", label: "aishapatel.dev" },
      },
      summary: {
        ...doc.summary,
        content:
          "<p>Computer science graduate with hands-on experience in data engineering and campus IT support. Ships reliable tools, documents them clearly, and learns new stacks quickly. Seeking an entry-level software engineering role.</p>",
      },
      sections: {
        ...doc.sections,
        experience: {
          ...doc.sections.experience,
          items: [
            experience({
              company: "Brightpath Analytics",
              position: "Data Engineering Intern",
              location: "Atlanta, GA",
              startDate: "2024-06",
              endDate: "2024-09",
              bullets: [
                "Cut nightly pipeline runtime by 34% by rewriting 6 Spark jobs and partitioning 2 large tables.",
                "Added 48 data quality checks that caught 19 schema regressions before release.",
                "Documented 12 runbooks that reduced onboarding time for 3 new interns by half.",
              ],
            }),
            experience({
              company: "Campus Tech Hub",
              position: "IT Support Assistant (Part-time)",
              location: "Atlanta, GA",
              startDate: "2023-09",
              endDate: "2024-05",
              bullets: [
                "Resolved 420 support tickets with a 96% satisfaction score across 2 semesters.",
                "Automated 5 recurring setup tasks and saved 7 staff hours per week.",
                "Trained 60 students on lab tools during 12 orientation sessions.",
              ],
            }),
          ],
        },
        education: {
          ...doc.sections.education,
          items: [
            education({
              school: "Georgia Institute of Technology",
              degree: "B.S.",
              area: "Computer Science",
              location: "Atlanta, GA",
              startDate: "2021-08",
              endDate: "2025-05",
              grade: "3.9 GPA",
            }),
          ],
        },
        skills: {
          ...doc.sections.skills,
          items: [
            skill("Python", 4),
            skill("SQL", 4),
            skill("Java", 3),
            skill("Git", 4),
            skill("React", 3),
            skill("Data Structures", 4),
          ],
        },
        projects: {
          ...doc.sections.projects,
          items: [
            project({
              name: "Campus Course Planner",
              url: "https://github.com/aishapatel/course-planner",
              startDate: "2024-01",
              endDate: "2024-04",
              bullets: [
                "Served 380 students during registration week with a 99.9% uptime record.",
                "Reduced schedule conflicts by 41% with a constraint checker over 1,200 course sections.",
                "Wrote 64 unit tests and kept median response time under 120 milliseconds.",
              ],
              keywords: ["React", "TypeScript", "PostgreSQL"],
            }),
            project({
              name: "Sentiment Dashboard",
              url: "https://github.com/aishapatel/sentiment-dashboard",
              startDate: "2023-09",
              endDate: "2023-12",
              bullets: [
                "Processed 25,000 reviews and classified sentiment with 88% accuracy.",
                "Visualized 6 weekly trends in a React dashboard used by 2 research teams.",
                "Cut report preparation from 5 hours to 20 minutes with automated exports.",
              ],
              keywords: ["Python", "Pandas", "React"],
            }),
          ],
        },
        certifications: {
          ...doc.sections.certifications,
          items: [],
        },
      },
    };
  },
};

export const ARCHETYPES: Archetype[] = [
  SOFTWARE_ENGINEER,
  PRODUCT_MANAGER,
  UX_UI_DESIGNER,
  FINANCE_OPERATIONS,
  FRESH_GRADUATE,
];

export function buildArchetype(id: string): ResumeDocument | null {
  const archetype = ARCHETYPES.find((candidate) => candidate.id === id);
  return archetype ? archetype.build() : null;
}
