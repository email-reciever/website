import { Adapter } from '../types';
import { html2md } from '../utils/html2md';

export const arcupdate: Adapter = (text, html) => {
	const { md } = html2md(html);
	// slice content from the main things to sports
	const startIndex = md.indexOf('[![ARC]') || 0;
	const endIndex = md.lastIndexOf('We’ll see you on the web');
	const subendIndex = md.indexOf('[Unsubscribe]');
	const blogContent = md.slice(startIndex, endIndex === -1 ? subendIndex : endIndex);

	return {
		blogContent,
		origin_url: 'https://thebrowser.company/',
	};
};
