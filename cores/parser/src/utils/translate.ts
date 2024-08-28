// auto proxy with free-proxy
import { logger } from './logger';

export async function translate(content: string, env: Env) {
	try {
		const response = await fetch(`${env.TR_SERVE}/translate`, {
			method: 'POST',
			body: JSON.stringify({
				content,
			}),
		}).then((response) => response.json() as Promise<{ translateContent: string }>);
		return response?.translateContent;
	} catch (e) {
		logger(env, 'translate error', e);
	}

	return content;
}
