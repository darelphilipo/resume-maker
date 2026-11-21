import { afterEach, describe, expect, it, vi } from "vitest";

import { copyText } from "./copyText";

function stubClipboard(writeText = vi.fn().mockResolvedValue(undefined)) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });

  return writeText;
}

function stubExecCommand(execCommand = vi.fn().mockReturnValue(true)) {
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });

  return execCommand;
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
  Reflect.deleteProperty(document, "execCommand");
  vi.restoreAllMocks();
});

describe("copyText", () => {
  it("uses the async Clipboard API when it is available", async () => {
    const writeText = stubClipboard();

    await expect(copyText("Ada Lovelace\nada@example.com")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("Ada Lovelace\nada@example.com");
  });

  it("falls back to execCommand when the Clipboard API rejects", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("Not allowed")));
    const execCommand = stubExecCommand();

    await expect(copyText("Ada")).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("reports failure when both copy paths fail", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("Not allowed")));
    stubExecCommand(vi.fn().mockReturnValue(false));

    await expect(copyText("Ada")).resolves.toBe(false);
  });

  it("does not copy blank text", async () => {
    const writeText = stubClipboard();

    await expect(copyText("   ")).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });
});
