import { NOOP, isFunction } from '@vue/shared';
import { ReactiveEffect } from './effect';
import { Dep } from './dep';

export interface ComputedRef<T = any> extends WritableComputedRef<T> {
	readonly value: T;
}

export interface WritableComputedRef<T> {
	readonly effect: ReactiveEffect<T>;
}

export interface WritableComputedOptions<T> {
	get: ComputedGetter<T>;
	set: ComputedSetter<T>;
}

export type ComputedGetter<T> = (...args: any[]) => T;
export type ComputedSetter<T> = (v: T) => void;

class ComputedRefImpl<T> {
	// 收集当前的effect
	public dep: Dep = undefined;

	// 内部缓存计算过后的值
	private _value: T = undefined;

	// 标记当前是否被缓存过：如果是true，表明没有用过， 需要执行effect的run，false表明用过了，取_value缓存的值
	public _dirty = true;

	// 收集依赖
	public readonly effect: ReactiveEffect<T>;

	constructor(public getter: ComputedGetter<T>, private readonly _setter: ComputedSetter<T>) {
		this.effect = new ReactiveEffect(getter, () => {
			if (!this._dirty) {
				this._dirty = true;
			}
		});
	}

	// 对计算属性取值
	/**
	 * @example
	 * ```js
	 * const fullName = computed(() => state.firstName + state.secoedName)
	 * ```
	 *
	 * ```html
	 * <template>{{fullName}}</template>
	 * ```
	 */
	get value() {
		// 如果是脏的，表明没有用过，需要执行effect获取新的值
		// TODO:收集依赖
		if (this._dirty) {
			// 标记为用过
			this._dirty = false;
			this._value = this.effect.run();
		}
		// 读取缓存的值
		return this._value;
	}

	/**
	 * @example
	 * ```js
	 * const fullName = computed(() => state.firstName + state.secoedName)
	 * fullName.value = 'mini vue3'
	 * ```
	 */
	set value(newValue: T) {
		this._setter(newValue);
	}
}

export function computed<T>(getter: ComputedGetter<T>): ComputedRef<T>;
export function computed<T>(options: WritableComputedOptions<T>): WritableComputedRef<T>;
export function computed<T>(getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>) {
	let setter: ComputedSetter<T>;
	let getter: ComputedGetter<T>;

	const onlyGetter = isFunction(getterOrOptions);
	if (onlyGetter) {
		getter = getterOrOptions;
		setter = NOOP;
	} else {
		setter = getterOrOptions.set;
		getter = getterOrOptions.get;
	}

	return new ComputedRefImpl(getter, setter);
}
