import { EMPTY_OBJ, NOOP, extend, hasOwn, isFunction } from '@vue/shared';
import { ComponentRenderContext } from './components';
import { ComponentInternalInstance } from './componentRenderUtils';

const enum AccessTypes {
	OTHER,
	SETUP,
	DATA,
	PROPS,
	CONTEXT
}

export type PublicPropertiesMap = Record<string, (i: ComponentInternalInstance) => any>;

export const publicPropertiesMap = /*#__PURE__*/ extend(Object.create(null), {
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
	// $forceUpdate: i => i.f || (i.f = () => queueJob(i.update)),
	// $nextTick: i => i.n || (i.n = nextTick.bind(i.proxy!)),
	$watch: () => NOOP
} as PublicPropertiesMap);

export const PublicInstanceProxyHandlers: ProxyHandler<any> = {
	get({ _: instance }: ComponentRenderContext, key: string) {
		const { accessCache, data, props } = instance;

		if (key[0] !== '$') {
			// 获取data函数中的值
			if (data !== EMPTY_OBJ && hasOwn(data, key)) {
				// 缓存
				accessCache[key] = AccessTypes.DATA;
				return data[key];
			} else if (props !== EMPTY_OBJ && hasOwn(props, key)) {
				return props[key];
			}
		}

		// 通过$符号访问属性
		// $data $props $slots ...
		const publicGetter = publicPropertiesMap[key];
		if (publicGetter) {
			return publicGetter(instance);
		}
	},
	set({ _: instance }: ComponentRenderContext, key: string, newValue) {
		const { data, props } = instance;

		if (data !== EMPTY_OBJ && hasOwn(data, key)) {
			data[key] = newValue;
			return true;
		} else if (hasOwn(props, key)) {
			console.warn('props is readonly');
			return false;
		}

		return true;
	}
};
