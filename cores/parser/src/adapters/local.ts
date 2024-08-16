/**
 * @description worker not support fs mode, use locale server write file
 */
import type { FileInfo } from './github';

const localBaseURI = 'http://localhost:10856';

export async function localRead(fileName: string, env: Env) {
	try {
		return await fetch(`${localBaseURI}/read`, {
			method: 'POST',
			body: JSON.stringify({ fileName }),
		}).then((response) => response.json());
	} catch (error) {
		console.log('create blog failed', error);
	}

	console.log('create blog success');
}

export async function local(file: FileInfo, env: Env) {
	try {
		await fetch(`${localBaseURI}/create`, {
			method: 'POST',
			body: JSON.stringify(file),
		});
	} catch (error) {
		console.log('create blog failed', error);
	}

	console.log('create blog success');
}
