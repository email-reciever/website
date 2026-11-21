import dayjs from "dayjs";
import type { Header } from "postal-mime";
import postalMime from "postal-mime";
import "dayjs/locale/zh-cn";

import { ARCHIVES_SOURCES } from "@email.reciever/consts/archives";
import { RSS_SOURCES } from "@email.reciever/consts/rss";
import type { Frontmatter } from "@email.reciever/types/markdown-extends";
import { alexkondov } from "./adapters/alexkondov";
import { arcupdate } from "./adapters/arcupdate";
import { astro } from "./adapters/astro";
import { cloudflareblog } from "./adapters/cloudflareblog";
import { repoURI } from "./adapters/github";
import { insidergithub } from "./adapters/insidergithub";
import { javascriptweekly } from "./adapters/javascriptweekly";
import { md } from "./adapters/md";
import { mediumcom } from "./adapters/mediumcom";
import { modular } from "./adapters/modular";
import { others } from "./adapters/others";
import { producthunt } from "./adapters/producthunt";
import { rd } from "./adapters/rd";
import { rnn } from "./adapters/rnn";
import { syntaxfm } from "./adapters/syntaxfm";
import { tyler } from "./adapters/tyler";
import { zhihu } from "./adapters/zhihu";
import type { AdapterMap, SenderType } from "./types";
import {
  checkEmailSendValid,
  createBlog,
  createCommonFrontmatter,
  getEmailSenderType,
} from "./utils/blog";
import { forward } from "./utils/forward";
import { issue } from "./utils/issue";
import { logger } from "./utils/logger";
import { reconcileSource } from "./utils/reconcile";
import { syncRssSource } from "./utils/rss";
import { syncArchiveSource } from "./utils/scrape";

dayjs.locale("zh-cn");

/** daily backfill cron — walks older feed items missing from the project */
const BACKFILL_CRON = "15 3 * * *";
/** daily reconcile cron — repairs existing posts and source drift */
const RECONCILE_CRON = "45 4 * * *";

const ALL_SYNC_KEYS = [
  ...(Object.keys(RSS_SOURCES) as SenderType[]),
  ...(Object.keys(ARCHIVES_SOURCES) as SenderType[]),
];

/**
 * Each source must run in its own invocation: 17 sources × ~15 subrequests
 * (GitHub reads/writes, feed fetch, translation) blow the 50-subrequest
 * free-plan budget after the first few. A self-fetch gives every source a
 * fresh budget; the fan-out itself costs only 17 subrequests.
 */
type SyncMode = "sync" | "backfill" | "reconcile";

async function fanOutSync(env: Env, mode: SyncMode = "sync") {
  const detail: Array<{ key: SenderType; status: number; body: string }> = [];
  const path = (key: SenderType) =>
    mode === "sync"
      ? `https://rss.internal/rss/${encodeURIComponent(key)}`
      : `https://rss.internal/rss/${mode}/${encodeURIComponent(key)}`;
  // Serialized: concurrent invocations race on manifest.json's
  // read-modify-write and GitHub rejects the competing commits, so new posts
  // land on disk but miss the index. One at a time keeps the index exact.
  const batchSize = 1;
  for (let i = 0; i < ALL_SYNC_KEYS.length; i += batchSize) {
    const batch = ALL_SYNC_KEYS.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (key) => {
        const res = await env.SELF.fetch(path(key), { method: "POST" });
        const body = await res.text();
        return { key, status: res.status, body: body.slice(0, 120) };
      }),
    );
    results.forEach((r, j) => {
      detail.push(
        r.status === "fulfilled"
          ? r.value
          : { key: batch[j], status: -1, body: String(r.reason).slice(0, 120) },
      );
    });
  }
  logger(env, "rss fan-out", JSON.stringify(detail));
  return detail;
}

const adapter: AdapterMap = {
  reactdigest: rd,
  tyler,
  alexkondov,
  arcupdate,
  cloudflareblog,
  insidergithub,
  mediumcom,
  modular,
  producthunt,
  zhihu,
  others,
  javascriptweekly,
  nodeweekly: javascriptweekly,
  frontendfocus: javascriptweekly,
  reactstatus: javascriptweekly,
  syntaxfm,
  rnn,
  astro,
};

interface RequestBody {
  md: string;
  type: SenderType;
  html: string;
  title: string;
  date: string;
  headers?: Header[];
  siteURL?: string;
}

