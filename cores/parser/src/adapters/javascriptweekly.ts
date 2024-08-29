import { load } from 'cheerio';
import { html2md } from '../utils/html2md';
import { Adapter } from '../types';

const startKeyWord = [/Chris Brandrick, your editor/, /#\d+ — /, /#​(\d+) —/];
const stopKeyWord = ['Change your email address', 'Cancel your subscription'];

export const javascriptweekly: Adapter = (text, html) => {
	const { md } = html2md(html);
	// slice content from the main things to sports
	const startIndex = Math.max(...startKeyWord.map((v) => md.match(v)?.index ?? 0), 0);
	const endIndex = Math.max(0, ...stopKeyWord.map((v) => md.indexOf(`[${v}`)));
	const blogContent = md.slice(startIndex, endIndex);

	const $ = load(html, null, false);
	let origin_url: string | undefined;

	$('td  p > a').each((index, element) => {
		if ($(element).text().toLocaleLowerCase() === 'read on the web' && !origin_url) {
			origin_url = element.attribs.href;
		}
	});

	return {
		blogContent,
		origin_url,
	};
};
