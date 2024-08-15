import { load } from 'cheerio';
import { html2md } from '../utils/html2md';
import { Adapter } from '../types';

export const alexkondov: Adapter = (text, html) => {
	const { md } = html2md(html);
	// slice content from the main things to sports
	const startIndex = md.indexOf('[View this email in your browser](') || 0;
	const midIndex = md.slice(startIndex).indexOf('![](');
	const endIndex = md.slice(startIndex).indexOf('This email was sent to');
	const blogContent = md.slice(startIndex).slice(midIndex, endIndex);

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
