/**
 * OpenResume-style weighted feature scoring for the paste/PDF importer.
 *
 * PDF import knows more than plain text: which runs are bold and how large the
 * font is. This module turns those signals (plus cheap text predicates) into
 * numeric scores, so a parser can pick the most likely field for a line instead
 * of relying on reading order alone.
 *
 * Everything here is pure and framework-free, so the rules stay cheap to unit
 * test and can be reused by both the text and the structured PDF paths.
 */

export type FeatureContext = {
  /** Largest font size across the values being scored (0 when unknown). */
  maxFontSize: number;
};

/** A `[predicate, weight]` tuple, mirroring OpenResume's scoring tables. */
export type WeightedPredicate<T> = readonly [
  predicate: (value: T, context: FeatureContext) => boolean,
  weight: number,
];

export type FeatureSet<T> = {
  /** Field this set scores, e.g. `"company"` or `"school"`. */
  field: string;
  predicates: readonly WeightedPredicate<T>[];
};

/** The slice of a parsed line the scoring rules need. */
export type ScorableText = {
  text: string;
  isBold?: boolean;
  maxFontSize?: number;
};

export type CandidateFieldScore = {
  field: string;
  score: number;
};

export type BestCandidate<T> = {
  field: string;
  value: T;
  score: number;
  /** Index of the winning value in the array that was scored. */
  index: number;
};

const EMPTY_CONTEXT: FeatureContext = { maxFontSize: 0 };

const MONTH_TOKEN =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?";

/** Any date token a resume header might carry. */
const DATE_TEXT = new RegExp(
  `(?:${MONTH_TOKEN}\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4}-\\d{1,2}|\\b(?:19|20)\\d{2}\\b)`,
  "i",
);

const URL_TEXT =
  /https?:\/\/|www\.|\b(?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|co|me|ai|app|edu|gov|info|xyz|so|sh|link|ly)\b/i;

const GRADE_TEXT =
  /(?:\b(?:cgpa|gpa)\b|\b[0-4]\.[0-9]{1,2}\b|\b[0-9]\.[0-9]{1,2}\s*\/\s*10\b|\b\d{1,3}(?:\.\d{1,2})?\s*%)/i;

const DEGREE_WORDS =
  /\b(?:bachelor|master|associate|doctor|ph\.?\s?d|mba|b\.?\s?sc|m\.?\s?sc|b\.?\s?s|m\.?\s?s|b\.?\s?a|m\.?\s?a|b\.?\s?eng|m\.?\s?eng|b\.?\s?f\.?\s?a|m\.?\s?f\.?\s?a|diploma)\b/i;

const SCHOOL_WORDS =
  /\b(?:university|college|institute|school|academy|polytechnic|conservatory|faculty)\b/i;

const COMPANY_WORDS =
  /\b(?:inc|llc|ltd|corp|corporation|company|co|gmbh|plc|group|labs|studio|studios|systems|technologies|solutions|partners|bank|agency|media|consulting)\b/i;

const TITLE_WORDS =
  /\b(?:engineer|engineering|developer|manager|management|designer|analyst|director|intern|internship|consultant|specialist|lead|coordinator|associate|assistant|officer|architect|scientist|researcher|head|vp|vice president|president|founder|owner|accountant|recruiter|administrator|teacher|professor|strategist|planner|producer|editor|writer|technician|supervisor|executive|auditor|controller|paralegal|attorney|counsel|nurse|physician|therapist|pharmacist|chef)\b/i;

