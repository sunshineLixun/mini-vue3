import { NOOP, isFunction } from '@vue/shared';
import { ReactiveEffect, activeEffect, trackEffects, triggerEffects } from './effect';
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
	// 收集当前的effect， 作用：当改变计算属性的值，也要触发effect依赖更新
	public dep: Dep = undefined;

	// 内部缓存计算过后的值
	private _value: T = undefined;

	// 标记当前是否被缓存过：如果是true，表明没有用过， 需要执行effect的run，false表明用过了，取_value缓存的值
	public _dirty = true;

	// 收集依赖
	public readonly effect: ReactiveEffect<T>;

	constructor(public getter: ComputedGetter<T>, private readonly _setter: ComputedSetter<T>) {
		// 这里的 ReactiveEffect第二个回调触发时机：当proxy对象属性触发了set
		// getter里面的响应式对象属性 收集当前内部的effect

		/**
		 * @example
		 * computed(() => {
		 * 		return state.name + state.name2
		 * })
		 *
		 * 这里的name 和 name2 都收集了 this.effect
		 * 此时的 weakMap结构如下： { target: Map{name: Set<this.effect>, name2: Set<this.effect>} }
		 */
		this.effect = new ReactiveEffect(getter, () => {
			// 这里说明有新的依赖值有变化，重置脏检查
			if (!this._dirty) {
				this._dirty = true;
				// 触发收集的effect
				triggerEffects(this.dep);
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
		if (activeEffect) {
			// 如果有activeEffect，说明这个计算属性在effect中使用，计算属性需要收集这个effect
			trackEffects(this.dep || (this.dep = new Set<ReactiveEffect>()));
		}

		// 如果是脏的，表明没有用过，需要执行effect获取新的值
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
	 * 对计算属性赋值，也会触发页面更新
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
		setter = getterOrOptions.set || NOOP;
		getter = getterOrOptions.get;
	}

	return new ComputedRefImpl(getter, setter);
}
