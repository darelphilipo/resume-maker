import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import {
  AwardItemSchema,
  ExperienceItemSchema,
  ProjectItemSchema,
} from "@/lib/schema/resume.schema";

import {
  analyzeResumeLint,
  collectResumeBullets,
  standardizeBulletPeriods,
} from "./resumeLint";

function experience(
  id: string,
  position: string,
  summary: string,
  hidden = false,
) {
  return ExperienceItemSchema.parse({
    id,
    company: `${position} Co`,
    position,
    summary,
    hidden,
  });
}

describe("collectResumeBullets", () => {
  it("reads bullets from visible rich-text sections only", () => {
    const doc = createEmptyResume();

    doc.summary.content = "<p>Intro</p><ul><li>Built APIs</li></ul>";
    doc.sections.experience.items = [
      experience("exp-1", "Engineer", "<ul><li>Led the team</li></ul>"),
      experience("exp-2", "Ghost", "<ul><li>Hidden role</li></ul>", true),
    ];
    doc.sections.projects.items = [
      ProjectItemSchema.parse({
        id: "project-1",
        name: "Toolkit",
        description: "<ul><li>Shipped the CLI</li></ul>",
      }),
    ];
    doc.sections.awards.items = [
      AwardItemSchema.parse({
        id: "award-1",
        title: "Hidden award",
        summary: "<ul><li>Hidden award bullet</li></ul>",
      }),
    ];
    doc.sections.awards.hidden = true;

    expect(collectResumeBullets(doc).map((bullet) => bullet.text)).toEqual([
      "Built APIs",
      "Led the team",
      "Shipped the CLI",
    ]);
  });

  it("ignores nested-list parents so one bullet is not counted twice", () => {
    const doc = createEmptyResume();

    doc.summary.content =
      "<ul><li><p>Parent line</p><ul><li>Child line</li></ul></li></ul>";

    expect(collectResumeBullets(doc).map((bullet) => bullet.text)).toEqual([
      "Child line",
    ]);
  });
});

describe("analyzeResumeLint", () => {
  it("flags mixed trailing periods and counts the other endings", () => {
    const doc = createEmptyResume();

    doc.summary.content =
      "<ul><li>Built APIs.</li><li>Led the team</li><li>Cut latency?</li></ul>";

    const report = analyzeResumeLint(doc);

    expect(report.bulletCount).toBe(3);
    expect(report.periods).toMatchObject({
      withPeriod: 1,
      withoutPeriod: 1,
      otherTerminal: 1,
      mixed: true,
    });
    expect(report.findings).toContainEqual(
      expect.objectContaining({
        id: "mixed-periods",
        count: 2,
        detail: "1 bullet ends with a period and 1 bullet does not.",
      }),
    );
  });

  it("does not flag a consistent period style", () => {
    const doc = createEmptyResume();

    doc.summary.content = "<ul><li>Built APIs.</li><li>Led the team.</li></ul>";

    const report = analyzeResumeLint(doc);

    expect(report.periods.mixed).toBe(false);
    expect(report.findings.map((finding) => finding.id)).not.toContain(
      "mixed-periods",
    );
  });

  it("flags first-person pronouns without matching inside words", () => {
    const doc = createEmptyResume();

    doc.summary.content =
      "<ul><li>I built the API.</li><li>Improved my team's onboarding.</li><li>Impact grew 20%.</li></ul>";

    const report = analyzeResumeLint(doc);

    expect(report.pronounCount).toBe(2);
    expect(report.findings).toContainEqual(
      expect.objectContaining({ id: "first-person", count: 2 }),
    );
  });

  it("ignores i.e., I/O, and Roman numeral I", () => {
    const doc = createEmptyResume();

    doc.summary.content =
      "<ul><li>Owned the I/O layer, i.e. the ingest path.</li>" +
      "<li>Delivered Phase I of the migration.</li>" +
      "<li>Led Part I of the rollout.</li>" +
      "<li>I built the API.</li></ul>";

    const report = analyzeResumeLint(doc);

    expect(report.pronounCount).toBe(1);
    expect(report.findings).toContainEqual(
      expect.objectContaining({ id: "first-person", count: 1 }),
    );
  });

  it("flags filler adverbs and keeps the snippets short", () => {
    const doc = createEmptyResume();

    doc.summary.content =
      "<ul><li>Successfully shipped the API.</li><li>Diligently reviewed every pull request across the platform, the mobile client, and the design system.</li><li>Built the client.</li></ul>";

    const report = analyzeResumeLint(doc);
    const filler = report.findings.find((finding) => finding.id === "filler");

    expect(filler?.count).toBe(2);
    expect(filler?.snippets).toHaveLength(2);
    expect(filler?.snippets[1].endsWith("…")).toBe(true);
  });

  it("flags a repeated opening verb inside one role only", () => {
    const doc = createEmptyResume();

    doc.sections.experience.items = [
      experience(
        "exp-1",
        "Engineer",
        "<ul><li>Built the API.</li><li>Built the worker.</li><li>Led reviews.</li></ul>",
      ),
      experience("exp-2", "Analyst", "<ul><li>Built a dashboard.</li></ul>"),
    ];

    const report = analyzeResumeLint(doc);
    const repeated = report.findings.filter(
      (finding) => finding.id === "repeated-verbs",
    );

    expect(repeated).toHaveLength(1);
    expect(repeated[0]).toMatchObject({
      count: 2,
      title: "Repeated opening verb “Built”",
      verb: "Built",
      target: { sectionId: "experience", entryId: "exp-1" },
    });
    expect(report.repeatedVerbCount).toBe(2);
  });

  it("does not treat articles or pronouns as repeated verbs", () => {
    const doc = createEmptyResume();

    doc.summary.content =
      "<ul><li>The API shipped.</li><li>The worker shipped.</li><li>I built it.</li><li>I shipped it.</li></ul>";

    const report = analyzeResumeLint(doc);

    expect(
      report.findings.filter((finding) => finding.id === "repeated-verbs"),
    ).toHaveLength(0);
  });
});

