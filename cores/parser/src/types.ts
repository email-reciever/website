import { WHITELISTS } from '@email.reciever/consts/white-lists';
import type { Email } from 'postal-mime';
import type { Plugin } from 'unified';

export type { Email, Plugin };

export type WlKeys = keyof typeof WHITELISTS | 'OTHERS';

export type SenderType = Lowercase<WlKeys>;

export interface LinkItem {
	url: string;
	title: string;
	summary: string;
	readTime?: string;
	author: string;
}

export interface LinkRefer extends LinkItem {
	sender: SenderType;
}

export type OnCollectLinks = (links?: LinkItem[]) => void;

export type CollectLinks = Plugin<[OnCollectLinks]>;

export type AdapterOutput = {
	blogContent: string;
	collectLinks?: CollectLinks;
	origin_url?: string;
	translate?: boolean;
};

export type Adapter = (
	text: Required<Email>['text'],
	html: Required<Email>['html'],
	headers: Required<Email>['headers'],
	env: Env
) => AdapterOutput | Promise<AdapterOutput>;
