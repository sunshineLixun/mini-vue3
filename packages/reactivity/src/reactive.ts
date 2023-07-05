import { isObject } from '@vue/shared';
import { mutableHandlers, readonlyHandlers } from './baseHandlers';

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
export const readonlyMap = new WeakMap<Target, any>();

export const isReadonly = (value: unknown) => {
	// 属性访问 触发 readonlyHandlers.get 方法，其内部判断了key === ReactiveFlags.IS_READONLY
	return !!(value && (value as Target)[ReactiveFlags.IS_READONLY]);
};

export const isReactive = (value: unknown) => {
	if (isReadonly(value)) {
		return isReactive((value as Target)[ReactiveFlags.RAW]);
	}
	return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE]);
};

export function isProxy(value: unknown) {
	return isReadonly(value) || isReactive(value);
}

// 第一次执行 observed是响应式对象，访问ReactiveFlags.RAW触发proxy set方法，
// 触发proxy set方法返回readonlyMap 或者 reactiveMap保存的源对象，
// 第二次执行，源对象中没有ReactiveFlags.RAW属性，直接返回源对象
export function toRaw<T>(observed: T): T {
	const raw = observed && (observed as Target)[ReactiveFlags.RAW];
	return raw ? toRaw(raw) : observed;
}

export function readonly(target: object) {
	return createReactiveObject(target, true, readonlyHandlers, readonlyMap);
}

export function reactive(target: object) {
	if (!isObject(target)) {
		return target;
	}

	/**
	 * @example
	 * const state = reactive({})
	 * const readonlyS = readonly(state)
	 * 如果是readonly返回的响应式对象，返回其本身
	 */
	if (isReadonly(target)) {
		return target;
	}

	return createReactiveObject(target, false, mutableHandlers, reactiveMap);
}

export function createReactiveObject(
	target: Target,
	isReadonly: boolean,
	baseHandlers: ProxyHandler<any>,
	proxyMap: WeakMap<Target, any>
) {
	// 判断对象是否被代理过，如果是，返回代理对象
	/** 场景：
	 *  const obj = {a: 1}
	 * 	const state = reactive(obj);
			const state2 = reactive(obj);
			state === state2  true
	 */
	const existingProxy = proxyMap.get(target);
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

	// 排除 readonly(), readonly 包装的是proxy对象，不能返回已被代理对象，要返回新的代理对象，拦截set,delete,get方法
	if (target[ReactiveFlags.IS_REACTIVE] && !isReadonly) {
		return target;
	}

	const proxy = new Proxy(target, baseHandlers);

	// 缓存代理对象
	proxyMap.set(target, proxy);
	return proxy;
}
