/**
 * The single display name shared by every surface that shows the resume title.
 *
 * The editor header and the Basics "Name preview" both call this helper, so an
 * empty name always reads the same way and a live edit stays in sync wherever
 * the name is shown.
 */
export const UNTITLED_RESUME_NAME = "Untitled resume";

export function resumeDisplayName(name: string): string {
  return name.trim() || UNTITLED_RESUME_NAME;
}
