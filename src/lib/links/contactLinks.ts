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
