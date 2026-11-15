import { describe, expect, it } from "vitest";

import { GENERIC_SECTION_FIELDS } from "./sectionFields";

describe("GENERIC_SECTION_FIELDS", () => {
  it.each(["certifications", "awards", "publications"] as const)(
    "uses the month picker for %s dates",
    (sectionId) => {
      const dateField = GENERIC_SECTION_FIELDS[sectionId].find(
        (field) => field.key === "date",
      );

      expect(dateField?.kind).toBe("month");
    },
  );

  it("uses the month picker for volunteer start and end dates", () => {
    const fields = GENERIC_SECTION_FIELDS.volunteer;

    expect(fields.find((field) => field.key === "startDate")?.kind).toBe(
      "month",
    );
    expect(fields.find((field) => field.key === "endDate")?.kind).toBe("month");
  });
});
