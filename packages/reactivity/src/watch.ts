import { NOOP, isArray, isFunction, isObject, isPlainObject } from '@vue/shared';
import { ComputedRef } from './computed';
import { ReactiveEffect } from './effect';
import { isReactive } from './reactive';

export interface WatchOptions<Immediate = boolean> {
	immediate?: Immediate;
	deep?: boolean;
}

export type WatchEffect = (onCleanup: OnCleanup) => void;

// () => T： getter
// ComputedRef: 计算属性
// Ref<T> ref
// 响应式对象
export type WatchSource<T = any> = ComputedRef<T> | (() => T);

type OnCleanup = (cleanupFn: () => void) => void;

export type WatchCallback<V = any, OV = any> = (value: V, oldValue: OV, onCleanup?: OnCleanup) => any;

// watch 可以监听 ref、 computed、 reactive、getter
// 当监听整个响应式对象reactive时，会自动启用深层模式， 递归响应式对象，触发每个属性收集effect，所以不建议直接监听整个响应式对象，会有隐形的性能影响
// 推荐使用getter 方法 访问每个属性： watch(() => state.name, cb)
export function watch<T = any, Immediate extends Readonly<boolean> = false>(
	source: T | WatchSource<T>,
	cb: WatchCallback,
	options?: WatchOptions<Immediate>
) {
	doWatch(source as any, cb, options);
}

// TODO: 1：停止侦听器  2：副作用清理 3：监听数组结构
function doWatch(
	source: WatchSource | WatchSource[] | WatchEffect | object,
	cb: WatchCallback | null,
	{ immediate, deep }: WatchOptions = {}
) {
	let getter: () => any;
	if (isReactive(source)) {
		/**
		 * @example
		 * const state = reactive({name : 1})
		 * watch(state, val => {})
		 */
		// 递归遍历对象，依次取值，属性就会收集内部的effect
		getter = () => traverse(source);
		// 当直接侦听一个响应式对象时，侦听器会自动启用深层模式
		deep = true;
	} else if (isFunction(source)) {
		/**
		 * @example
		 * const state = reactive({name : 1})
		 * watch(() => state.name, val => {})
		 */
		// 直接取值
		getter = source as any;
	} else {
		getter = NOOP;
	}

	// 初始化undefined，第一次触发watch回调，oldValue 是没有的
	let oldValue = undefined;

	// scheduler
	const job = () => {
		if (!effect.active) {
			return;
		}
		if (cb) {
			// 执行getter方法，拿到最新的返回值
			const newValue = effect.run();
			// 传给watch回调
			cb(newValue, oldValue);
			// 更新老值
			oldValue = newValue;
		} else {
			// watchEffect
			effect.run();
		}
	};

	// getter 方法里面响应式对象属性收集了这个effect，当响应式对象属性发生set，就会触发这里的job方法，
	// job方法里面执行getter方法，拿到最新的值，然后将老值，新值抛出cb，用户就能拿到旧 新 值
	const effect = new ReactiveEffect(getter, job);

	if (cb) {
		if (immediate) {
			// 立即触发
			job();
		} else {
			// 如果用户没有写immediate，主动触发，
			// 这里程序要主动触发getter拿到老值，同时因为有属性访问，触发当前监听响应式对象属性依赖收集effect，当属性变化时，触发依赖effect更新, 拿到新值
			oldValue = effect.run();
		}
	} else {
		// watchEffect
		effect.run();
	}
}

export function traverse(value: unknown, seen?: Set<unknown>) {
	if (!isObject(value)) {
		return value;
	}
	seen = seen || new Set();
	if (seen.has(value)) {
		return value;
	}
	seen.add(value);
	if (isArray(value)) {
		for (let index = 0; index < value.length; index++) {
			traverse(value[index], seen);
		}
	} else if (isPlainObject(value)) {
		for (const key in value) {
			traverse(value[key], seen);
		}
	}
	return value;
}
