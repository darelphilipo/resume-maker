// Tech tokens keep their meaningful punctuation (`C++`, `C#`, `Node.js`) and
// leading-dot names (`.NET`) stay distinct from the bare word `net`. A slash is
// allowed so abbreviation pairs (`CI/CD`, `UI/UX`) survive tokenization.
const TOKEN_PATTERN = /[a-z0-9][a-z0-9+#./]*|\.[a-z][a-z0-9+#./]*/g;
const TRAILING_DOTS = /\.+$/;

/**
 * Slash-joined technology names that must stay intact even though one segment
 * (`A` in `A/B`) would otherwise read as a stopword.
 */
const SLASH_TECH_TOKENS = new Set(["a/b", "ci/cd", "ui/ux", "tcp/ip"]);

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
  "bachelor",
  "bachelors",
  "be",
  "because",
  "been",
  "before",
  "being",
  "benefit",
  "benefits",
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
  "degree",
  "degrees",
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
  "equal",
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
  "he",
  "help",
  "helping",
  "her",
  "hers",
  "him",
  "his",
  "high",
  "hiring",
  "how",
  "ideal",
  "ideally",
  "improve",
  "improved",
  "improves",
  "improving",
  "including",
  "in",
  "into",
  "is",
  "it",
  "its",
  "job",
  "join",
  "joining",
  "junior",
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
  "n/a",
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
  "reduce",
  "reduced",
  "reduces",
  "reducing",
  "required",
  "requirements",
  "responsibilities",
  "responsibility",
  "role",
  "salaries",
  "salary",
  "seek",
  "seeking",
  "she",
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
  "w/o",
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

/**
 * Keeps short slash-joined technology names (`CI/CD`, `UI/UX`) as one token
 * while splitting ordinary prose pairs (`and/or`) so they cannot become fake
 * keywords. Longer slash pairs (`design/development`) split into real words.
 */
function expandSlashToken(token: string): string[] {
  if (!token.includes("/")) {
    return [token];
  }

  const segments = token.split("/").filter((segment) => segment !== "");
  const joined = segments.join("/");

  if (SLASH_TECH_TOKENS.has(joined)) {
    return [joined];
  }

  const looksLikeAbbreviationPair =
    segments.length >= 2 &&
    segments.every((segment) => /^[a-z0-9+#.]{1,3}$/.test(segment));

  if (looksLikeAbbreviationPair) {
    // `and/or` and `he/she` are prose, not technologies.
    return segments.some((segment) => STOPWORDS.has(segment)) ? [] : [joined];
  }

  return segments;
}

function rawTokens(text: string): string[] {
  const tokens: string[] = [];

  for (const match of text.toLowerCase().match(TOKEN_PATTERN) ?? []) {
    const token = match.replace(TRAILING_DOTS, "");

    if (token !== "") {
      tokens.push(...expandSlashToken(token));
    }
  }

  return tokens;
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

    // Never strip a plural `s` from a dotted technology name: `node.js` must
    // not gain `node.j` / `nodej` variants.
    if (
      !token.includes(".") &&
      base.length > 3 &&
      base.endsWith("s") &&
      !base.endsWith("ss")
    ) {
      values.add(base.slice(0, -1));
      values.add(token.slice(0, -1));
    }

    // Lightweight stemming: `building` ↔ `build`, `managed` ↔ `manage`, and
    // `processes` ↔ `process`. Only plain alphabetic words are stemmed so
    // dotted/tech tokens (`node.js`, `.net`, `c++`) keep their exact forms.
    if (/^[a-z]+$/.test(base) && base.length >= 5) {
      if (base.endsWith("ing")) {
        addStem(values, base.slice(0, -3));
      } else if (base.endsWith("ed")) {
        addStem(values, base.slice(0, -2));
      }

      if (base.endsWith("es") && base.length > 4) {
        addStem(values, base.slice(0, -2));
      }
    }
  }

  return [...values];
}

/**
 * Adds a plausible root plus its doubled-consonant (`running` → `run`) and
 * silent-e (`manag` → `manage`) spellings. Very short roots are ignored so a
 * suffix cannot turn a full word into a meaningless fragment.
 */
function addStem(values: Set<string>, stem: string): void {
  if (stem.length < 3) {
    return;
  }

  values.add(stem);

  if (/([a-z])\1$/.test(stem)) {
    values.add(stem.slice(0, -1));
  }

  values.add(`${stem}e`);
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

/**
 * Grouping key for the keyword list. Plain words collapse to one normalized
 * root — `build`, `builds`, and `building` all key to `build`, and `process`
 * and `processes` both key to `proces` — so a posting that uses two forms
 * shows the keyword once. Dotted/tech tokens (`node.js`, `.net`, `c++`) keep
 * their exact spelling. This only affects the displayed list: matching still
 * uses the full `variants()` set in `hasKeywordMatch`.
 */
function canonicalKeyword(token: string): string {
  if (!/^[a-z]+$/.test(token)) {
    return token;
  }

  let root = token;

  if (root.length > 4 && root.endsWith("ing")) {
    root = root.slice(0, -3);
  } else if (root.length > 4 && root.endsWith("ed")) {
    root = root.slice(0, -2);
  }

  if (root.length > 4 && root.endsWith("es")) {
    root = root.slice(0, -2);
  } else if (root.length > 3 && root.endsWith("s") && !root.endsWith("ss")) {
    root = root.slice(0, -1);
  }

  // Normalize a doubled consonant (`running` → `run`) and a silent trailing
  // `e` (`managed` → `manage`) on BOTH sides of the pair, so neither side can
  // land on a different key just because one form kept the double letter.
  if (root.length > 3 && /([a-z])\1$/.test(root)) {
    root = root.slice(0, -1);
  }

  if (root.length > 2 && root.endsWith("e")) {
    root = root.slice(0, -1);
  }

  return root.length >= 3 ? root : token;
}

type KeywordGroup = {
  count: number;
  tokens: Map<string, number>;
};

export function extractJobKeywords(
  jobDescription: string,
  limit = 40,
): string[] {
  const groups = new Map<string, KeywordGroup>();

  for (const token of rawTokens(jobDescription)) {
    if (baseToken(token).length < 2 || isStopword(token)) {
      continue;
    }

    const key = canonicalKeyword(token);
    const group = groups.get(key) ?? { count: 0, tokens: new Map() };
    group.count += 1;
    group.tokens.set(token, (group.tokens.get(token) ?? 0) + 1);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => {
      // Prefer the base spelling over a longer inflected one, then the more
      // frequent form, then alphabetical order for a stable display list.
      const representative = [...group.tokens.entries()].sort(
        ([left, leftCount], [right, rightCount]) =>
          left.length - right.length ||
          rightCount - leftCount ||
          compareTokens(left, right),
      )[0][0];

      return { token: representative, count: group.count };
    })
    .sort(
      (left, right) =>
        right.count - left.count || compareTokens(left.token, right.token),
    )
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.token);
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
