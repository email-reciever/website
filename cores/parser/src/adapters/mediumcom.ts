import { html2md } from '../utils/html2md';
import { Adapter } from '../types';
import { AnyNode, load } from 'cheerio';

interface Node extends HTMLDivElement {
	nodeName: string;
	firstChild: Node;
	lastChild: Node;
	innerHTML: string;
	textContent: string;
}

export const mediumcom: Adapter = (text, html) => {
	const { md } = html2md(html, {
		rules: [
			[
				'media-block',
				{
					filter: function (node) {
						const { nodeName, firstChild, innerHTML } = node as Node;
						if (nodeName === 'DIV' && firstChild && firstChild?.getAttribute?.('class')?.startsWith?.('ca cb cc cd ce')) {
							return true;
						}

						return false;
					},
					replacement: function (content, node) {
						const {
							firstChild: { firstChild, lastChild },
						} = node as Node;
						const { firstChild: coverElement, lastChild: contentElemet } = lastChild;

						const $coverElement = load(coverElement.innerHTML, null, false);
						const cover = $coverElement('img').attr('src') || '/media-source/mediumcom-banner.png';
						const coverAlt = $coverElement('img').attr('alt');
						const link = $coverElement('a').attr('href');
						const $contentElement = load(contentElemet.innerHTML, null, false);
						const title = $contentElement('h2').text();
						const description = $contentElement('h3').text() || 'no description';
						return `

![${coverAlt}](${cover})

## [${title}](${link})

### ${description}

- author: **${firstChild.firstChild.textContent}**

***

`;
					},
				},
			],
		],
	});
	const startIndex = md.indexOf("Today's highlights") || 0;
	const endIndex = md.indexOf('## See more of what you like and less of what you don’t.');
	const blogContent = md.slice(startIndex, endIndex);

	// mediumcom not have snapshot for daily digest

	return {
		blogContent,
		origin_url: 'https://medium.com/',
	};
};
