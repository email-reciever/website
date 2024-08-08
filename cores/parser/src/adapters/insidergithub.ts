import { Adapter } from '../types';
import { testURI } from '@email.reciever/consts/regexp';
import { html2md } from '../utils/html2md';

export const insidergithub: Adapter = (text, html) => {
	const { md } = html2md(html);

	// slice content from the main things to sports
	const startIndex = md.indexOf('See how they automate tasks, stay focused, and more ') || 0;
	const endIndex = md.indexOf('This newsletter was written by');
	const blogContent = md.slice(startIndex, endIndex);

	const origin_url = text.match(testURI)?.[1]?.slice(1, -1);

	return {
		blogContent,
		origin_url,
	};
};
