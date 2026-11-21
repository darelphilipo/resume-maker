export const PAGE_STACK_GAP_PX = 24;

export type CanvasFrame = {
  width: number;
  height: number;
  scale: number;
};

/**
 * Left offset that centres a scaled page stack inside its viewport.
 *
 * `fitScale` is capped at 1, so on a wide tablet (or a phone showing the
 * desktop site) the paper can be narrower than the preview scroller. The
 * transform wrapper is still full width, so the canvas must be nudged right by
 * half of the leftover space or it hugs the left edge and leaves a gray strip
 * on the right.
 */
export function centeredCanvasOffsetX(
  viewportWidth: number,
  canvasWidth: number,
): number {
  if (
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(canvasWidth) ||
    viewportWidth <= 0 ||
    canvasWidth <= 0
  ) {
    return 0;
  }

  return Math.max(0, (viewportWidth - canvasWidth) / 2);
}

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
