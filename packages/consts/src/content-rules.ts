/**
 * Per-source content extraction strategy.
 *
 * Why this exists
 * ---------------
 * `renderItem()` previously sent every `article` source straight into the
 * generic `html2md()`, i.e. the whole RSS entry was converted verbatim. That
 * produced two recurring defects:
 *
 * 1. promo chrome (subscribe prompts, "read on the web", author bios, tracking
 *    links, copyright footers) ended up in the saved Markdown;
 * 2. feeds that only publish a teaser in `content:encoded` (Astro, CSS-Tricks)
 *    produced 50-400 character stubs instead of the article.
 *
 * The rules below describe, for every source, which DOM node is the real body,
 * which nodes are never content, which Markdown lines are pure newsletter
 * chrome, and whether the full article page must be fetched to get all of it.
 *
 * Rules are consumed by `cores/parser/src/utils/extract.ts`, which is called
 * from `renderItem()` for BOTH new ingests and reconciliation repairs.
 */

export interface ContentRule {
  /** Pick the real body. The first selector producing enough text wins. */
  content?: string[];
  /** Nodes that are never article content (merged with the global list). */
  remove?: string[];
  /** Markdown lines dropped after conversion but before translation. */
  strip?: RegExp[];
  /** Fetch `item.link` when the feed body is shorter than this many visible chars. */
  minChars?: number;
  /** Always fetch `item.link` (feed only carries a summary). */
  fetchFull?: boolean;
}

/** Applied to every source, on top of its own rule. */
export const GLOBAL_REMOVE = [
  "script",
  "style",
  "noscript",
  "svg",
  "canvas",
  "button",
  "form",
  "iframe",
  "object",
  "embed",
  '[aria-hidden="true"]',
  '[style*="display:none"]',
  '[style*="display: none"]',
  ".sr-only",
  ".visually-hidden",
  // tracking pixels / 1x1 spacer images and click-tracking wrappers
  'img[width="1"]',
  'img[height="1"]',
  'img[src*="tracking"]',
  'img[src*="track."]',
  'img[src*="pixel"]',
  'img[src*="beacon"]',
];

/** Newsletter chrome that survives DOM cleanup because it is plain text. */
export const GLOBAL_STRIP: RegExp[] = [
  /^read (it )?(on|in) (the )?web\b/i,
  /^view (this email )?in (your )?browser\b/i,
  /^did someone forward you this\b/i,
  /^subscribe (now|to)\b/i,
  /^stop getting this newsletter\b/i,
  /^unsubscribe from\b/i,
  /^manage your preferences or unsubscribe\b/i,
  /^change your email address\b/i,
  /^cancel your subscription\b/i,
  /^update your preferences\b/i,
  /^this email was sent to\b/i,
  /^copyright ©/i,
  /^all rights reserved\b/i,
  /^the post .+ appeared first on /i,
  /^we are not endorsed by or affiliated with /i,
  /^published by cooper press ltd\b/i,
  /^fairfield enterprise centre\b/i,
  /^sponsorship:\s*email /i,
  /^\d+ min(ute)?s? read\b/i,
];

