/**
 * @description sitg words should translate
 */
import { type Plugin } from 'unified';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';
import { type Test } from 'unist-util-is';
import { testPureURI } from '@email.reciever/consts/regexp';

export const SITGPREFIX = '$';

export const SITGNODETYPE: string[] = ['text'];
export const ESCAPENODETYPE: string[] = [];

export const escapeTextContent = ['\r\n', '\n', '', '””', '"\\"', '""'];

export type CollectSitg = (key: string, value: string) => string;

export interface VisitNode extends Node {
	url?: string;
	value?: string;
	children?: VisitNode[];
}

export function shouldSitg(node: VisitNode) {
	// escape url
	if (node.value) {
		// due to some text content may have spaces, use trim value check
		const trimValue = node.value.trim();
		return trimValue.length && !testPureURI.test(trimValue) && !escapeTextContent.includes(trimValue);
	}
}

let count = 0;

export const remarkWordsSitgPlugin: Plugin<[CollectSitg]> = (onCollectSitg: CollectSitg) => {
	return function (tree) {
		visit<VisitNode, Test>(
			tree,
			({ type }) => !ESCAPENODETYPE.includes(type) && SITGNODETYPE.includes(type),
			(node) => {
				// replace node value with sitg mark
				if (shouldSitg(node)) {
					const sitgMark = `${SITGPREFIX}${count++}`;
					console.log(sitgMark, node.value);
					onCollectSitg(sitgMark, node.value!);
					node.value = sitgMark;
					console.log('remarkWordsSitgPlugin', node);
				}
			}
		);
	};
};
