import { load } from 'cheerio';
import { html2md } from '../utils/html2md';
import { Adapter } from '../types';

export const tyler: Adapter = (text, html) => {
	const { md } = html2md(html);
	// slice content from the main things to sports
	const startIndex = md.indexOf('The Main Thing\n--------------') || 0;
	// due to postal format markdown without ``, make code type to para. remove it
	const middleStartIndex = md.indexOf('![Spot the Bug logo]');
	const middleEndIndex = md.indexOf('![Cool Bits logo]');
	const endIndex = md.lastIndexOf('![Spot the Bug logo]');
	const subEndIndex = md.indexOf('[Unsubscribe from Bytes]');
	const blogContent = md.slice(startIndex, middleStartIndex).concat(md.slice(middleEndIndex, endIndex === -1 ? subEndIndex : endIndex));

	const $ = load(html, null, false);
	let origin_url: string | undefined;

	$('p > a').each((index, element) => {
		if ($(element).text().match(/^#\d+/) && !origin_url) {
			origin_url = element.attribs.href;
		}
	});

	return {
		blogContent,
		origin_url,
	};
};
