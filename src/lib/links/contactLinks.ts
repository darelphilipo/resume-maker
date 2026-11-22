/**
 * Pure helpers behind the simplified contact inputs: a pasted profile URL can
 * fill in the network, icon, and username, and a website URL can produce its
 * own display label. No network calls — the host table is the whole heuristic.
 */

export type DetectedProfileLink = {
  network: string;
  icon: string;
  username: string;
};

type NetworkDefinition = {
  network: string;
  icon: string;
  /** Path segments that are route prefixes, not the username. */
  skip?: readonly string[];
};

const NETWORKS = new Map<string, NetworkDefinition>([
  ["github.com", { network: "GitHub", icon: "github" }],
  ["gitlab.com", { network: "GitLab", icon: "gitlab" }],
  ["bitbucket.org", { network: "Bitbucket", icon: "bitbucket" }],
  [
    "linkedin.com",
    {
      network: "LinkedIn",
      icon: "linkedin",
      skip: ["in", "pub", "company", "school", "showcase"],
    },
  ],
  ["twitter.com", { network: "Twitter", icon: "twitter" }],
  ["x.com", { network: "X", icon: "x" }],
  [
    "stackoverflow.com",
    { network: "Stack Overflow", icon: "stack-overflow", skip: ["users"] },
  ],
  ["dev.to", { network: "DEV Community", icon: "dev" }],
  ["medium.com", { network: "Medium", icon: "medium" }],
  ["dribbble.com", { network: "Dribbble", icon: "dribbble" }],
  ["behance.net", { network: "Behance", icon: "behance" }],
  ["instagram.com", { network: "Instagram", icon: "instagram" }],
  ["facebook.com", { network: "Facebook", icon: "facebook" }],
  ["youtube.com", { network: "YouTube", icon: "youtube" }],
  ["mastodon.social", { network: "Mastodon", icon: "mastodon" }],
  ["fosstodon.org", { network: "Mastodon", icon: "mastodon" }],
  ["hachyderm.io", { network: "Mastodon", icon: "mastodon" }],
  ["npmjs.com", { network: "npm", icon: "npm" }],
  ["kaggle.com", { network: "Kaggle", icon: "kaggle" }],
  ["huggingface.co", { network: "Hugging Face", icon: "hugging-face" }],
  ["codepen.io", { network: "CodePen", icon: "codepen" }],
  ["substack.com", { network: "Substack", icon: "substack" }],
  ["notion.so", { network: "Notion", icon: "notion" }],
  ["keybase.io", { network: "Keybase", icon: "keybase" }],
  ["researchgate.net", { network: "ResearchGate", icon: "researchgate" }],
  ["orcid.org", { network: "ORCID", icon: "orcid" }],
]);

const PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const WWW_PATTERN = /^www\./;
const LEADING_USERNAME_MARKS = /^[@~]+/;
const TRAILING_SLASHES = /\/+$/;

