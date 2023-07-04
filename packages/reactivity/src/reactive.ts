import { isObject } from '@vue/shared';
import { mutableHandlers } from './baseHandlers';

export const enum ReactiveFlags {
	SKIP = '__v_skip',
	IS_REACTIVE = '__v_isReactive',
	IS_READONLY = '__v_isReadonly',
	IS_SHALLOW = '__v_isShallow',
	RAW = '__v_raw'
}

export interface Target {
	[ReactiveFlags.SKIP]?: boolean;
	[ReactiveFlags.IS_REACTIVE]?: boolean;
	[ReactiveFlags.IS_READONLY]?: boolean;
	[ReactiveFlags.IS_SHALLOW]?: boolean;
	[ReactiveFlags.RAW]?: any;
}

export const reactiveMap = new WeakMap<Target, any>();

export const isReactive = (value: unknown) => {
	return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE]);
};

export function reactive(target: object) {
	if (!isObject(target)) {
		return target;
	}

	// 判断对象是否被代理过，如果是，返回代理对象
	/** 场景：
	 *  const obj = {a: 1}
	 * 	const state = reactive(obj);
			const state2 = reactive(obj);
			state === state2  true
	 */
	const existingProxy = reactiveMap.get(target);
	if (existingProxy) {
		return existingProxy;
	}

	// 如果代理对象再包装成reactive，这里取值会触发 proxy get方法
	/** 场景：
	 *  const obj = {a: 1}
	 * 	const state = reactive(obj);
			const state2 = reactive(state);
			state === state2  true
	 */
	if (target[ReactiveFlags.IS_REACTIVE]) {
		return target;
	}

	const proxy = new Proxy(target, mutableHandlers);

	// 缓存代理对象
	reactiveMap.set(target, proxy);
	return proxy;
}
