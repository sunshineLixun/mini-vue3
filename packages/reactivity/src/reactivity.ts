import { isObject } from '@vue/shared';

export function reactive(target: object) {
	if (!isObject(target)) {
		return target;
	}

	const proxy = new Proxy(target, {
		set(target, key, newValue, receiver) {
			return Reflect.set(target, key, newValue, receiver);
		},
		get(target, key, receiver) {
			return Reflect.get(target, key, receiver);
		}
	});

	return proxy;
}