function parseLink(input: string): URL | null {
  const trimmed = input.trim();

  if (trimmed === "") {
    return null;
  }

  const withProtocol = PROTOCOL_PATTERN.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

function hostnameOf(url: URL): string {
  return url.hostname.toLowerCase().replace(WWW_PATTERN, "");
}

function findNetwork(hostname: string): NetworkDefinition | null {
  const direct = NETWORKS.get(hostname);

  if (direct) {
    return direct;
  }

  for (const [host, definition] of NETWORKS) {
    if (hostname.endsWith(`.${host}`)) {
      return definition;
    }
  }

  return null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function usernameFromPath(
  url: URL,
  skip: readonly string[] = [],
): string {
  const segments = url.pathname
    .split("/")
    .filter((segment) => segment !== "")
    .map(safeDecode)
    .filter((segment) => !skip.includes(segment.toLowerCase()));

  return (segments[0] ?? "").replace(LEADING_USERNAME_MARKS, "");
}

/**
 * Recognises common public profile hosts. Returns `null` for personal websites
 * and unknown hosts so we never invent a network name.
 */
export function detectProfileLink(input: string): DetectedProfileLink | null {
  const url = parseLink(input);

  if (!url) {
    return null;
  }

  const definition = findNetwork(hostnameOf(url));

  if (!definition) {
    return null;
  }

  return {
    network: definition.network,
    icon: definition.icon,
    username: usernameFromPath(url, definition.skip),
  };
}

/**
 * The profile logos the resume header can draw. Only resume-relevant networks
 * get their own mark; every other profile (and a personal portfolio) falls back
 * to a globe so we never invent a brand icon.
 */
export type HeaderProfileIcon =
  | "github"
  | "gitlab"
  | "linkedin"
  | "stack-overflow"
  | "twitter"
  | "x"
  | "dribbble"
  | "behance"
  | "medium"
  | "dev"
  | "globe";

const HEADER_PROFILE_ICONS = new Set<HeaderProfileIcon>([
  "github",
  "gitlab",
  "linkedin",
  "stack-overflow",
  "twitter",
  "x",
  "dribbble",
  "behance",
  "medium",
  "dev",
  "globe",
]);

export type HeaderProfileLink = {
  id: string;
  label: string;
  href: string;
  icon: HeaderProfileIcon;
};

type HeaderProfileSource = {
  id?: unknown;
  url?: unknown;
  icon?: unknown;
};

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isHeaderProfileIcon(value: string): value is HeaderProfileIcon {
  return HEADER_PROFILE_ICONS.has(value as HeaderProfileIcon);
}

/**
 * Pick the header icon for a saved profile. A known stored icon wins (imported
 * rows keep it), then the host heuristic, then the globe fallback.
 */
export function headerProfileIcon(
  icon: unknown,
  url: unknown,
): HeaderProfileIcon {
  const saved = stringField(icon).trim().toLowerCase();

  if (isHeaderProfileIcon(saved)) {
    return saved;
  }

  const detected = detectProfileLink(stringField(url));
  const derived = detected?.icon ?? "";

  return isHeaderProfileIcon(derived) ? derived : "globe";
}

/**
 * Turn a saved Profiles row into one inline header link. Rows without a usable
 * http(s) URL stay out of the header (they still render in the Profiles
 * section), and the visible label is the cleaned URL so `https://` / `www.`
 * never clutter the contact line.
 */
export function profileHeaderLink(
  item: HeaderProfileSource,
  index = 0,
): HeaderProfileLink | null {
  const url = stringField(item.url);
  const href = externalLinkHref(url);

  if (href === "") {
    return null;
  }

  return {
    id: stringField(item.id) || `profile-${index}`,
    label: websiteLabelFromUrl(url) || url.trim(),
    href,
    icon: headerProfileIcon(item.icon, url),
  };
}

/**
 * Every usable header link for a list of visible Profiles rows. The header, the
 * section renderer, and ATS text all read this one list so a promoted profile
 * cannot appear in the body while missing from the contact line (or vice versa).
 */
export function headerProfileLinks(
  items: readonly HeaderProfileSource[],
): HeaderProfileLink[] {
  return items.flatMap((item, index) => {
    const link = profileHeaderLink(item, index);

    return link ? [link] : [];
  });
}

/**
 * True when every visible profile is represented by a header link, so the
 * separate Profiles section would only repeat the contact line. A row without
 * a usable URL keeps the section (and its remaining rows) visible.
 */
export function profilesPromotedToHeader(
  items: readonly HeaderProfileSource[],
): boolean {
  if (items.length === 0) {
    return false;
  }

  return headerProfileLinks(items).length === items.length;
}

/**
 * Absolute href for a user-entered resume link. Bare hosts get `https://`, and
 * anything with a non-http scheme (for example `javascript:`) is rejected so a
 * pasted value can never become an executable link in the preview.
 */
export function externalLinkHref(input: string): string {
  const trimmed = input.trim();

  if (trimmed === "") {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (SCHEME_PATTERN.test(trimmed)) {
    return "";
  }

  return `https://${trimmed}`;
}

/**
 * Compact display label for a website: protocol, `www.`, query, hash, and
 * trailing slashes removed. Empty input yields an empty label, which the
 * renderer already treats as "no website".
 */
export function websiteLabelFromUrl(input: string): string {
  const trimmed = input.trim();

  if (trimmed === "") {
    return "";
  }

  const url = parseLink(trimmed);

  if (!url) {
    return trimmed.replace(TRAILING_SLASHES, "");
  }

  const host = hostnameOf(url);
  const path = safeDecode(url.pathname).replace(TRAILING_SLASHES, "");

  return `${host}${path}`;
}