describe("standardizeBulletPeriods", () => {
  it("removes trailing periods without touching formatting or the input doc", () => {
    const doc = createEmptyResume();

    doc.summary.content =
      "<ul><li><p>Built <strong>APIs</strong>.</p></li><li><p>Led the team.</p></li><li><p>Why?</p></li></ul>";

    const original = doc.summary.content;
    const next = standardizeBulletPeriods(doc, "remove");

    expect(doc.summary.content).toBe(original);
    expect(next).not.toBe(doc);
    expect(next.summary.content).toBe(
      "<ul><li><p>Built <strong>APIs</strong></p></li><li><p>Led the team</p></li><li><p>Why?</p></li></ul>",
    );
  });

  it("adds a period before the final paragraph close and skips terminal punctuation", () => {
    const doc = createEmptyResume();

    doc.summary.content =
      "<ul><li><p>Built <strong>APIs</strong></p></li><li><p>Led the team.</p></li><li><p>Why?</p></li></ul>";

    const next = standardizeBulletPeriods(doc, "add");

    expect(next.summary.content).toBe(
      "<ul><li><p>Built <strong>APIs</strong>.</p></li><li><p>Led the team.</p></li><li><p>Why?</p></li></ul>",
    );
  });

  it("removes one final period while preserving nested closing tags", () => {
    const doc = createEmptyResume();

    doc.summary.content =
      "<ul><li><p><strong><em>Shipped APIs.</em></strong></p></li></ul>";

    const next = standardizeBulletPeriods(doc, "remove");

    expect(next.summary.content).toBe(
      "<ul><li><p><strong><em>Shipped APIs</em></strong></p></li></ul>",
    );
  });

  it("leaves an ellipsis alone while removing a single trailing period", () => {
    const doc = createEmptyResume();

    doc.summary.content =
      "<ul><li>Shipped APIs...</li><li>Led the team.</li></ul>";

    const next = standardizeBulletPeriods(doc, "remove");

    expect(next.summary.content).toBe(
      "<ul><li>Shipped APIs...</li><li>Led the team</li></ul>",
    );
  });

  it("handles plain li markup and leaves hidden entries alone", () => {
    const doc = createEmptyResume();

    doc.summary.content = "<ul><li>Built APIs</li></ul>";
    doc.sections.experience.items = [
      experience("exp-1", "Engineer", "<ul><li>Led the team</li></ul>"),
      experience("exp-2", "Ghost", "<ul><li>Hidden role</li></ul>", true),
    ];

    const next = standardizeBulletPeriods(doc, "add");

    expect(next.summary.content).toBe("<ul><li>Built APIs.</li></ul>");
    expect(next.sections.experience.items[0].summary).toBe(
      "<ul><li>Led the team.</li></ul>",
    );
    expect(next.sections.experience.items[1].summary).toBe(
      "<ul><li>Hidden role</li></ul>",
    );
  });
});
