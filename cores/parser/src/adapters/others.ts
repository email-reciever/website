import { html2md } from '../utils/html2md';
import { Adapter } from '../types';

export const others: Adapter = (text, html, headers) => {
	const { md } = html2md(html);
	// slice content from the main things to sports
	const startCharactor = headers?.find?.((v) => 'startMark' in v);
	const startIndex = (startCharactor?.startMark && md.indexOf(startCharactor.startMark)) || 0;
	const endCharactor = headers?.find?.((v) => 'endMark' in v);
	const endIndex = endCharactor?.endMark && md.lastIndexOf(endCharactor.endMark);
	const blogContent = md.slice(startIndex, endIndex as unknown as number);

	return {
		blogContent,
	};
};
