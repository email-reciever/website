import { WHITELISTS } from '@email.reciever/consts/white-lists';
import { local } from '../adapters/local';
import { github } from '../adapters/github';

import dayjs from 'dayjs';

import type { frontmatter } from '@email.reciever/types/markdown-extends';
import type { WlKeys } from '../types';

export function checkEmailSendValid(send: any) {
	return Object.values(WHITELISTS).includes(send);
}

export function getEmailSenderType(email: any) {
	return Object.keys(WHITELISTS)
		.find((v) => WHITELISTS[v as WlKeys] === email)!
		.toLocaleLowerCase() as Lowercase<WlKeys>;
}

export async function createBlog(translateContent: string, originContent: string, frontMatter: frontmatter, env: Env) {
	const frontMatterContent = Object.entries(frontMatter)
		.map(([k, v]) => `${k}: ${v}`)
		.join('\n');

	const content = `---
${frontMatterContent}
---

import { Detail } from '@/components/Detail.tsx';
import { Reference } from '@/components/Reference.tsx';

<Reference client:only="react" title="${frontMatter.title}" url="${frontMatter.origin_url}" />

${
	frontMatter.translated
		? `<Detail client:only="react">
	${originContent}
</Detail>`
		: ''
}

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

export function createCommonFrontmatter(title: string, author: string, origin_url: string, date?: string) {
	const withFormatDate = dayjs(date).format('dddd hh A MMMM Do YYYY');
	const avatar = `/media-source/${author}-ico.png`;
	// deal charactor ':', it will cause astro js-yml error
	const escapeTitle = title.replace(/:/gi, '：').replace(/"/gi, '”');
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
