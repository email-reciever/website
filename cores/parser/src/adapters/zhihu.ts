import { ZHROUTE, ZHUSER } from '@email.reciever/consts/zhihu';
import { WHITELISTS } from '@email.reciever/consts/white-lists';
import { XMLParser } from 'fast-xml-parser';
import { load } from 'cheerio';
import { html2md } from '../utils/html2md';
import { Adapter, AdapterOutput } from '../types';
import { getMetaData, setMetaData } from '../utils/metadata';
import { createBlog, createCommonFrontmatter } from '../utils/blog';

const host = WHITELISTS.ZHIHU;

type Users = keyof typeof ZHUSER;

type PostItem = {
	title: string;
	description: string;
	link: string;
	author: string;
	pubDate: string;
};

type Rss = {
	channel: {
		title: string;
		link: string;
		image: { url: string };
		item: PostItem[];
	};
};

async function crawlPost(item: PostItem, breakPoint: (string | RegExp)[], channel: Rss['channel'], env: Env) {
	try {
		const { link, title, pubDate, description, author } = item;
		const { image, link: origin_site } = channel;
		const postHtml = await fetch(link, {
			headers: {
				Cookie: env.ZHIHU_COOKIE,
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
			},
		}).then((r) => r.text());
		if (postHtml.length) {
			const { md } = html2md(postHtml);
			const startIndex = md.indexOf(breakPoint[0] as string) ?? 0;
			const endIndex = md.indexOf(breakPoint[1] as string) ?? -1;
			const content = md.slice(startIndex, endIndex);
			const matchDescription = load(description, null, false)('p').text();
			await createBlog(
				content,
				content,
				{
					...createCommonFrontmatter(title, 'zhihu', link, pubDate),
					description: matchDescription.replace(/:/gi, '：'),
					translated: false,
					banner: image.url,
					origin_site,
					subAuthor: author,
				},
				env
			);
		}
	} catch (e) {
		console.log('post crawl fail', item.title, e);
	}
}

async function getUserLatestArticals(userId: Users, metadata: string[], env: Env) {
	const breakPoint = ZHUSER[userId];
	try {
		const {
			rss: { channel },
		} = await fetch(`${host}${ZHROUTE.posts}/${userId}`)
			.then((r) => r.text())
			.then((xml) => new XMLParser().parse(xml) as { rss: Rss });

		const { item } = channel;
		// use metadata filter exits artical
		const updateArticals = item.filter((v) => !metadata.includes(v.title) && (breakPoint[2] as RegExp).test(v.title));

		if (updateArticals.length) {
			await Promise.all(updateArticals.map((v) => crawlPost(v, breakPoint, channel, env)));
		}

		return [userId, updateArticals.map((v) => v.title)];
	} catch (e) {
		console.warn('get failed');
	}
}

function generators<R extends (...args: any[]) => Promise<any> | any>(processors: R[]) {
	return function* g(...args: any[]) {
		let i = processors.length;
		while (i) {
			yield processors[processors.length - i](...args);
			i--;
		}
	};
}

export const zhihu: Adapter = async (text, html, headers, env) => {
	const metaData = await getMetaData('zhihu', env);
	const processors = generators(Object.keys(ZHUSER).map((v) => () => getUserLatestArticals(v as Users, metaData[v] ?? [], env)));

	let shouldUpdate = false;
	for await (const articals of processors()) {
		const [user, updateFiles] = articals ?? [];
		if (updateFiles?.length) {
			shouldUpdate = true;
			metaData[user] = [...(metaData[user] ?? []), ...updateFiles];
		}
	}

	// update metadata file
	if (shouldUpdate) {
		await setMetaData('zhihu', metaData, env);
	}
	return {} as AdapterOutput;
};
