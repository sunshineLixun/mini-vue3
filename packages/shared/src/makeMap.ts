export function makeMap(str: string): (key: string) => boolean {
	const map: Record<string, boolean> = Object.create(null);
	const strs = str.split(',');
	for (let i = 0; i < strs.length; i++) {
		map[strs[i]] = true;
	}
	return val => !!map[val];
}