/** Names are letters, spaces, and periods (plus the usual name particles). */
const LETTERS_ONLY = /^[\p{L}\p{M}][\p{L}\p{M}.'\u2019\s-]*$/u;
const PUNCTUATION = /[!?:;,/\\|@#$%&*()[\]{}<>+=_~^"]/;
const DIGITS = /\d/;
const CONTACT = /@|https?:\/\/|www\./i;

/**
 * Header name rules. A real name is letters-only, is often the largest text in
 * the header, and is often bold; an email, phone, or punctuation-heavy line is
 * heavily penalised.
 */
export const NAME_FEATURES: readonly WeightedPredicate<ScorableText>[] = [
  [(value) => LETTERS_ONLY.test(value.text.trim()), 3],
  [
    (value, context) =>
      context.maxFontSize > 0 &&
      (value.maxFontSize ?? 0) >= context.maxFontSize,
    3,
  ],
  [(value) => value.isBold === true, 2],
  [
    (value) =>
      CONTACT.test(value.text) ||
      DIGITS.test(value.text) ||
      PUNCTUATION.test(value.text),
    -4,
  ],
];

/** Experience header rules: date, job title, or company. */
export const EXPERIENCE_HEADER_FEATURES: readonly FeatureSet<ScorableText>[] = [
  {
    field: "date",
    predicates: [[(value) => DATE_TEXT.test(value.text), 4]],
  },
  {
    field: "jobTitle",
    predicates: [
      [(value) => TITLE_WORDS.test(value.text), 3],
      [(value) => /\s+as\s+/i.test(value.text), 2],
    ],
  },
  {
    field: "company",
    predicates: [
      [(value) => COMPANY_WORDS.test(value.text), 3],
      [(value) => value.isBold === true, 2],
      [
        (value) =>
          TITLE_WORDS.test(value.text) || DATE_TEXT.test(value.text),
        -4,
      ],
    ],
  },
];

/** Education header rules: date, grade, degree, or school. */
export const EDUCATION_HEADER_FEATURES: readonly FeatureSet<ScorableText>[] = [
  {
    field: "date",
    predicates: [[(value) => DATE_TEXT.test(value.text), 4]],
  },
  {
    field: "grade",
    predicates: [[(value) => GRADE_TEXT.test(value.text), 4]],
  },
  {
    field: "degree",
    predicates: [[(value) => DEGREE_WORDS.test(value.text), 3]],
  },
  {
    field: "school",
    predicates: [
      [(value) => SCHOOL_WORDS.test(value.text), 3],
      [(value) => value.isBold === true, 2],
      [
        (value) =>
          DEGREE_WORDS.test(value.text) ||
          GRADE_TEXT.test(value.text) ||
          DATE_TEXT.test(value.text),
        -4,
      ],
    ],
  },
];

/** Project header rules: date, URL, or project name. */
export const PROJECT_HEADER_FEATURES: readonly FeatureSet<ScorableText>[] = [
  {
    field: "date",
    predicates: [[(value) => DATE_TEXT.test(value.text), 4]],
  },
  {
    field: "url",
    predicates: [[(value) => URL_TEXT.test(value.text), 4]],
  },
  {
    field: "name",
    predicates: [
      [(value) => value.isBold === true, 2],
      [
        (value) => DATE_TEXT.test(value.text) || URL_TEXT.test(value.text),
        -4,
      ],
    ],
  },
];

/** Sum the weights of every predicate that matches one value. */
export function scoreFeatures<T>(
  value: T,
  predicates: readonly WeightedPredicate<T>[],
  context: FeatureContext = EMPTY_CONTEXT,
): number {
  return predicates.reduce(
    (total, [matches, weight]) =>
      matches(value, context) ? total + weight : total,
    0,
  );
}

function contextFor<T>(
  values: readonly T[],
  read: (value: T) => ScorableText | undefined,
): FeatureContext {
  let maxFontSize = 0;

  for (const value of values) {
    const candidate = read(value);

    if (candidate && (candidate.maxFontSize ?? 0) > maxFontSize) {
      maxFontSize = candidate.maxFontSize ?? 0;
    }
  }

  return { maxFontSize };
}

/**
 * Best field for a single value. Mutual exclusion happens here: a line can only
 * claim one field, so a bold company name never also scores as a job title.
 */
export function scoreCandidateFields<T>(
  value: T,
  featureSets: readonly FeatureSet<T>[],
  context: FeatureContext = EMPTY_CONTEXT,
): CandidateFieldScore | null {
  let best: CandidateFieldScore | null = null;

  for (const set of featureSets) {
    const score = scoreFeatures(value, set.predicates, context);

    if (score > 0 && (best === null || score > best.score)) {
      best = { field: set.field, score };
    }
  }

  return best;
}

/**
 * Highest-scoring `(value, field)` pair across all values. Ties keep the
 * earliest value, which reproduces the old "first match wins" behaviour when
 * the document carries no font metadata.
 */
export function scoreBestCandidate<T>(
  values: readonly T[],
  featureSets: readonly FeatureSet<T>[],
  options: {
    minScore?: number;
    /** Optional accessor when the scored type is not itself a `ScorableText`. */
    read?: (value: T) => ScorableText | undefined;
  } = {},
): BestCandidate<T> | null {
  const minScore = options.minScore ?? 1;
  const read =
    options.read ??
    ((value: T) => value as unknown as ScorableText | undefined);
  const context = contextFor(values, read);
  let best: BestCandidate<T> | null = null;

  values.forEach((value, index) => {
    const fieldScore = scoreCandidateFields(value, featureSets, context);

    if (!fieldScore || fieldScore.score < minScore) {
      return;
    }

    if (best === null || fieldScore.score > best.score) {
      best = {
        field: fieldScore.field,
        value,
        score: fieldScore.score,
        index,
      };
    }
  });

  return best;
}

const DESCRIPTION_BULLET = /^(?:[\u2022\u25CF\u25AA\u25E6\u2023\u25CB\u25A0\u27A2]|[-*])\s+/;

export type DescriptionLine = {
  text: string;
  isBold?: boolean;
};

/**
 * OpenResume's `getDescriptionsLineIdx`: the first bullet, or — when the caller
 * allows it — the first non-bold line with at least eight words. Everything from
 * that index on is description copy, so it must never leak into a title,
 * company, or school field.
 */
export function getDescriptionsLineIdx(
  lines: readonly DescriptionLine[],
  options: { allowUnbulletedProse?: boolean } = {},
): number {
  const allowProse = options.allowUnbulletedProse === true;

  for (let index = 0; index < lines.length; index += 1) {
    const text = lines[index].text.trim();

    if (text === "") {
      continue;
    }

    if (DESCRIPTION_BULLET.test(text)) {
      return index;
    }

    if (allowProse && lines[index].isBold !== true) {
      if (text.split(/\s+/).length >= 8) {
        return index;
      }
    }
  }

  return -1;
}
