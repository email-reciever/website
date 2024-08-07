import { Adapter } from '../types';

export const arcupdate: Adapter = (text, html) => {
	// slice content from the main things to sports
	const startIndex = text.indexOf('https://thebrowser.company/') || 0;
	const endIndex = text.indexOf('NEW YORK (https://thebrowser.company/)');
	const blogContent = text.slice(startIndex, endIndex);

	return {
		blogContent,
		origin_url: 'https://thebrowser.company/',
	};
};
