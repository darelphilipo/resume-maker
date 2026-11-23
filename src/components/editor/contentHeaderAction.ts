/**
 * Shared quiet-pill treatment for the Content header's secondary actions
 * (`Bullet polish` and `Match JD`).
 *
 * Both controls sit beside the Content heading, not beside the primary header
 * CTA, so neither may read as a filled button. Keeping the base class here means
 * the two triggers cannot drift apart; tone (muted vs. amber) stays local to the
 * component. The 36px pill is compact on fine pointers and grows to a 44px
 * touch target on coarse pointers.
 */
export const CONTENT_HEADER_ACTION_CLASS =
  "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-xs font-medium transition-colors hover:border-black/30 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 pointer-coarse:min-h-11";