export default {
  // manual batch/debug route, used by the deno server batch-update flow
  async fetch(request, env) {
    const { url } = request;
    const { pathname } = new URL(url);
    if (pathname === "/") {
      const {
        md: markdownContent,
        type,
        html,
        title,
        date,
        siteURL,
        headers = [],
      } = await request.json<RequestBody>();
      // debug with https://kreata.ee/postal-mime/example/
      if (markdownContent?.length) {
        // with different email sender, use adapter to collect right content for translate
        const {
          blogContent = markdownContent,
          translate = true,
          origin_url,
        } = await adapter[type]!(markdownContent!, html, headers, env);

        let finalContent = blogContent!;
        let translated = false;
        if (translate) {
          const result = await md(blogContent!, env);
          finalContent = result.content;
          translated = result.translated;
        }

        await createBlog(
          finalContent,
          {
            ...createCommonFrontmatter(title, type, origin_url ?? siteURL!, date),
            translated,
          },
          env,
        );

        return Response.json({
          translated,
          inputs: blogContent,
          origin_url: origin_url ?? siteURL,
        });
      }
    } else if (pathname === "/zhihu") {
      // use restful api to update zhihu artical
      await zhihu("", "", [], env);
      return Response.json({ fetch: Date.now() });
    } else if (pathname === "/rss") {
      // manual trigger: ?backfill=1 walks older missing items, ?reconcile=1
      // repairs existing posts / source drift
      const params = new URL(url).searchParams;
      const mode: SyncMode =
        params.get("reconcile") === "1"
          ? "reconcile"
          : params.get("backfill") === "1"
            ? "backfill"
            : "sync";
      const detail = await fanOutSync(env, mode);
      return Response.json({
        synced: Date.now(),
        mode,
        sources: ALL_SYNC_KEYS.length,
        detail,
      });
    } else if (pathname.startsWith("/rss/reconcile/")) {
      const key = decodeURIComponent(pathname.slice("/rss/reconcile/".length)) as SenderType;
      await reconcileSource(key, env, adapter);
      return Response.json({ source: key, mode: "reconcile", synced: Date.now() });
    } else if (pathname.startsWith("/rss/backfill/")) {
      const key = decodeURIComponent(pathname.slice("/rss/backfill/".length)) as SenderType;
      if (key in RSS_SOURCES) {
        await syncRssSource(key, env, adapter, { backfill: true });
      } else if (key in ARCHIVES_SOURCES) {
        await syncArchiveSource(key, env, adapter, { backfill: true });
      } else {
        return Response.json({ error: "unknown source", source: key }, { status: 404 });
      }
      return Response.json({ source: key, mode: "backfill", synced: Date.now() });
    } else if (pathname.startsWith("/rss/")) {
      // single-source worker invoked by the fan-out above (or called directly)
      const key = decodeURIComponent(pathname.slice("/rss/".length)) as SenderType;
      if (key in RSS_SOURCES) {
        await syncRssSource(key, env, adapter);
      } else if (key in ARCHIVES_SOURCES) {
        await syncArchiveSource(key, env, adapter);
      } else {
        return Response.json({ error: "unknown source", source: key }, { status: 404 });
      }
      return Response.json({ source: key, synced: Date.now() });
    } else if (pathname === "/issue") {
      const payload = await request.json<Record<string, any>>();
      try {
        await issue(env, payload, adapter);
      } catch (e) {
        logger(env, "issue error", e);
      }

      return Response.json({ code: 200, success: true });
    }

    return Response.redirect(repoURI);
  },
  // direct-subscription sync (RSS feeds + archive scrapes), crons in wrangler.toml.
  // Fan out via self-fetch so every source gets its own subrequest budget.
  async scheduled(controller, env) {
    const mode: SyncMode =
      controller.cron === BACKFILL_CRON
        ? "backfill"
        : controller.cron === RECONCILE_CRON
          ? "reconcile"
          : "sync";
    await fanOutSync(env, mode);
  },
  async email(message, env, _ctx) {
    try {
      const { raw } = message;
      // collect major infomation
      let { from, text, html, subject, date, headers } = await postalMime.parse(raw);
      if (!from?.address) {
        logger(env, "email parse error: missing sender");
        message.setReject("Invalid Sender!!");
        return;
      }
      let emailSender = from.address;
      const selfForward = emailSender === env.SELF_EMAIL;
      if (selfForward && subject) {
        const forwardInfo = forward(subject);
        if (forwardInfo?.sender) {
          subject = forwardInfo.subject;
          emailSender = forwardInfo.sender;
        }
      }
      // use a logger collect info
      logger(env, "recieve email", emailSender, subject, text, html);
      if (checkEmailSendValid(emailSender)) {
        // get email sender type, also use for collect dir. example: reactdigest/xxx
        const dir = getEmailSenderType(emailSender);
        // default use content like total text
        // with different email sender, use adapter to collect right content for translate
        const {
          blogContent = text ?? "",
          translate = true,
          origin_url = "javascript:;",
        } = await adapter[dir]!(text ?? "", html ?? "", headers, env);

        let finalContent = blogContent!;
        let translated = false;
        if (translate) {
          const result = await md(blogContent!, env);
          finalContent = result.content;
          translated = result.translated;
        }

        const title = subject ?? `${from}`;
        // generate frontmatter
        const basicFrontMatter: Frontmatter = {
          ...createCommonFrontmatter(title, dir, origin_url, date),
          email_recorder: emailSender,
          translated,
        };

        await createBlog(finalContent, basicFrontMatter, env);
      } else {
        if (!selfForward) {
          message.setReject("Unknown Sender!!");
        }
      }
    } catch (e) {
      logger(env, "email parse error", e);
    }
  },
} satisfies ExportedHandler<Env>;
