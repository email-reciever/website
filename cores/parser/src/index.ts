import dayjs from "dayjs";
import type { Header } from "postal-mime";
import postalMime from "postal-mime";
import "dayjs/locale/zh-cn";

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
import { syncRssSources } from "./utils/rss";
import { syncArchiveSources } from "./utils/scrape";

dayjs.locale("zh-cn");

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
      // manual trigger for the direct-subscription sync (feeds + archives;
      // also runs on the cron trigger)
      await syncRssSources(env, adapter);
      await syncArchiveSources(env, adapter);
      return Response.json({ synced: Date.now() });
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
  // direct-subscription sync (RSS feeds + archive scrapes), crons in wrangler.toml
  async scheduled(controller, env) {
    void controller;
    await syncRssSources(env, adapter);
    await syncArchiveSources(env, adapter);
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
