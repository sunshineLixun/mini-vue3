import { EMPTY_OBJ, NOOP, extend, hasOwn } from '@vue/shared';
import { track } from '@vue/reactivity';
import { ComponentInternalInstance } from './componentRenderUtils';
import { nextTick, queueJob } from './scheduler';

const enum AccessTypes {
	OTHER,
	SETUP,
	DATA,
	PROPS,
	CONTEXT
}

export type PublicPropertiesMap = Record<string, (i: ComponentInternalInstance) => any>;

export const publicPropertiesMap = extend(Object.create(null), {
	// 列举几个常用的的 属性
	$: i => i,
	$el: i => i.vnode.el,
	$data: i => i.data,
	$props: i => i.props,
	$attrs: i => i.attrs,
	$slots: i => i.slots,
	$refs: i => i.refs,
	$emit: i => i.emit,

	$options: i => i.type,
	$forceUpdate: i => queueJob(i.update),
	$nextTick: i => nextTick.bind(i.proxy),
	$watch: () => NOOP
} as PublicPropertiesMap);

export const PublicInstanceProxyHandlers: ProxyHandler<any> = {
	get(instance: ComponentInternalInstance, key: string) {
		const { accessCache, data, props, setupState } = instance;

		if (key[0] !== '$') {
			// 获取data函数中的值
			if (data !== EMPTY_OBJ && hasOwn(data, key)) {
				accessCache[key] = AccessTypes.DATA;
				return data[key];
			} else if (props !== EMPTY_OBJ && hasOwn(props, key)) {
				return props[key];
			} else if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
				return setupState[key];
			}
		}

		// 通过$符号访问属性
		// $data $props $slots ...
		const publicGetter = publicPropertiesMap[key];
		if (publicGetter) {
			if (key === '$attrs') {
				// 触发收集$attrs
				track(instance, key);
			}
			return publicGetter(instance);
		}
	},
	set(instance: ComponentInternalInstance, key: string, newValue) {
		const { data, props, setupState } = instance;

		if (data !== EMPTY_OBJ && hasOwn(data, key)) {
			data[key] = newValue;
			return true;
		} else if (hasOwn(props, key)) {
			console.warn('props is readonly');
			return false;
		} else if (hasOwn(setupState, key)) {
			setupState[key] = newValue;
			return true;
		}
	}
};
