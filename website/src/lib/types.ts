/** manifest.json entry — the slim metadata the list page consumes */
export interface ManifestEntry {
  author: string;
  /** filename without extension, unique inside the author dir */
  slug: string;
  title: string;
  description?: string;
  /** ISO 8601 string (legacy hand-written posts may keep raw strings) */
  date: string;
  origin_url?: string;
  origin_site?: string;
  subAuthor?: string;
  avatar?: string;
  banner?: string;
  translated?: boolean;
}

export interface Manifest {
  posts: ManifestEntry[];
}

/** list page loader result: one page slice + aggregate info */
export interface ListResult {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  posts: ManifestEntry[];
  /** post count per source, used by the source tabs */
  counts: Record<string, number>;
}

export interface ListQuery {
  source?: string;
  q?: string;
  page?: number;
}

/** detail page loader result */
export interface PostPage {
  entry: ManifestEntry & { email_recorder?: string };
  html: string;
}
