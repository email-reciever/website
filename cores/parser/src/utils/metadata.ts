import { local, localRead } from '../adapters/local';
import { FileInfo, github, githubRead } from '../adapters/github';
import type { SenderType } from '../types';

export const metadataFileSuffix = 'metadata.json';

export async function getMetaData<R extends Record<string, any>>(key: SenderType, env: Env) {
	let response;
	const fileName = `${key}.${metadataFileSuffix}`;
	if (env.ENV === 'dev') {
		response = await localRead(fileName, env);
	} else {
		response = await githubRead(fileName, env);
	}

	const { content = '{}', sha } = response ?? ({} as any);
	const safeContent = content?.replace?.(/\\r\\n$/, '');
	return {
		content: JSON.parse(safeContent) as R,
		sha,
	};
}

export async function setMetaData<R extends Record<string, any>>(key: SenderType, content: R, env: Env, sha?: string) {
	const fileName = `${key}.${metadataFileSuffix}`;
	const payload: FileInfo = {
		content: JSON.stringify(content),
		path: fileName,
	};

	if (sha) {
		payload.sha = sha;
	}

	if (env.ENV === 'dev') {
		await local(payload, env);
	} else {
		await github(payload, env);
	}
}
