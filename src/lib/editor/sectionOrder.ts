/**
 * Pure ordering helpers for the Content section list.
 *
 * The list hides empty optional rows ("tucked"), so a reorder cannot just swap
 * two array positions: tucked rows must keep their slot in the saved layout
 * while the remaining visible rows fill the other positions in the new order.
 */

export type SectionDropSlot = {
  id: string;
  top: number;
  bottom: number;
};

/**
 * Moves `dragId` into `targetId`'s slot. Unknown ids and a self-drop are no-ops
 * (the caller still receives a fresh array so it can compare by value).
 */
export function reorderVisibleIds(
  visibleIds: readonly string[],
  dragId: string,
  targetId: string,
): string[] {
  const from = visibleIds.indexOf(dragId);
  const target = visibleIds.indexOf(targetId);

  if (from < 0 || target < 0 || from === target) {
    return [...visibleIds];
  }

  const next = [...visibleIds];
  const [moved] = next.splice(from, 1);

  next.splice(target, 0, moved);

  return next;
}

/**
 * Rebuilds the full layout order: tucked ids stay exactly where they were, and
 * the visible ids are written into the remaining positions in the new order.
 */
export function mergeVisibleOrder(
  allIds: readonly string[],
  tuckedIds: ReadonlySet<string>,
  visibleOrder: readonly string[],
): string[] {
  let cursor = 0;

  return allIds.map((id) => {
    if (tuckedIds.has(id)) {
      return id;
    }

    const next = visibleOrder[cursor];
    cursor += 1;

    return next ?? id;
  });
}

/**
 * Picks the row that should receive the dragged row for a pointer at `y`: the
 * first row whose vertical midpoint sits below the pointer, else the last row.
 */
export function dropTargetForPointer(
  slots: readonly SectionDropSlot[],
  y: number,
): string | null {
  if (slots.length === 0) {
    return null;
  }

  for (const slot of slots) {
    if (y < (slot.top + slot.bottom) / 2) {
      return slot.id;
    }
  }

  return slots[slots.length - 1].id;
}
