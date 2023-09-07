import { Data, VNodeChild, VNodeNormalizedChildren, normalizeVNode } from './vnode';
import { ComponentInternalInstance } from './componentRenderUtils';
import { ShapeFlags, isArray, isFunction } from '@vue/shared';

const normalizeSlotValue = (value: unknown) =>
	// children必须是一个数组 跟h函数是一个道理
	isArray(value) ? value.map(normalizeVNode) : [normalizeVNode(value as VNodeChild)];

const normalizeObjectSlots = (children: any, slots: Data) => {
	for (const key in children) {
		const value = children[key];
		if (isFunction(value)) {
			// 插槽返回的是一个函数
			// e.g. default: () => h('div')
			// TODO: slots函数的参数处理 ...args
			const result = value();
			// TODO: withCtx
			slots[key] = () => normalizeSlotValue(result);
		} else if (value !== null) {
			// 函数返回的是某个值， 而不是vnode
			// 比如用户可以这么传： h(Component, null, { default: '111' })
			// 会被处理成: h(Component, null, { default: () => vnode })
			// 这里处理就能保证用户 调用 slots[key] 始终都是有值的，并且还是个函数
			// 但Vue不推荐这么写，实际会给出一个Warn，为了性能考虑，更推荐使用 functional
			slots[key] = () => normalizeSlotValue(value);
		}
	}
};

const normalizeVNodeSlots = (instance: ComponentInternalInstance, children: VNodeNormalizedChildren) => {
	const normalized = normalizeSlotValue(children);
	instance.slots.default = () => normalized;
};

export function initSlots(instance: ComponentInternalInstance, children: VNodeNormalizedChildren) {
	if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
		normalizeObjectSlots(children, instance.slots);
	} else {
		instance.slots = {};
		if (children) {
			// 如果不是child不是对象类型，但是有值，需要给slot默认一个default函数，该函数返回值是对children 转化为vnode
			// 比如： 用户可以这么传： h(Component, null, '111')
			// 会被处理成  h(Component, null, { default: () => vnode )})
			// 这里处理就能保证用户 调用 slots.default 始终都是有值的，并且还是个函数

			// 但Vue不推荐这么写，实际会给出一个Warn，为了性能考虑，更推荐使用 functional
			normalizeVNodeSlots(instance, children);
		}
	}
}

export function updateSlots(instance: ComponentInternalInstance, children: VNodeNormalizedChildren) {
	if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
		normalizeObjectSlots(children, instance.slots);
	} else if (children) {
		normalizeVNodeSlots(instance, children);
	}
}
