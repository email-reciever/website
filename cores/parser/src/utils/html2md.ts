/**
 * @description make common rules for transform html to markdown
 */
import * as cheerio from 'cheerio';
import { td, type Options, type Node } from './td';

function cleanAttribute(attribute?: string | null) {
	return attribute ? attribute.replace(/(\n+\s*)+/g, '\n') : '';
}

export function html2md(html: string, options?: Partial<Options>) {
	const services = new td({
		...options,
	});

	// services.addRule('image-sources', {
	// 	filter: ['img'],
	// 	// fix: https://github.com/mixmark-io/turndown/blob/cc73387fb707e5fb5e1083e94078d08f38f3abc8/src/commonmark-rules.js#L249
	// 	replacement: function (content, node) {
	// 		const imageNode = node as HTMLImageElement;
	// 		const alt = cleanAttribute(imageNode.getAttribute('alt'));
	// 		const src = imageNode.getAttribute('src') || '';
	// 		console.log('image src', src);
	// 		const title = cleanAttribute(imageNode.getAttribute('title'));
	// 		const titlePart = title ? ' "' + title + '"' : '';
	// 		return src ? '![' + alt + ']' + '(' + src + titlePart + ')' : '';
	// 	},
	// });

	// only use body for translate
	const bodyHTML = cheerio.load(html, null, false).html();
	return {
		services,
		md: services.turndown(bodyHTML!),
	} as const;
}
