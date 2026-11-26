/**
 * Recruiter-scan metric highlighting (preview only).
 *
 * The 6-Second Scan dims body prose but keeps the numbers a recruiter skims
 * for at full contrast. CSS can restore bold `<strong>` spans, but it cannot
 * style a substring, so metric runs are wrapped in a `scan-metric` span here.
 *
 * This helper is deliberately markup-preserving: it only rewrites text nodes,
 * leaves tags and HTML entities untouched, and returns the input unchanged when
 * no metric is found.
 */

const TOKEN_PATTERN = /(<[^>]*>|&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);)/g;

/**
 * A metric is a number optionally decorated like `$1.2M`, `40%`, `3x`, or
 * `1,200`, a prefixed latency token such as `p95`/`p99`, or a GPA figure such
 * as `3.8 GPA`. The leading boundary group keeps digits embedded in words (for
 * example `v2` or `H2O`) from being split into a span.
 */
const METRIC_PATTERN =
  /(^|[^\w$])(\$?\d[\d,]*(?:\.\d+)?(?:\s?(?:%|[xX](?![A-Za-z])|[kKmMbB](?![A-Za-z])))?(?:\s?[Gg][Pp][Aa](?![A-Za-z]))?|[pP]\d{2,}(?![A-Za-z0-9]))/g;

export const SCAN_METRIC_CLASS = "scan-metric";

function wrapMetrics(text: string): string {
  return text.replace(
    METRIC_PATTERN,
    (_match, boundary: string, metric: string) =>
      `${boundary}<span class="${SCAN_METRIC_CLASS}">${metric}</span>`,
  );
}

export function highlightScanMetrics(html: string): string {
  if (html.trim() === "") {
    return html;
  }

  return html
    .split(TOKEN_PATTERN)
    .map((part, index) => {
      // `String.split` with a capturing group keeps the delimiters at odd
      // indexes; those are tags or entities and must never be rewritten.
      if (index % 2 === 1) {
        return part;
      }

      return wrapMetrics(part);
    })
    .join("");
}
