export const MM_TO_PX = 96 / 25.4;
export const PT_TO_PX = 4 / 3;

export const PAPER = {
  a4: { widthMm: 210, heightMm: 297 },
  letter: { widthMm: 215.9, heightMm: 279.4 },
} as const;

export type PaperFormat = keyof typeof PAPER;

export function pageGeometry(
  format: PaperFormat,
  marginXpt: number,
  marginYpt: number,
): {
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  contentWidthPx: number;
  contentHeightPx: number;
} {
  if (marginXpt < 0 || marginYpt < 0) {
    throw new RangeError("Page margins must be non-negative.");
  }

  const { widthMm, heightMm } = PAPER[format];
  const widthPx = widthMm * MM_TO_PX;
  const heightPx = heightMm * MM_TO_PX;
  const contentWidthPx = widthPx - 2 * marginXpt * PT_TO_PX;
  const contentHeightPx = heightPx - 2 * marginYpt * PT_TO_PX;

  if (contentWidthPx <= 0 || contentHeightPx <= 0) {
    throw new RangeError("Page margins must leave a positive content box.");
  }

  return { widthMm, heightMm, widthPx, heightPx, contentWidthPx, contentHeightPx };
}
