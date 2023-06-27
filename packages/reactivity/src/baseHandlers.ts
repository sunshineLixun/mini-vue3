import { track, trigger } from './effect';
import { ReactiveFlags } from './reactive';

export const mutableHandlers: ProxyHandler<object> = {
	set(target, key, newValue, receiver) {
		const oldValue = target[key];
		// Reflect反射 处理了this指向问题
		const result = Reflect.set(target, key, newValue, receiver);

		// 新值老值不相等，触发依赖更新
		if (oldValue !== newValue) {
			trigger(target, key, newValue, oldValue);
		}

		return result;
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
