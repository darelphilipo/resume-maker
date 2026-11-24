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
  /** Path prefix before a username in a canonical profile URL. */
  profilePath?: string;
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
      profilePath: "in/",
    },
  ],
  ["twitter.com", { network: "Twitter", icon: "twitter" }],
  ["x.com", { network: "X", icon: "x" }],
  [
    "stackoverflow.com",
    {
      network: "Stack Overflow",
      icon: "stack-overflow",
      skip: ["users"],
      profilePath: "users/",
    },
  ],
  ["dev.to", { network: "DEV Community", icon: "dev" }],
  [
    "medium.com",
    { network: "Medium", icon: "medium", profilePath: "@" },
  ],
  ["dribbble.com", { network: "Dribbble", icon: "dribbble" }],
  ["behance.net", { network: "Behance", icon: "behance" }],
  ["instagram.com", { network: "Instagram", icon: "instagram" }],
  ["facebook.com", { network: "Facebook", icon: "facebook" }],
  ["youtube.com", { network: "YouTube", icon: "youtube", profilePath: "@" }],
  ["mastodon.social", { network: "Mastodon", icon: "mastodon" }],
  ["fosstodon.org", { network: "Mastodon", icon: "mastodon" }],
  ["hachyderm.io", { network: "Mastodon", icon: "mastodon" }],
  ["npmjs.com", { network: "npm", icon: "npm", profilePath: "~" }],
  ["kaggle.com", { network: "Kaggle", icon: "kaggle" }],
  ["huggingface.co", { network: "Hugging Face", icon: "hugging-face" }],
  ["codepen.io", { network: "CodePen", icon: "codepen" }],
  ["substack.com", { network: "Substack", icon: "substack" }],
  ["notion.so", { network: "Notion", icon: "notion" }],
  ["keybase.io", { network: "Keybase", icon: "keybase" }],
  ["researchgate.net", { network: "ResearchGate", icon: "researchgate" }],
  ["orcid.org", { network: "ORCID", icon: "orcid" }],
]);

/**
 * Display name → canonical host, derived from the one host table above so a
 * network never has two sources of truth. The first host wins for a name shared
 * by several instances (Mastodon); those are still promoted with the derived
 * link rather than being dropped.
 */
const NETWORK_BY_NAME = new Map<string, { host: string; pathPrefix: string }>();

for (const [host, definition] of NETWORKS) {
  const name = definition.network.toLowerCase();

  if (!NETWORK_BY_NAME.has(name)) {
    NETWORK_BY_NAME.set(name, {
      host,
      pathPrefix: definition.profilePath ?? "",
    });
  }
}

/** Friendly spellings users type into the free-text Network field. */
const NETWORK_NAME_ALIASES: Record<string, string> = {
  dev: "dev community",
  "dev.to": "dev community",
  stackoverflow: "stack overflow",
  huggingface: "hugging face",
};

const PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const WWW_PATTERN = /^www\./;
const LEADING_USERNAME_MARKS = /^[@~]+/;
const LEADING_SLASHES = /^\/+/;
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
  /** Empty for an inline `Network: username` row with no derivable URL. */
  href: string;
  icon: HeaderProfileIcon;
};

type HeaderProfileSource = {
  id?: unknown;
  url?: unknown;
  icon?: unknown;
  network?: unknown;
  username?: unknown;
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

/** Strip the marks people paste before a handle (`@ada`, `~ada`, `/ada/`). */
function cleanProfileUsername(value: string): string {
  return value
    .trim()
    .replace(LEADING_USERNAME_MARKS, "")
    .replace(LEADING_SLASHES, "")
    .replace(TRAILING_SLASHES, "");
}

function networkNameFromIcon(value: string): string {
  const icon = value.trim().toLowerCase();

  for (const [, definition] of NETWORKS) {
    if (definition.icon === icon) {
      return definition.network.toLowerCase();
    }
  }

  return "";
}

/**
 * Canonical URL for a `Network` + `Username` pair with no stored URL. Known
 * networks get their real profile path (`LinkedIn` → `/in/`, `Medium` → `/@`);
 * unknown networks return `""` so the row falls back to inline text instead of
 * inventing a host. A stored icon is only a hint when the Network field is blank.
 */
export function canonicalProfileUrl(
  network: unknown,
  username: unknown,
  icon: unknown = "",
): string {
  const handle = cleanProfileUsername(stringField(username));
  const name =
    stringField(network).trim().toLowerCase() ||
    networkNameFromIcon(stringField(icon));

  if (name === "" || handle === "") {
    return "";
  }

  const canonical = NETWORK_BY_NAME.get(NETWORK_NAME_ALIASES[name] ?? name);

  if (!canonical) {
    return "";
  }

  return `https://${canonical.host}/${canonical.pathPrefix}${handle}`;
}

/**
 * Turn a saved Profiles row into one inline header link. A stored http(s) URL
 * wins; otherwise a known `Network` + `Username` pair gets a canonical URL, and
 * an unknown pair still renders as `Network: username` so Basics' "shown in the
 * header" copy stays true. Only a row with nothing usable stays in the body.
 */
export function profileHeaderLink(
  item: HeaderProfileSource,
  index = 0,
): HeaderProfileLink | null {
  const url = stringField(item.url);
  const href = externalLinkHref(url);
  const id = stringField(item.id) || `profile-${index}`;
  const network = stringField(item.network).trim();
  const username = cleanProfileUsername(stringField(item.username));

  if (href !== "") {
    return {
      id,
      label: websiteLabelFromUrl(url) || url.trim(),
      href,
      icon: headerProfileIcon(item.icon, url),
    };
  }

  const canonical = canonicalProfileUrl(
    network,
    username,
    item.icon,
  );

  if (canonical !== "") {
    return {
      id,
      label: websiteLabelFromUrl(canonical),
      href: canonical,
      icon: headerProfileIcon(item.icon, canonical),
    };
  }

  if (network !== "" && username !== "") {
    return {
      id,
      label: `${network}: ${username}`,
      href: "",
      icon: headerProfileIcon(item.icon, ""),
    };
  }

  return null;
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
 * True when every visible profile is represented by a header link — a stored
 * URL, a derived canonical URL, or an inline `Network: username` row — so the
 * separate Profiles section would only repeat the contact line. A row with
 * nothing usable (for example a network-only draft) keeps the section visible.
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
