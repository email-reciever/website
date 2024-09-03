import { load } from 'cheerio';
import { html2md } from '../utils/html2md';
import { Adapter } from '../types';

const startKeyWord = [/Did someone forward you this/, /to subscribe\./];
const stopKeyWord = ['That’s a wrap! ', 'Catch up on everything'];

export const astro: Adapter = (text, html) => {
	const { md } = html2md(html);
	// slice content from the main things to sports
	const startIndex = Math.max(...startKeyWord.map((v) => md.match(v)?.index ?? 0), 0);
	const endIndex = Math.max(0, ...stopKeyWord.map((v) => md.indexOf(v)));
	const blogContent = md.slice(startIndex, endIndex);

	const $ = load(html, null, false);
	let origin_url: string | undefined;
	const titleHref = $('a').get(0);
	if (titleHref) {
		origin_url = $(titleHref).attr('href');
	}

	return {
		blogContent,
		origin_url,
	};
};
