/**
 * @description general markdown transformer
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';

import { translate } from '../utils/translate';
import { td } from '../utils/td';
import { remarkCodePlugin, type PluginOptions } from '../remarks/remark-code-plugin';
import type { LinkItem, CollectLinks } from '../types';

function translatedLinkSource(getLinks: () => LinkItem[]) {
	return async () => {
		if (getLinks().length) {
			const { turndown } = new td();
			try {
				// jsdom do not use node:* prefix for node modules. wait for a instand lib
				// https://github.com/jsdom/jsdom/issues/3753
				// const linkSource = await Promise.all(
				// 	getLinks().map(({ url }) => {
				// 		if (url) {
				// 			return JSDOM.fromURL(url)
				// 			// attemp use largest dom to get content for translate
				// 		}
				// 	})
				// );
			} catch (e) {}
		}
	};
}

async function processMD(markdown: string, ...codePluginParams: PluginOptions) {
	const md = await unified()
		.use(remarkParse)
		.use(remarkCodePlugin, ...codePluginParams)
		.use(remarkStringify)
		.process(markdown);
	return String(md);
}

export async function md(markdown: string, env: Env, collectLinkPlugin?: CollectLinks) {
	// first site all code node
	const positionCodeMarkdown = await processMD(markdown);
	// translate it
	try {
		const translateContent = await translate(positionCodeMarkdown, env);
		const fallbackCodeContent = await processMD(translateContent, true, markdown);

		return String(fallbackCodeContent);
	} catch (r) {
		console.log(r);
	}

	return markdown;
}
