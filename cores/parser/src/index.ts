import postalMime from 'postal-mime';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

import { WHITELISTS } from '@email.reciever/consts/white-lists';
import { md } from './adapters/md';
import { repoURI } from './adapters/github';
import type { frontmatter } from '@email.reciever/types/markdown-extends';
import { rd } from './adapters/rd';
import { tyler } from './adapters/tyler';
import { producthunt } from './adapters/producthunt';
import { mediumcom } from './adapters/mediumcom';
import { modular } from './adapters/modular';
import { cloudflareblog } from './adapters/cloudflareblog';
import { arcupdate } from './adapters/arcupdate';
import { alexkondov } from './adapters/alexkondov';
import { insidergithub } from './adapters/insidergithub';

import { local } from './adapters/local';
import { github } from './adapters/github';

import { Adapter, SenderType } from './types';

dayjs.locale('zh-cn');

type WlKeys = keyof typeof WHITELISTS;

function checkEmailSendValid(send: any) {
	return Object.values(WHITELISTS).includes(send);
}

function getEmailSenderType(email: any) {
	return Object.keys(WHITELISTS)
		.find((v) => WHITELISTS[v as WlKeys] === email)!
		.toLocaleLowerCase() as Lowercase<WlKeys>;
}

async function createBlog(translateContent: string, originContent: string, frontMatter: frontmatter, env: Env) {
	const frontMatterContent = Object.entries(frontMatter)
		.map(([k, v]) => `${k}: ${v}`)
		.join('\n');

	const content = `---
${frontMatterContent}
---

import { Detail } from '@/components/Detail.tsx';
import { Reference } from '@/components/Reference.tsx';

<Reference client:only="react" title="${frontMatter.title}" url="${frontMatter.origin_url}" />

<Detail client:only="react">
	${originContent}
</Detail>

${translateContent}

`;

	const { author } = frontMatter;
	const fileName = dayjs().format('YYYY-MM-DD_HH-mm-ss_SSS');
	// astro use filename for slug, some charactor may cause route error, use current-date-timestamp
	const path = `src/content/${author}/${fileName}.mdx`;

	if (env.ENV === 'dev') {
		await local({ path, content }, env);
	} else {
		await github({ path, content }, env);
	}
}

function createCommonFrontmatter(title: string, author: string, origin_url: string, date?: string) {
	const withFormatDate = dayjs(date).format('dddd hh A MMMM Do YYYY');
	const avatar = `/media-source/${author}-ico.png`;
	// deal charactor ':', it will cause astro js-yml error
	const escapeTitle = title.replace(/:/gi, '_');
	return {
		layout: '../../layouts/BlogLayout.astro',
		title: escapeTitle,
		description: escapeTitle,
		date: withFormatDate,
		author,
		origin_url,
		origin_site: origin_url,
		translated: true,
		avatar,
	};
}

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
		const { md: markdownContent, type, html, title, date } = await request.json<RequestBody>();
		// debug with https://kreata.ee/postal-mime/example/
		if (markdownContent?.length) {
			// with different email sender, use adapter to collect right content for translate
			const { blogContent = markdownContent, collectLinks, origin_url } = await adapter[type](markdownContent!, html, []);
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

		return Response.redirect(repoURI);
	},
	async email(message, env, ctx) {
		const emailSender = message.from;
		if (checkEmailSendValid(emailSender) && message.rawSize) {
			// collect major infomation
			const { from, raw } = message;
			const { text, html, subject, date, headers } = await postalMime.parse(raw);

			// get email sender type, also use for collect dir. example: reactdigest/xxx
			const dir = getEmailSenderType(from);
			// default use content like total text
			// with different email sender, use adapter to collect right content for translate
			const { blogContent = text, collectLinks, origin_url = 'javascript:;' } = await adapter[dir](text!, html!, headers);
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
	},
} satisfies ExportedHandler<Env>;
