import { describe, expect, it } from "vitest";

import { HorizontalTouchPan } from "./HorizontalTouchPan";
import { TouchPanCanvas } from "./TouchPanCanvas";

describe("HorizontalTouchPan (deprecated alias)", () => {
  it("points at the free-pan canvas", () => {
    expect(HorizontalTouchPan).toBe(TouchPanCanvas);
  });
});
