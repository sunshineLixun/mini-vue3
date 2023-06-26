import { track } from './effect';
import { ReactiveFlags } from './reactive';

export const mutableHandlers: ProxyHandler<object> = {
	set(target, key, newValue, receiver) {
		// Reflect反射 处理了this指向问题
		return Reflect.set(target, key, newValue, receiver);
	},
	get(target, key, receiver) {
		if (key === ReactiveFlags.IS_REACTIVE) {
			// 这里表明target是代理对象
			return true;
		}

		track(target, key);

		return Reflect.get(target, key, receiver);
	}
};
