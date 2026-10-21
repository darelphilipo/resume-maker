export function parseKeywords(value: string): string[] {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword !== "");
}

export function formatKeywords(keywords: string[]): string {
  return keywords.join(", ");
}
