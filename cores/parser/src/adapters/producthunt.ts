import { load } from 'cheerio';
import { Adapter } from '../types';

export const producthunt: Adapter = (text, html) => {
	const startIndex = text.indexOf('TOP NEWS') || 0;
	const endIndex = text.indexOf("What did you think of today's newsletter?");
	const blogContent = text.slice(startIndex, endIndex);

	const $ = load(html);
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
