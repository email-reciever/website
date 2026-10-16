/**
 * @description write markdown file to github repo
 */

import { ORGNAME, REPONAME } from "@email.reciever/consts/github";
import { Octokit } from "@octokit/rest";
import { decode, encode } from "js-base64";
import { logger } from "../utils/logger";

export type FileInfo = {
  path: string;
  content: string;
  sha?: string;
};

export const $repo = {
  owner: ORGNAME,
  repo: REPONAME,
};

export const repoURI = `https://github.com/${ORGNAME}/${REPONAME}`;

export async function githubRead(fileName: string, env: Env) {
  const $github = new Octokit({
    auth: env.REPO_TOKEN,
  });

  // update or create blog
  const { status, data } = await $github.rest.repos.getContent({
    ...$repo,
    path: fileName,
  });

  if (status < 300) {
    logger(env, "fetch metadata success", fileName);
    const { content, sha } = data as any;
    return { content: content.length ? decode(content) : undefined, sha };
  }
}

export async function github(file: FileInfo, env: Env) {
  const $github = new Octokit({
    auth: env.REPO_TOKEN,
  });

  // use file name for create message
  const message = `chore(blog): ${file.path}`;
  // base64 content
  const content = encode(file.content);
  // update or create blog
  const { status, data } = await $github.rest.repos.createOrUpdateFileContents({
    ...$repo,
    ...file,
    content,
    message,
  });

  if (status < 300) {
    logger(env, "create or update file success", file.path);
    // return the new blob sha so consecutive updates can chain it
    return { sha: (data as { content?: { sha?: string } }).content?.sha };
  }
}
