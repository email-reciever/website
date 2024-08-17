import postalMime from 'postal-mime';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

import { md } from './adapters/md';
import { repoURI } from './adapters/github';
import { rd } from './adapters/rd';
import { tyler } from './adapters/tyler';
import { producthunt } from './adapters/producthunt';
import { mediumcom } from './adapters/mediumcom';
import { modular } from './adapters/modular';
import { cloudflareblog } from './adapters/cloudflareblog';
import { arcupdate } from './adapters/arcupdate';
import { alexkondov } from './adapters/alexkondov';
import { insidergithub } from './adapters/insidergithub';
import { zhihu } from './adapters/zhihu';

import { createBlog, createCommonFrontmatter, checkEmailSendValid, getEmailSenderType } from './utils/blog';

import type { frontmatter } from '@email.reciever/types/markdown-extends';
import type { Adapter, SenderType } from './types';

dayjs.locale('zh-cn');

const adapter: Record<SenderType, Adapter> = {
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
};

interface RequestBody {
	md: string;
	type: SenderType;
	html: string;
	title: string;
	date: string;
}

export default {
	// test route. not avaliable
	async fetch(request, env) {
		const { url } = request;
		const { pathname } = new URL(url);
		if (pathname === '/') {
			const { md: markdownContent, type, html, title, date } = await request.json<RequestBody>();
			// debug with https://kreata.ee/postal-mime/example/
			if (markdownContent?.length) {
				// with different email sender, use adapter to collect right content for translate
				const { blogContent = markdownContent, collectLinks, origin_url } = await adapter[type](markdownContent!, html, [], env);
				// translate content
				const translatedMD = await md(blogContent!, env, collectLinks);

				await createBlog(
					translatedMD,
					blogContent!,
					{
						...createCommonFrontmatter(title, type, origin_url!, date),
					} as unknown as frontmatter,
					env
				);

				return Response.json({ translated: translatedMD, inputs: blogContent, origin_url });
			}
		} else if (pathname === '/zhihu') {
			// use restful api to update zhihu artical
			await zhihu('', '', [], env);
			return Response.json({ fetch: Date.now() });
		}

		return Response.redirect(repoURI);
	},
	async email(message, env, ctx) {
		try {
			const emailSender = message.from;
			if (checkEmailSendValid(emailSender) && message.rawSize) {
				// collect major infomation
				const { from, raw } = message;
				const { text, html, subject, date, headers } = await postalMime.parse(raw);

				// get email sender type, also use for collect dir. example: reactdigest/xxx
				const dir = getEmailSenderType(from);
				// default use content like total text
				// with different email sender, use adapter to collect right content for translate
				const { blogContent = text, collectLinks, origin_url = 'javascript:;' } = await adapter[dir](text!, html!, headers, env);
				// translate content
				const translatedMD = await md(blogContent!, env, collectLinks);

				const title = subject ?? `${from}`;
				// generate frontmatter
				const basicFrontMatter: frontmatter = {
					...createCommonFrontmatter(title, dir, origin_url, date),
					email_recorder: from,
				};

				await createBlog(translatedMD, blogContent!, basicFrontMatter, env);
			} else {
				message.setReject('Unknown Sender!!');
			}
		} catch (e) {
			console.log('email parse error', e);
		}
	},
	async tail(event, env) {
		const key = dayjs().toISOString();
		await env.LOGGER.put(key, JSON.stringify(event));
	},
} satisfies ExportedHandler<Env>;
