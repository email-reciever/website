export const fwPrefix = '[fw>';
export const regexp = /^\[fw>(\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*)\]-/;

export function forward(subject: string) {
	if (subject.startsWith(fwPrefix)) {
		const matchInfo = subject.match(regexp);
		if (matchInfo?.[1]) {
			const [prefixString, sender] = matchInfo;
			return {
				sender,
				subject: subject.replace(prefixString, ''),
			};
		}
	}
}
