import { load } from 'cheerio';
import { Adapter } from '../types';

export const modular: Adapter = (text, html) => {
	// slice content from the main things to sports
	const startIndex = text.indexOf('Modular (https') || 0;
	const endIndex = text.indexOf('X (https');
	const blogContent = text.slice(startIndex, endIndex);

	const $ = load(html);
	let origin_url: string | undefined;

	$('td > a').each((index, element) => {
		if ($(element).text().includes('💫 Modverse Weekly #') && !origin_url) {
			origin_url = element.attribs.href;
		}
	});

	return {
		blogContent,
		origin_url,
	};
};
