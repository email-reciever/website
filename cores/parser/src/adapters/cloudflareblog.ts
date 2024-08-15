import { load } from 'cheerio';
import { td } from '../utils/td';

import { Adapter } from '../types';

export const cloudflareblog: Adapter = (text, html) => {
	// due to cloudflare email can not parsed to markdown. use turndown parse it
	const markdownContent = new td().turndown(text);
	const endIndex = markdownContent.indexOf('Copyright © 2024 Cloudflare');
	const blogContent = markdownContent.slice(0, endIndex);

	const $ = load(html, null, false);
	let origin_url: string | undefined;

	$('td > a').each((index, element) => {
		if ($(element).text().includes('Read More') && !origin_url) {
			origin_url = element.attribs.href;
		}
	});

	return {
		blogContent,
		origin_url,
	};
};
