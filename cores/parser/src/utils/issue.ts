import yaml from 'js-yaml';
import { Octokit } from '@octokit/rest';
import { testPureURI } from '@email.reciever/consts/regexp';
import { mockHeaders } from '../adapters/zhihu';
import { $repo } from '../adapters/github';

import type { Header } from 'postal-mime';
import type { AdapterMap, SenderType } from '../types';
import { md } from '../adapters/md';

const openTag = '[Recorder]: ';

export type IssueBody = {
	title: string;
	url: string;
	author?: string;
	breakpoints: string[];
	translate: boolean;
	adapter: SenderType;
};

export async function issue(env: Env, payload: Record<string, any>, adapter: AdapterMap) {
	if (payload) {
		const { action, issue: mainField, sender } = payload;
		if (action === env.OPEN_ACTION && sender?.login === env.OPEN_USER && mainField?.title?.startsWith?.(openTag)) {
			const { body, id } = mainField;
			if (body?.length) {
				// use yaml parse
				const { title, url, author, breakpoints = [], translate = true, adapter: adapterType = 'others' } = yaml.load(body) as IssueBody;
				const headers: Header[] = [];
				if (adapterType === 'others' && breakpoints.length) {
					headers.push({ startMark: breakpoints[0] }, { endMark: breakpoints[1] });
				}
				const collector = adapter[adapterType];
				if (collector && testPureURI.test(url)) {
					// crawl page
					const postHTML = await fetch(url, {
						headers: {
							...mockHeaders,
						},
					}).then((r) => r.text());
					if (postHTML.length) {
						const { blogContent, translate: adapterTranslate = true } = await collector(postHTML, postHTML, headers, env);
						const $github = new Octokit({
							auth: env.REPO_TOKEN,
						});
						const payload = {
							...$repo,
							issue_number: mainField.number,
						};
						const updateResponse = await $github.rest.issues.update({
							...payload,
							title,
							// re construct issue body
							body: `### The original blog info
| subject | content |
:- | :---------------------
title | ${title}
url | [blog url](${url})
author | ${author}
`,
						});
						if (updateResponse.status < 300) {
							// create content comment
							await $github.rest.issues.createComment({
								...payload,
								body: blogContent,
							});
							if (translate && adapterTranslate) {
								const translateContent = await md(blogContent, env);
								if (translateContent.length) {
									await $github.rest.issues.createComment({
										...payload,
										body: translateContent,
									});
								}
							}
						}
					}
				}
			}
		}
	}
}
