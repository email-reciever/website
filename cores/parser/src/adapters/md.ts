/**
 * @description general markdown transformer
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { td } from '../utils/td';
import { remarkWordsSitgPlugin } from '../remarks/remark-words-sitg-plugin';
import { remarkTranslatePlugin } from '../remarks/remark-translate-plugin';
import type { LinkItem, CollectLinks } from '../types';

function translateWithAI(content: Record<string, string>, env: Env, onTranslateSuccess: (translated: Record<string, string>) => void) {
	return async () => {
		const translated: Record<string, string> = {};

		await Promise.all(
			Object.entries(content).map(async ([key, value]) => {
				const { translated_text } = await env.AI.run('@cf/meta/m2m100-1.2b', {
					text: value,
					source_lang: 'en',
					target_lang: 'zh',
				});

				translated[key] = translated_text ?? value;
			})
		);

		console.log(translated);
		onTranslateSuccess(translated);
	};
}

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

export function md(markdown: string, env: Env, collectLinkPlugin?: CollectLinks) {
	const translateSitg: Record<string, string> = {};
	let translatedSitg: Record<string, string> = {};
	let links: LinkItem[] = [];

	return (
		unified()
			.use(remarkParse)
			.use(remarkWordsSitgPlugin, (key, value) => (translateSitg[key] = value))
			.use(translateWithAI, translateSitg, env, (aiTranslated) => (translatedSitg = aiTranslated))
			.use(remarkTranslatePlugin, () => translatedSitg)
			// link plugin use for collect translated links
			.use(collectLinkPlugin ?? (() => () => {}), (collectLinks) => {
				if (collectLinks?.length) {
					links = collectLinks;
				}
			})
			// replace link with translated blog
			.use(translatedLinkSource, () => links)
			.use(remarkStringify)
			.process(markdown) as unknown as string
	);
}
