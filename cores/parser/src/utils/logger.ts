export function logger(env: Env, ...args: any[]) {
	const key = `[logger - ${Date.now()}]`;
	console.log(key, ...args);
	return env.LOGGER.put(key, JSON.stringify(args));
}
