import { hasChanged, isObject } from '@vue/shared';
import { track, trigger } from './effect';
import { ReactiveFlags, reactive } from './reactive';

export const mutableHandlers: ProxyHandler<object> = {
	set(target, key, newValue, receiver) {
		const oldValue = target[key];
		// Reflect反射 处理了this指向问题
		const result = Reflect.set(target, key, newValue, receiver);

		// 新值老值不相等，触发依赖更新
		if (hasChanged(newValue, oldValue)) {
			// 触发更新
			trigger(target, key, newValue, oldValue);
		}

		return result;
	},
	get(target, key, receiver) {
		if (key === ReactiveFlags.IS_REACTIVE) {
			// 这里表明target是代理对象
			return true;
		}

		// 依赖收集
		track(target, key);

		const res = Reflect.get(target, key, receiver);

		// 处理深层次响应式对象，如果返回值是对象，需要再对 对象 做一次代理
		if (isObject(res)) {
			return reactive(res);
		}

		return res;
	}
};
