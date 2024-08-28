import { load } from 'cheerio';
import { html2md } from '../utils/html2md';
import { Adapter } from '../types';

export const javascriptweekly: Adapter = (text, html) => {
	const { md } = html2md(html);
	// slice content from the main things to sports
	const startIndex = md.match(/#\d+ — /)?.index ?? 0;
	const endIndex = md.indexOf('This email was sent to');
	const blogContent = md.slice(startIndex, endIndex);

	const $ = load(html, null, false);
	let origin_url: string | undefined;

	$('td > p > a').each((index, element) => {
		if ($(element).text() === 'Read on the Web' && !origin_url) {
			origin_url = element.attribs.href;
		}
	});

	return {
		blogContent,
		origin_url,
	};
};
