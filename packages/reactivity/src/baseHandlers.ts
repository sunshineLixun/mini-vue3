import { hasChanged, isObject } from '@vue/shared';
import { track, trigger } from './effect';
import { ReactiveFlags, reactive, readonly, readonlyMap, reactiveMap, shallowReactiveMap } from './reactive';
import { isRef } from './ref';

const set = createSetter();
function createSetter() {
	return function set(target: object, key: string | symbol, value: unknown, receiver: object) {
		const oldValue = target[key];
		// Reflect反射 处理了this指向问题
		const result = Reflect.set(target, key, value, receiver);

		// 新值老值不相等，触发依赖更新
		if (hasChanged(value, oldValue)) {
			// 触发更新
			trigger(target, key);
		}

		return result;
	};
}
const get = createGetter(false, false);

const readonlyGet = createGetter(true, false);

const shallowReactiveGet = createGetter(false, true);

function createGetter(isReadonly = false, shallow = false) {
	return function get(target: object, key: string | symbol, receiver: object) {
		if (key === ReactiveFlags.IS_REACTIVE) {
			// 这里表明target是代理对象
			return !isReadonly;
		} else if (key === ReactiveFlags.IS_READONLY) {
			return isReadonly;
		} else if (
			key === ReactiveFlags.RAW &&
			receiver === (isReadonly ? readonlyMap : shallow ? shallowReactiveMap : reactiveMap).get(target)
		) {
			// 如果是代理对象 再被代理，就返回代理对象
			return target;
		}

		const res = Reflect.get(target, key, receiver);

		// readonly 不收集依赖
		if (!isReadonly) {
			// 依赖收集
			debugger;
			track(target, key);
		}

		if (shallow) {
			// shallow不做深层次代理
			return res;
		}

		if (isRef(res)) {
			// 如果value是Ref类型， 解包 Ref
			return res.value;
		}

		// 处理深层次响应式对象，如果返回值是对象，需要再对 对象 做一次代理
		if (isObject(res)) {
			return isReadonly ? readonly(res) : reactive(res);
		}

		return res;
	};
}

export const mutableHandlers: ProxyHandler<object> = {
	set,
	get
};

export const shallowReactiveHandlers: ProxyHandler<object> = {
	set,
	get: shallowReactiveGet
};

export const readonlyHandlers: ProxyHandler<object> = {
	// 只读属性不能被set
	set(target, key) {
		console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
		return true;
	},
	// 只读属性不能被删除
	deleteProperty(target, key) {
		console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
		return true;
	},
	get: readonlyGet
};
