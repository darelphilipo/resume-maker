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
 * A metric is a number optionally decorated like `$1.2M`, `₹10L`, `€500K`,
 * `40%`, `3x`, `1,200+`, or `3.8 GPA`, a prefixed latency token such as
 * `p95`/`p99`, or a GPA figure such as `3.8 GPA`. The leading boundary group
 * keeps digits embedded in words (for example `v2` or `H2O`) from being split
 * into a span, and it excludes currency symbols so `₹10L` is matched as one
 * run instead of a boundary plus a bare number.
 *
 * Suffixes cover percentages, multipliers, Western magnitudes (`K`/`M`/`B`),
 * Indian lakh/crore shorthand (`L`/`Cr`), and a trailing `+` meaning "or more".
 * Every letter suffix carries a `(?![A-Za-z])` guard so `10 months` or
 * `5 levels` cannot be read as a magnitude.
 */
const METRIC_PATTERN =
  /(^|[^\w$₹€£])([$₹€£]?\d[\d,]*(?:\.\d+)?(?:\s?(?:%|[xX](?![A-Za-z])|[kKmMbBlL](?![A-Za-z])|[cC][rR](?![A-Za-z])))?\+?(?:\s?[Gg][Pp][Aa](?![A-Za-z]))?|[pP]\d{2,}(?![A-Za-z0-9]))/g;

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
