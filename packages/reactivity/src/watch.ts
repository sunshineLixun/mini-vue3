import { NOOP, isArray, isFunction, isMap, isObject, isPlainObject, isSet } from '@vue/shared';
import { ComputedRef } from './computed';
import { ReactiveEffect } from './effect';
import { isReactive } from './reactive';
import { Ref, isRef } from './ref';
import { callWithErrorHandling } from 'packages/runtime-core/src/errorHandling';

const INITIAL_WATCHER_VALUE = {};

export interface WatchOptions<Immediate = boolean> {
	immediate?: Immediate;
	deep?: boolean;
}

export type WatchEffect = (onCleanup: OnCleanup) => void;

// () => T： getter
// ComputedRef: 计算属性
// Ref<T> ref
// 响应式对象
export type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T);

// cleanupFn 用户执行的回调
type OnCleanup = (cleanupFn: () => void) => void;

export type WatchCallback<V = any, OV = any> = (value: V, oldValue: OV, onCleanup?: OnCleanup) => any;

export function watchEffect(effect: WatchEffect, options?: WatchOptions) {
	doWatch(effect, null, options);
}

// watch 可以监听 ref、 computed、 reactive、getter
// 当监听整个响应式对象reactive时，会自动启用深层模式， 递归响应式对象，触发每个属性收集effect，所以不建议直接监听整个响应式对象，会有隐形的性能影响
// 推荐使用getter 方法 访问每个属性： watch(() => state.name, cb)
export function watch<T = any, Immediate extends Readonly<boolean> = false>(
	source: T | WatchSource<T>,
	cb: WatchCallback,
	options?: WatchOptions<Immediate>
) {
	return doWatch(source as any, cb, options);
}

function doWatch(
	source: WatchSource | WatchSource[] | WatchEffect | object,
	cb: WatchCallback | null,
	{ immediate, deep }: WatchOptions = {}
) {
	let getter: () => any;

	if (isRef(source)) {
		// 如果是ref，触发属性value收集依赖
		getter = () => source.value;
	} else if (isReactive(source)) {
		/**
		 * @example
		 * const state = reactive({name : 1})
		 * watch(state, val => {})
		 */
		// 递归遍历对象，依次取值，属性就会收集内部的effect
		getter = () => source;
		deep = true;
	} else if (isArray(source)) {
		getter = () =>
			source.map((s: any) => {
				if (isRef(s)) {
					return s.value;
				} else if (isReactive(s)) {
					return traverse(s);
				} else if (isFunction(s)) {
					return callWithErrorHandling(s);
				}
			});
	} else if (isFunction(source)) {
		// watch cb
		if (cb) {
			/**
			 * @example
			 * const state = reactive({name : 1})
			 * watch(() => state.name, val => {})
			 */
			// 直接赋值
			getter = source as any;
		} else {
			/**
			 * @example
			 * watchEffect(onCleanup => {
						onCleanup(() => {});
						console.log('watchEffect', state.name);
					});
			 */

			// 执行watchEffect的传入的函数，有2个功能：
			// 1：属性收集effect，下次proxy属性变化时，触发依赖更新，执行自定义的scheduler
			// 2：拿到用户onCleanup的回调，在下次执行时，调用 用户的onCleanup回调
			getter = () => {
				if (cleanup) {
					cleanup();
				}
				return source(onCleanup);
			};
		}
	} else {
		getter = NOOP;
	}

	// 当直接侦听一个响应式对象时，侦听器会自动启用深层模式，对响应式对象每个属性
	if (cb && deep) {
		getter = () => traverse(source);
	}

	// 初始化undefined，第一次触发watch回调，oldValue 是没有的
	let oldValue = INITIAL_WATCHER_VALUE;

	// 暂存用户传入进去的OnCleanup回调函数
	// 在下一次执行watch的回调时，执行一遍cleanup
	let cleanup: () => void;
	const onCleanup: OnCleanup = (fn: () => void) => {
		// 执行cleanup操作也要执行stop
		cleanup = effect.stop = () => {
			fn();
		};
	};

	// 自定义 scheduler，可以控制触发依赖更新时机
	const job = () => {
		if (!effect.active) {
			return;
		}
		if (cb) {
			// 执行getter方法，拿到最新的返回值
			const newValue = effect.run();

			if (cleanup) {
				cleanup();
			}

			// 传给watch回调
			cb(newValue, oldValue, onCleanup);
			// 更新老值
			oldValue = newValue;
		} else {
			// watchEffect
			effect.run();
		}
	};

	// getter 方法里面响应式对象属性收集了这个effect，当响应式对象属性发生set，就会触发这里的job方法，
	// job方法里面执行getter方法，拿到最新的值，然后将老值，新值抛出cb，用户就能拿到旧 新 值

	// watch是 effect + 自定义scheduler, scheduler回调控制cb回传数值
	// watchEffect 就是effect，当数据变化时，直接触发回调更新

	// TODO: queueJob
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
		// watchEffect 默认执行一次
		effect.run();
	}

	// 停止侦听器
	return () => effect.stop();
}

export function traverse(value: unknown, seen?: Set<unknown>) {
	// reactive对象里面可以有如下值：array, set、map、普通对象，所以要分别处理

	if (!isObject(value)) {
		return value;
	}
	seen = seen || new Set();
	if (seen.has(value)) {
		return value;
	}
	seen.add(value);
	if (isRef(value)) {
		traverse(value.value, seen);
	} else if (isMap(value) || isSet(value)) {
		value.forEach((val: any) => {
			traverse(val, seen);
		});
	} else if (isArray(value)) {
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
