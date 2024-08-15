/**
 * @description adaptor for react digest
 *
 * the email container is a markdown string. direct use it for blog
 */
import { visit } from 'unist-util-visit';
import { type Test } from 'unist-util-is';
import chunk from 'lodash.chunk';

import { type VisitNode, shouldSitg } from '../remarks/remark-words-sitg-plugin';
import type { LinkItem, Adapter, CollectLinks } from '../types';

export const collectLinks: CollectLinks = (onCollectLinks) => {
	return function (tree) {
		const links: LinkItem[] = [];
		visit<VisitNode, Test>(tree, ['paragraph'], (node) => {
			const linkItem: Partial<LinkItem> = {};
			// every two is a group
			let index = links.length % 2 ? 3 : 0;
			visit<VisitNode, Test>(node, ['text', 'link'], (textOrLinkNode) => {
				if (textOrLinkNode.type === 'link') {
					linkItem.url = textOrLinkNode.url!;
				} else if (shouldSitg(textOrLinkNode)) {
					const value = textOrLinkNode.value!;
					switch (index) {
						case 1:
							linkItem.readTime = value;
							break;
						case 2:
							linkItem.author = value;
							break;
						case 3:
							linkItem.summary = value;
							break;
						default:
							linkItem.title = value;
							break;
					}
					index++;
				}
			});
			links.push(linkItem as LinkItem);
		});
		// every two combine for one
		const withSummaryLinks = chunk(links, 2).map(([a, b]) => ({ ...a, ...b }));
		onCollectLinks(withSummaryLinks);
	};
};

export const rd: Adapter = async (text, html, headers) => {
	// slice content to newsletters
	const sectionContent = text.slice(0, text.indexOf('## newsletters'));

	return {
		blogContent: sectionContent,
		collectLinks,
		origin_url: headers.find((v) => v.key === 'x-newsletter')?.value,
	};
};
