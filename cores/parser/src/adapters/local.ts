/**
 * @description worker not support fs mode, use locale server write file
 */
import type { FileInfo } from './github';

const localBaseURI = 'http://localhost:10856/create';

export async function local(file: FileInfo, env: Env) {
	try {
		await fetch(localBaseURI, {
			method: 'POST',
			body: JSON.stringify(file),
		});
	} catch (error) {
		console.log('create blog failed', error);
	}

	console.log('create blog success');
}
