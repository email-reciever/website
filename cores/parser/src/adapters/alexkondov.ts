import { load } from 'cheerio';
import { Adapter } from '../types';

export const alexkondov: Adapter = (text, html) => {
	// slice content from the main things to sports
	const startIndex = text.indexOf('------------------------------------------------------------') || 0;
	const endIndex = text.indexOf('============================================================');
	const blogContent = text.slice(startIndex, endIndex);

	const $ = load(html, null, false);
	let origin_url: string | undefined;

	$('td > a').each((index, element) => {
		if ($(element).text() === 'View this email in your browser' && !origin_url) {
			origin_url = element.attribs.href;
		}
	});

	return {
		blogContent,
		origin_url,
	};
};
