import { load } from 'cheerio';
import { html2md } from '../utils/html2md';
import { Adapter } from '../types';

export const modular: Adapter = (text, html) => {
	const { md } = html2md(html);
	// slice content from the main things to sports
	const startIndex = md.indexOf('Read Modverse Weekly') || 0;
	const endIndex = md.indexOf('[![X]');
	const blogContent = md.slice(startIndex, endIndex);

	const $ = load(html, null, false);
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
