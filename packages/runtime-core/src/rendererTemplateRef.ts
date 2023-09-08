import { ShapeFlags, isArray } from '@vue/shared';
import { isRef } from '@vue/reactivity';
import { VNode, VNodeRef } from './vnode';
import { getExposeProxy } from './component';
import { queueJob } from './scheduler';

export function setRef(rawRef: VNodeRef | VNodeRef[], oldRawRef: VNodeRef | VNodeRef[], vnode: VNode) {
	if (isArray(rawRef)) {
		rawRef.forEach((r, i) => setRef(r, oldRawRef && (isArray(oldRawRef) ? oldRawRef[i] : oldRawRef), vnode));
		return;
	}

	// 1: 如果组件执行了expose函数，此时的ref就是expose的代理对象
	// 2: 如果组件没有执行expose函数，那么也可拿到组件实例，proxy对象就是对组件实例的代理
	const value =
		vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
			? getExposeProxy(vnode.component) || vnode.component.proxy
			: vnode.el;

	const _isRef = isRef(rawRef);

	const doSet = () => {
		if (_isRef) {
			// 处理通过ref 属性 拿到子组件的实例引用
			rawRef.value = value;
		}
	};

	if (value) {
		queueJob(doSet);
	}
}
