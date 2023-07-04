import { hasChanged, isObject } from '@vue/shared';
import { track, trigger } from './effect';
import { ReactiveFlags, reactive, readonly } from './reactive';

const set = createSetter();
function createSetter() {
	return function set(target: object, key: string | symbol, value: unknown, receiver: object) {
		const oldValue = target[key];
		// Reflect反射 处理了this指向问题
		const result = Reflect.set(target, key, value, receiver);

		// 新值老值不相等，触发依赖更新
		if (hasChanged(value, oldValue)) {
			// 触发更新
			trigger(target, key, value, oldValue);
		}

		return result;
	};
}
const get = createGetter(false);

const readonlyGet = createGetter(true);

function createGetter(isReadonly = false) {
	return function get(target: object, key: string | symbol, receiver: object) {
		if (key === ReactiveFlags.IS_REACTIVE) {
			// 这里表明target是代理对象
			return !isReadonly;
		} else if (key === ReactiveFlags.IS_READONLY) {
			return isReadonly;
		}

		// readonly 不收集依赖
		if (!isReadonly) {
			// 依赖收集
			track(target, key);
		}

		const res = Reflect.get(target, key, receiver);

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
