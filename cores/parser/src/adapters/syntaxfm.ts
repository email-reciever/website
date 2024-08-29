import { load } from 'cheerio';
import { html2md } from '../utils/html2md';
import { Adapter } from '../types';

export const syntaxfm: Adapter = (text, html) => {
	const { md } = html2md(html);
	// slice content from the main things to sports
	const startIndex = md.match(/A Tasty Treats NEWSLETTER/)?.index ?? 0;
	const endIndex = md.match(/\[\!\[x-twitter/)?.index ?? -1;
	const blogContent = md.slice(startIndex, endIndex);

	const $ = load(html, null, false);
	let origin_url: string | undefined;

	$('td > figure > a').each((index, element) => {
		if ($(element).find('img')) {
			origin_url = element.attribs.href;
		}
	});

	return {
		blogContent,
		origin_url,
	};
};
