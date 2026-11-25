import { createEmptyResume } from "@/lib/schema/defaults";
import {
  ResumeDocumentSchema,
  type ResumeDocument,
} from "@/lib/schema/resume.schema";

/**
 * Wipe the content a starter preset supplied while keeping the resume's shape:
 * template, layout, design, section titles, and visibility all stay put. The
 * caller commits the returned document as one store patch, so a single undo
 * brings the sample back. Documents that are not marked as sample data are
 * returned unchanged — never clear a resume the user imported or wrote.
 */
export function clearSampleData(doc: ResumeDocument): ResumeDocument {
  if (doc.metadata.sampleData !== true) {
    return doc;
  }

  const empty = createEmptyResume(doc.metadata.template);
  // Written out per section so each union member keeps its own item type
  // (and Experience keeps `groupSameCompany`) instead of degrading to the
  // shared section shape.
  const sections = {
    profiles: { ...doc.sections.profiles, items: [] },
    experience: { ...doc.sections.experience, items: [] },
    education: { ...doc.sections.education, items: [] },
    projects: { ...doc.sections.projects, items: [] },
    skills: { ...doc.sections.skills, items: [] },
    certifications: { ...doc.sections.certifications, items: [] },
    awards: { ...doc.sections.awards, items: [] },
    languages: { ...doc.sections.languages, items: [] },
    interests: { ...doc.sections.interests, items: [] },
    volunteer: { ...doc.sections.volunteer, items: [] },
    publications: { ...doc.sections.publications, items: [] },
    references: { ...doc.sections.references, items: [] },
  };

  return ResumeDocumentSchema.parse({
    ...doc,
    basics: empty.basics,
    summary: { ...doc.summary, content: "" },
    sections,
    customSections: doc.customSections.map((section) => ({
      ...section,
      items: [],
    })),
    metadata: { ...doc.metadata, sampleData: false },
  });
}
