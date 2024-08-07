import { type Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { type Test } from 'unist-util-is';

import { type VisitNode, SITGNODETYPE } from './remark-words-sitg-plugin';

export type TranslatedSitg = () => Record<string, string>;

export const remarkTranslatePlugin: Plugin<[TranslatedSitg]> = (translatedSitg: TranslatedSitg) => {
	return function (tree) {
		visit<VisitNode, Test>(tree, SITGNODETYPE, (node) => {
			if (node.value) {
				// due to closure. use fn make latest value
				const translatedValue = translatedSitg()[node.value];
				if (translatedValue) {
					node.value = translatedValue;
				}
			}
		});
	};
};
