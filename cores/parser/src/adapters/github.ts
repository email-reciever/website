/**
 * @description write markdown file to github repo
 */
import { Octokit } from '@octokit/rest';
import { ORGNAME, REPONAME } from '@email.reciever/consts/github';

export type FileInfo = {
	path: string;
	content: string;
};

export const $repo = {
	owner: ORGNAME,
	repo: REPONAME,
};

export const repoURI = `https://github.com/${ORGNAME}/${REPONAME}`;

export async function github(file: FileInfo, env: Env) {
	const $github = new Octokit({
		auth: env.REPO_TOKEN,
	});

	// use file name for create message
	const message = `chore(blog): ${file.path}`;
	// base64 content
	const content = btoa(file.content);
	// update or create blog
	const { status } = await $github.rest.repos.createOrUpdateFileContents({
		...$repo,
		...file,
		content,
		message,
	});

	if (status < 300) {
		console.log('create blog success');
	}
}
