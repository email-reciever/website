import { Adapter } from '../types';

export const insidergithub: Adapter = (text, html) => {
	// slice content from the main things to sports
	const startIndex = text.indexOf('"GitHub"                  "GitHub" ') || 0;
	const endIndex = text.indexOf('Try these tips now');
	const blogContent = text.slice(startIndex, endIndex);

	const origin_url = text
		.match(/\[https?:\/\/(([a-zA-Z0-9_-])+(\.)?)*(:\d+)?(\/((\.)?(\?)?=?&?[a-zA-Z0-9_-](\?)?)*)*]/i)?.[1]
		?.slice(1, -1);

	return {
		blogContent,
		origin_url,
	};
};
