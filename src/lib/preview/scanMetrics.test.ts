import { describe, expect, it } from "vitest";

import { highlightScanMetrics } from "./scanMetrics";

const metric = (text: string) => `<span class="scan-metric">${text}</span>`;

describe("highlightScanMetrics", () => {
  it("wraps currency, percentages, multipliers, and plain counts", () => {
    const html =
      "<p>Cut $1.2M in spend and 40% of latency across 3x teams in 2024.</p>";

    expect(highlightScanMetrics(html)).toBe(
      `<p>Cut ${metric("$1.2M")} in spend and ${metric("40%")} of latency across ${metric("3x")} teams in ${metric("2024")}.</p>`,
    );
  });

  it("leaves tags, attributes, and HTML entities untouched", () => {
    const html =
      '<p>Use&nbsp;&#39;s <a href="https://example.com/v2?year=2024" data-x="3x">2024 results</a></p>';

    expect(highlightScanMetrics(html)).toBe(
      `<p>Use&nbsp;&#39;s <a href="https://example.com/v2?year=2024" data-x="3x">${metric("2024")} results</a></p>`,
    );
  });

  it("does not split digits that are embedded in a word", () => {
    const html = "<p>v2 and H2O improved 5x.</p>";

    expect(highlightScanMetrics(html)).toBe(
      `<p>v2 and H2O improved ${metric("5x")}.</p>`,
    );
  });

  it("keeps bold markup intact around a wrapped metric", () => {
    const html = "<p><strong>Saved 30%</strong> this year.</p>";

    expect(highlightScanMetrics(html)).toBe(
      `<p><strong>Saved ${metric("30%")}</strong> this year.</p>`,
    );
  });

  it("returns blank and metric-free markup unchanged", () => {
    expect(highlightScanMetrics("   ")).toBe("   ");
    expect(highlightScanMetrics("<p>Led the platform team.</p>")).toBe(
      "<p>Led the platform team.</p>",
    );
  });
});
