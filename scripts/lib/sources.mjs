/** Source config for the local historical backfill tooling. Kept in sync with
 * packages/consts/src/{rss,archives}.ts (the Worker's live source lists). */

export const FEEDS = {
  javascriptweekly: "https://javascriptweekly.com/rss",
  nodeweekly: "https://nodeweekly.com/rss",
  frontendfocus: "https://frontendfoc.us/rss",
  reactstatus: "https://react.status.com/rss",
  cloudflareblog: "https://blog.cloudflare.com/rss",
  astro: "https://astro.build/rss.xml",
  reactdigest: "https://reactdigest.net/newsletters.rss",
  smashingmag: "https://www.smashingmagazine.com/feed/",
  typescript: "https://devblogs.microsoft.com/typescript/feed/",
  svelte: "https://svelte.dev/blog/rss.xml",
  csstricks: "https://css-tricks.com/feed/",
  importai: "https://importai.substack.com/feed",
  mittechai: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
  garymarcus: "https://garymarcus.substack.com/feed",
  awsml: "https://aws.amazon.com/blogs/machine-learning/feed/",
};

/** Sources whose archived posts expose a sequential issue number in origin_url.
 * Fetching by bare number works for these hosts (verified 2026-11). */
export const ISSUE_SOURCES = {
  javascriptweekly: {
    pattern: /\/issues\/(\d+)/,
    url: (n) => `https://javascriptweekly.com/issues/${n}`,
    step: 1,
  },
  nodeweekly: {
    pattern: /\/issues\/(\d+)/,
    url: (n) => `https://nodeweekly.com/issues/${n}`,
    step: 1,
  },
  frontendfocus: {
    pattern: /\/issues\/(\d+)/,
    url: (n) => `https://frontendfoc.us/issues/${n}`,
    step: 1,
  },
  reactstatus: {
    pattern: /\/issues\/(\d+)/,
    url: (n) => `https://react.status.com/issues/${n}`,
    step: 1,
  },
};

export const ARCHIVES = {
  tyler: {
    list: "https://bytes.dev/archives",
    selector: /<a[^>]+href="(\/archives\/\d+)"[^>]*>([\s\S]*?)<\/a>/gi,
    base: "https://bytes.dev",
  },
  alexkondov: {
    list: "https://alexkondov.com/articles/",
    selector: /<a[^>]+href="(https:\/\/alexkondov\.com\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    base: "",
  },
  reactdigest: {
    list: "https://reactdigest.net/newsletters",
    selector: /<a[^>]+href="(\/newsletters\/\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    base: "https://reactdigest.net",
    page: (n) => `https://reactdigest.net/newsletters?page=${n}`,
    maxPages: 32,
  },
};

export const CRAWL_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
};
