import { load } from 'cheerio';
import { html2md } from '../utils/html2md';
import { Adapter } from '../types';

export const producthunt: Adapter = (text, html) => {
	const { md } = html2md(html);
	const startIndex = md.indexOf('TOP NEWS') || 0;
	const endIndex = md.indexOf("What did you think of today's newsletter?");
	const blogContent = md.slice(startIndex, endIndex);

	const $ = load(html, null, false);
	let origin_url: string | undefined;

	$('td.actions > a').each((index, element) => {
		if ($(element).text().includes('Read in browser') && !origin_url) {
			origin_url = element.attribs.href;
		}
	});

	return {
		blogContent,
		origin_url,
	};
};
