/**
 * @description make common rules for transform html to markdown
 */
import * as cheerio from 'cheerio';
import { td, type Options, type Rule } from './td';

function cleanAttribute(attribute?: string | null) {
	return attribute ? attribute.replace(/(\n+\s*)+/g, '\n') : '';
}

export function html2md(html: string, options?: Partial<Options> & { rules?: [key: string, rule: Rule][] }) {
	const { rules = [], ...restOptions } = options ?? {};
	const services = new td({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced',
		...restOptions,
	});

	rules.forEach((v) => services.addRule(...v));

	services.addRule('image-sources', {
		filter: function (node) {
			const imageNode = node as HTMLImageElement;
			const src = imageNode.getAttribute('src') || '';
			return /data:image\/svg\+xml/.test(src);
		},
		replacement: function () {
			return '';
		},
	});

	// only use body for translate
	const bodyHTML = cheerio.load(html, null, false).html();
	return {
		bodyHTML,
		services,
		md: services.turndown(bodyHTML!),
	} as const;
}
