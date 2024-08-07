import { Adapter } from '../types';

export const mediumcom: Adapter = (text, html) => {
	const startIndex = text.indexOf("Today's highlights") || 0;
	const endIndex = text.indexOf("See more of what you like and less of what you don't.");
	const blogContent = text.slice(startIndex, endIndex);

	// mediumcom not have snapshot for daily digest

	return {
		blogContent,
		origin_url: 'https://medium.com/',
	};
};
