import { load } from 'cheerio';
import { Adapter } from '../types';

export const tyler: Adapter = (text, html) => {
	// slice content from the main things to sports
	const startIndex = text.indexOf('--------------\nThe Main Thing\n--------------') || 0;
	// due to postal format markdown without ``, make code type to para. remove it
	const middleStartIndex = text.indexOf('------------\nSpot the Bug\n------------');
	const middleEndIndex = text.indexOf('---------\nCool Bits\n---------');
	const endIndex = text.indexOf('----------------------\nSpot the Bug: Solution\n----------------------');
	const blogContent = text.slice(startIndex, middleStartIndex).concat(text.slice(middleEndIndex, endIndex));

	const $ = load(html);
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
