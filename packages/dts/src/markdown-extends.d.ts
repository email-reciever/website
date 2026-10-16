/**
 * Frontmatter schema of content markdown files (content/{author}/{slug}.md).
 * Shared contract: parser is the writer, website is the reader.
 */
export interface Frontmatter {
  /** post title */
  title: string;
  /** short summary, usually equals title for newsletters */
  description?: string;
  /** collection dir name, lowercase whitelist key, e.g. `tyler` */
  author: string;
  /** original author name inside a source, e.g. zhihu columnist */
  subAuthor?: string;
  /** publish/record time, ISO 8601 string */
  date: string;
  /** link to the original article */
  origin_url: string;
  /** link to the original site/channel, differs from origin_url */
  origin_site?: string;
  /** sender mailbox that delivered this post */
  email_recorder?: string;
  /** whether content is translated to Chinese */
  translated?: boolean;
  /** avatar icon path under /media-source */
  avatar?: string;
  /** banner image path or url */
  banner?: string;
}
