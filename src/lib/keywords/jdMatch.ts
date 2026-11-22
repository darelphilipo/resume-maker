// Tech tokens keep their meaningful punctuation (`C++`, `C#`, `Node.js`) and
// leading-dot names (`.NET`) stay distinct from the bare word `net`.
const TOKEN_PATTERN = /[a-z0-9][a-z0-9+#.]*|\.[a-z][a-z0-9+#.]*/g;
const TRAILING_DOTS = /\.+$/;

const STOPWORDS = new Set([
  "a",
  "about",
  "ability",
  "able",
  "across",
  "after",
  "all",
  "also",
  "an",
  "and",
  "any",
  "applicant",
  "applicants",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "between",
  "both",
  "but",
  "by",
  "can",
  "candidate",
  "candidates",
  "company",
  "could",
  "create",
  "creating",
  "deliver",
  "delivering",
  "do",
  "does",
  "drive",
  "driving",
  "each",
  "either",
  "ensure",
  "ensuring",
  "etc",
  "excellent",
  "experience",
  "for",
  "from",
  "good",
  "great",
  "has",
  "have",
  "having",
  "help",
  "helping",
  "hiring",
  "how",
  "ideal",
  "ideally",
  "including",
  "in",
  "into",
  "is",
  "it",
  "its",
  "job",
  "join",
  "joining",
  "lead",
  "leading",
  "looking",
  "manage",
  "managing",
  "may",
  "month",
  "months",
  "more",
  "most",
  "must",
  "need",
  "needed",
  "needs",
  "new",
  "no",
  "not",
  "of",
  "on",
  "opportunity",
  "or",
  "other",
  "our",
  "out",
  "over",
  "own",
  "owning",
  "partner",
  "partnering",
  "per",
  "plus",
  "position",
  "prefer",
  "preferably",
  "preferred",
  "qualifications",
  "required",
  "requirements",
  "responsibilities",
  "responsibility",
  "role",
  "seek",
  "seeking",
  "should",
  "skills",
  "strong",
  "such",
  "support",
  "supporting",
  "team",
  "teams",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "under",
  "up",
  "upon",
  "us",
  "use",
  "used",
  "using",
  "via",
  "want",
  "wanting",
  "wants",
  "was",
  "we",
  "week",
  "weeks",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "why",
  "will",
  "with",
  "within",
  "without",
  "work",
  "working",
  "would",
  "year",
  "years",
  "yes",
  "yet",
  "you",
  "your",
]);

export type KeywordMatchResult = {
  matched: string[];
  missing: string[];
  coverage: number;
};

function compareTokens(left: string, right: string): number {
  return left.localeCompare(right);
}

function rawTokens(text: string): string[] {
  return (text.toLowerCase().match(TOKEN_PATTERN) ?? []).map((token) =>
    token.replace(TRAILING_DOTS, ""),
  );
}

function baseToken(token: string): string {
  return token.replace(/^\./, "").replace(/\./g, "");
}

function isStopword(token: string): boolean {
  return STOPWORDS.has(token) || STOPWORDS.has(baseToken(token));
}

function variants(token: string): string[] {
  const base = baseToken(token);
  const values = new Set<string>([token]);

  // A leading-dot token is a specific technology (`.NET`), so never widen it
  // to the bare word (`net`) or it would match unrelated prose.
  if (!token.startsWith(".")) {
    values.add(base);

    if (base.length > 3 && base.endsWith("s") && !base.endsWith("ss")) {
      values.add(base.slice(0, -1));
      values.add(token.slice(0, -1));
    }
  }

  return [...values];
}

/**
 * Keywords are compared against complete resume tokens, never with
 * `String.includes`, so `rust` cannot match `trust` and `react` cannot match
 * `reactive`. A dotted technology name (`.NET`) also matches the dotted suffix
 * used in product names (`ASP.NET`) without matching a bare `net` word.
 */
function hasKeywordMatch(
  keyword: string,
  resumeTokens: ReadonlySet<string>,
): boolean {
  const keywordVariants = variants(keyword);

  for (const token of resumeTokens) {
    if (keywordVariants.includes(token)) {
      return true;
    }

    if (keyword.startsWith(".") && token.endsWith(keyword)) {
      return true;
    }
  }

  return false;
}

export function extractJobKeywords(
  jobDescription: string,
  limit = 40,
): string[] {
  const counts = new Map<string, number>();

  for (const token of rawTokens(jobDescription)) {
    if (baseToken(token).length < 2 || isStopword(token)) {
      continue;
    }

    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(
      ([leftToken, leftCount], [rightToken, rightCount]) =>
        rightCount - leftCount || compareTokens(leftToken, rightToken),
    )
    .slice(0, Math.max(0, limit))
    .map(([token]) => token);
}

export function matchJobKeywords(
  jobDescription: string,
  resumeText: string,
  limit = 40,
): KeywordMatchResult {
  const keywords = extractJobKeywords(jobDescription, limit);
  const resumeTokens = new Set<string>();

  for (const token of rawTokens(resumeText)) {
    for (const variant of variants(token)) {
      resumeTokens.add(variant);
    }
  }

  const matched: string[] = [];
  const missing: string[] = [];

  for (const keyword of keywords) {
    const found = hasKeywordMatch(keyword, resumeTokens);

    (found ? matched : missing).push(keyword);
  }

  const coverage =
    keywords.length === 0 ? 0 : matched.length / keywords.length;

  return { matched, missing, coverage };
}
