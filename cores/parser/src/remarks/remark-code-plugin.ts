import { type Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { type Test } from 'unist-util-is';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { find } from 'unist-util-find';

import { type VisitNode, SITGNODETYPE } from './remark-words-sitg-plugin';

export const codereplacer = '<P|';

export type PluginOptions = [reverse?: boolean, orMarkdow?: string];

export const remarkCodePlugin: Plugin<PluginOptions> = (reverse?: PluginOptions[0], orMarkdow?: PluginOptions[1]) => {
	let orTree = orMarkdow ? fromMarkdown(orMarkdow) : undefined;

	return function (tree) {
		visit<VisitNode, Test>(tree, ['code'], (node) => {
			if (node.value && typeof node.position?.start !== 'undefined') {
				const { line, column, offset } = node.position.start;
				const marker = `${codereplacer}${line}-${column}-${offset}/>`;
				// use start position for instand
				if (orMarkdow) {
					if (node.value.startsWith(codereplacer)) {
						const [pLine, pColumn, pOffset] = node.value
							.replace(codereplacer, '')
							.slice(0, -2)
							.split('-')
							.map((v) => Number(v));
						const codeNode = find(orTree!, (cNode) => {
							if (cNode.type === 'code' && cNode.position) {
								// due to length change, offset will change, use line & column check
								return (
									pLine === cNode.position.start.line && pColumn === cNode.position.start.column && pOffset === cNode.position.start.offset
								);
							}

							return false;
						});
						if (codeNode) {
							node.value = (codeNode as VisitNode).value;
							node.lang = (codeNode as VisitNode).lang;
						}
					}
				} else {
					node.value = marker;
					node.lang = undefined;
				}
			}
		});
	};
};
