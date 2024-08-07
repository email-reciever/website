import postalMime from 'postal-mime';
import dayjs from 'dayjs';
import * as process from 'node:process';

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
import { Adapter, AdapterOutput, SenderType } from './types';

type WlKeys = keyof typeof WHITELISTS;

function checkEmailSendValid(send: any) {
	return Object.values(WHITELISTS).includes(send);
}

function getEmailSenderType(email: any) {
	return Object.keys(WHITELISTS)
		.find((v) => WHITELISTS[v as WlKeys] === email)!
		.toLocaleLowerCase() as Lowercase<WlKeys>;
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
}

export default {
	// test route. not avaliable
	async fetch(request, env) {
		const { md: markdownContent, type, html } = await request.json<RequestBody>();
		console.log(import.meta.filename, process.env.PATH);
		// debug with https://kreata.ee/postal-mime/example/
		if (markdownContent?.length) {
			// with different email sender, use adapter to collect right content for translate
			const { blogContent = markdownContent, collectLinks, origin_url } = await adapter[type](markdownContent!, html, []);
			// translate content
			const translatedMD = await md(blogContent!, env, collectLinks);
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
			const withFormatDate = dayjs(date).format('YYYY-MM-DD HH:mm:ss');

			// get email sender type, also use for collect dir. example: reactdigest/xxx
			const dir = getEmailSenderType(from);
			// default use content like total text
			// with different email sender, use adapter to collect right content for translate
			const { blogContent = text, collectLinks, origin_url = 'javascript:;' } = await adapter[dir](text!, html!, headers);
			// translate content
			const translatedMD = await md(blogContent!, env, collectLinks);

			const title = subject ?? `${from}`;
			const avatar = `/media-source/${dir}-ico.png`;
			// generate frontmatter
			const basicFrontMatter: frontmatter = {
				layout: '@/layouts/BlogLayout.astro',
				title,
				description: title,
				date: withFormatDate,
				avatar,
				author: dir,
				origin_url,
				origin_site: origin_url,
				translated: true,
				email_recorder: from,
			};
			console.log(__dirname);
		} else {
			message.setReject('Unknown Sender!!');
		}
	},
} satisfies ExportedHandler<Env>;