const coopStrip = [
  /^published by\b/i,
  /^curated by\b/i,
  /^javascript' is a trademark/i,
  /^\['javascript' is a trademark/i,
];

export const CONTENT_RULES: Record<string, ContentRule> = {
  // ---------------------------------------------------------------- newsletters
  // Cooper Press issues: the whole issue is the content, only strip the masthead
  // and the unsubscribe/legal tail. The legacy adapter still does the marker cut.
  javascriptweekly: { strip: coopStrip },
  nodeweekly: { strip: coopStrip },
  frontendfocus: { strip: coopStrip },
  reactstatus: { strip: coopStrip },

  // Bytes (tyler) — keep both "The Main Thing" and "Cool Bits", drop the puzzle,
  // sponsor outro and postal address.
  tyler: {
    strip: [
      /^advertise\b/i,
      /^archives\b/i,
      /^built with\b/i,
      /^unsubscribe from bytes\b/i,
      /^\d+ w broadway\b/i,
      /^\[sponsored\]/i,
    ],
  },

  // -------------------------------------------------------------- article feeds
  cloudflareblog: {
    // The <article> wrapper contains a newsletter signup widget + inline JS;
    // `.post-content` is the actual write-up.
    content: [".post-content", "article", "main"],
    remove: [".author-bio", ".related-posts", ".newsletter-signup", "form"],
  },

  // Astro's RSS entry is a 53-char teaser — the article must be fetched.
  astro: {
    fetchFull: true,
    content: [".prose", "article.prose", "article", "main", ".content"],
    strip: [/^that's a wrap!/i, /^catch up on everything\b/i],
  },

  reactdigest: {
    strip: [
      /^read online\b/i,
      /^\[read online\]/i,
      /^how did you like this issue\b/i,
      /^and the most popular article from the last issue was\b/i,
    ],
  },

  smashingmag: {
    content: ["article", "main", ".article-content"],
    remove: [".author-bio", ".article-meta", ".share-tools", ".newsletter"],
  },

  typescript: {
    content: ["main", "article"],
    remove: [".blog-footer", ".author-bio"],
  },

  svelte: {
    content: ["article", "main"],
    remove: [".newsletter", ".sidebar"],
  },

  // CSS-Tricks only ships an 881-char excerpt in the feed.
  csstricks: {
    fetchFull: true,
    content: ["article", ".entry-content", ".post-content", "main"],
    remove: [".entry-header", ".author-bio", ".sharedaddy", ".newsletter"],
    strip: [/^you should really get the newsletter\b/i],
  },

  importai: {
    strip: [
      /^welcome to import ai\b/i,
      /^if you'd like to support (this|import ai)\b/i,
      /^thanks for reading!?$/i,
    ],
  },

  mittechai: {
    content: ["article", "main", ".wp-block-post-content", "body"],
    remove: [".newsletter-signup", ".related-stories"],
  },

  garymarcus: {
    remove: ["div.twitter-embed", ".subscribe-button", "button", "svg"],
    strip: [/^subscribe now$/i],
  },

  awsml: {
    content: ["article", "main", ".blog-post-content", "body"],
    remove: [
      ".blog-author-box",
      '[class*="author-box"]',
      '[class*="author-bio"]',
      "#about-the-author",
      ".related-posts",
      ".blog-sidebar",
    ],
    strip: [/^about the author(s)?\b/i],
  },

  // ------------------------------------------------------------- archive/email
  // The archive hydrator already fetches the full page; the leaked JS/CSS came
  // from inline <script>/<style> blocks, which global removal now handles.
  alexkondov: {
    content: ["article", "main", "body"],
    remove: ["nav", "header", "footer"],
    strip: [/^view this email in your browser\b/i, /^this email was sent to\b/i],
  },

  arcupdate: { strip: [/^={8,}$/, /^copyright browser company\b/i] },
  insidergithub: { strip: [/^\$\d+$/, /^this newsletter was written by\b/i] },
  mediumcom: { strip: [/^see more of what you like\b/i, /^\d+ min read$/i] },
  modular: {
    strip: [
      /^no longer want to read these types of updates\b/i,
      /^manage your preferences or unsubscribe\b/i,
    ],
  },
  producthunt: { strip: [/^top news$/i, /^what did you think of today's newsletter\b/i] },
  rnn: { strip: [/^become a sponsor\b/i, /^that's a wrap!$/i] },
  syntaxfm: { strip: [/^a tasty treats newsletter\b/i] },
  zhihu: { strip: [/^发布于\b/] },
};

export function contentRule(key?: string | null): ContentRule {
  return (key && CONTENT_RULES[key.toLowerCase()]) || {};
}
