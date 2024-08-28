import postalMime, { Header } from 'postal-mime';
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
import { others } from './adapters/others';
import { javascriptweekly } from './adapters/javascriptweekly';

import { logger } from './utils/logger';

import { createBlog, createCommonFrontmatter, checkEmailSendValid, getEmailSenderType } from './utils/blog';

import type { frontmatter } from '@email.reciever/types/markdown-extends';
import type { Adapter, SenderType } from './types';
import { forward } from './utils/forward';

dayjs.locale('zh-cn');

const adapter: Partial<Record<SenderType, Adapter>> = {
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
	// test route. not avaliable
	async fetch(request, env) {
		const { url } = request;
		const { pathname } = new URL(url);
		if (pathname === '/') {
			const { md: markdownContent, type, html, title, date, siteURL, headers = [] } = await request.json<RequestBody>();
			// debug with https://kreata.ee/postal-mime/example/
			if (markdownContent?.length) {
				// with different email sender, use adapter to collect right content for translate
				const {
					blogContent = markdownContent,
					collectLinks,
					translate = true,
					origin_url,
				} = await adapter[type]!(markdownContent!, html, headers, env);
				// translate content
				const translatedMD = translate ? await md(blogContent!, env, collectLinks) : '';

				await createBlog(
					translatedMD,
					blogContent!,
					{
						...createCommonFrontmatter(title, type, origin_url ?? siteURL!, date),
						translated: !!translatedMD?.length,
					} as unknown as frontmatter,
					env
				);

				return Response.json({ translated: translatedMD, inputs: blogContent, origin_url: origin_url ?? siteURL });
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
			const { raw } = message;
			// collect major infomation
			let { from, text, html, subject, date, headers } = await postalMime.parse(raw);
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
			logger(env, 'recieve email', emailSender, subject, text, html);
			if (checkEmailSendValid(emailSender)) {
				// get email sender type, also use for collect dir. example: reactdigest/xxx
				const dir = getEmailSenderType(emailSender);
				// default use content like total text
				// with different email sender, use adapter to collect right content for translate
				const {
					blogContent = text,
					collectLinks,
					translate = true,
					origin_url = 'javascript:;',
				} = await adapter[dir]!(text!, html!, headers, env);
				// translate content
				const translatedMD = translate ? await md(blogContent!, env, collectLinks) : '';

				const title = subject ?? `${from}`;
				// generate frontmatter
				const basicFrontMatter: frontmatter = {
					...createCommonFrontmatter(title, dir, origin_url, date),
					email_recorder: emailSender,
				};

				await createBlog(translatedMD, blogContent!, { ...basicFrontMatter, translated: !!translatedMD?.length }, env);
			} else {
				if (!selfForward) {
					message.setReject('Unknown Sender!!');
				}
			}
		} catch (e) {
			logger(env, 'email parse error', e);
		}
	},
} satisfies ExportedHandler<Env>;
