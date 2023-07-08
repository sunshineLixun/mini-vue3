import { hasChanged, isObject } from '@vue/shared';
import { Dep, createDep } from './dep';
import { activeEffect, trackEffects, triggerEffects } from './effect';
import { toRaw, toReactive } from './reactive';

export interface Ref<T = any> {
	dep: Dep;
	value: T;
}

export type MaybeRef<T = any> = T | Ref<T>;

export function unref<T>(ref: MaybeRef<T>): T {
	return isRef(ref) ? ref.value : ref;
}

export function isRef<T>(ref: Ref<T> | unknown): ref is Ref<T>;
export function isRef(ref: any): ref is Ref {
	return !!(ref && ref.__v_isRef === true);
}

export function ref(value: unknown) {
	return createRef(value, false);
}

export function shallowRef(value: unknown) {
	return createRef(value, true);
}

function createRef(value: unknown, shallow: boolean) {
	// ref(ref(true))
	// 如果本身就是ref, 返回其本身
	if (isRef(value)) {
		return value;
	}
	return new RefImpl(value, shallow);
}

class RefImpl<T> {
	public dep: Dep = undefined;

	// 内部缓存的值,用作get方法放回的值
	private _value: T = undefined;

	// 内部缓存的原始值，用作新 老值变化的比较
	private _rawValue: T = undefined;

	public readonly __v_isRef = true;
	constructor(value: T, public readonly __v_isShallow: boolean) {
		// 1：如果是shallow 保存原始值
		// 2：如果是ref, value有可能也是响应式对象, 会对其解包，变为普通对象
		this._rawValue = __v_isShallow ? value : toRaw(value);
		// 1：如果是shallow，保存原始值，
		// 2：如果是对象，转化成reactive对象，如果不是对象，返回其原始值
		// 3：支持下面两种：ref(基本数据类型)、ref({})、ref(reactive({}))
		this._value = __v_isShallow ? value : toReactive(value);
	}

	get value() {
		// 依赖收集
		trackRefValue(this);
		return this._value;
	}

	set value(newValue) {
		/**
		 * 1: shallowRef对比的是原始值，因为_vawValue _value保存的都是原始值
		 * @example
		 * 	const obj = {}
		 *  const sRef = shallowRef(obj)
		 *  sRef.value === obj  // true
		 *
		 * 	sRef.value = {a: 1}
		 *
		 * 	对比的是原始值： {a: 1} === {}
		 *
		 *  所以shallowRef想要监听其变化，必须要更改整个对象 sRef.value = new Object
		 */

		/**
		 * 2: ref.value = xxx
		 */

		// 有可能外部传入响应式对象 newValue = reactive、 ref
		// 现对其结构成原始值
		newValue = this.__v_isShallow ? newValue : toRaw(newValue);
		if (hasChanged(newValue, this._rawValue)) {
			this._rawValue = newValue;
			this._value = this.__v_isShallow ? newValue : toReactive(newValue);
			// 触发更新
			triggerRefValue(this);
		}
	}
}

// 收集依赖
export function trackRefValue(ref: Ref<any>) {
	// 如果是在effect中访问
	if (activeEffect) {
		trackEffects(ref.dep || (ref.dep = createDep()));
	}
}

// 触发依赖更新
export function triggerRefValue(ref: Ref<any>) {
	const dep = ref.dep;
	if (dep) {
		triggerEffects(dep);
	}
}

export function toRef(source: Record<string, any> | MaybeRef, key?: string) {
	if (isRef(source)) {
		return source;
	} else if (isObject(source)) {
		return propertyToRef(source, key);
	} else {
		// 包装成 ref
		return ref(source);
	}
}

function propertyToRef(source: Record<string, any> | MaybeRef, key?: string) {
	const value = source[key];
	return isRef(value) ? value : new ObjectRefImpl(source, key);
}

class ObjectRefImpl<T extends object, K extends keyof T> {
	public readonly __v_isRef = true;
	constructor(private readonly _object: T, private readonly _key: K) {}

	// ref.value
	get value() {
		return this._object[this._key];
	}

	set value(newValue) {
		this._object[this._key] = newValue;
	}
}
