export const PAGE_STACK_GAP_PX = 24;

export type CanvasFrame = {
  width: number;
  height: number;
  scale: number;
};

export function computeCanvasFrame(input: {
  pageCount: number;
  pageWidthPx: number;
  pageHeightPx: number;
  fitScale: number;
}): CanvasFrame {
  const pageCount = Number.isFinite(input.pageCount)
    ? Math.max(1, Math.floor(input.pageCount))
    : 1;
  const pageWidthPx =
    Number.isFinite(input.pageWidthPx) && input.pageWidthPx > 0
      ? input.pageWidthPx
      : 0;
  const pageHeightPx =
    Number.isFinite(input.pageHeightPx) && input.pageHeightPx > 0
      ? input.pageHeightPx
      : 0;
  const scale =
    Number.isFinite(input.fitScale) && input.fitScale > 0
      ? input.fitScale
      : 1;
  const stackHeightPx =
    pageCount * pageHeightPx + (pageCount - 1) * PAGE_STACK_GAP_PX;

  return {
    width: pageWidthPx * scale,
    height: stackHeightPx * scale,
    scale,
  };
}
