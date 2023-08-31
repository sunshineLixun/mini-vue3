// 咱用any顶一下

import { EMPTY_OBJ, NOOP, ShapeFlags, isFunction, isObject } from '@vue/shared';
import { ComponentInternalInstance, InternalRenderFunction } from './componentRenderUtils';
import { VNode } from './vnode';
import { callWithErrorHandling } from './errorHandling';
import { PublicInstanceProxyHandlers } from './componentPublicInstance';
import { proxyRefs, shallowReactive } from '@vue/reactivity';

export type Component = any;

// 自增的组件标识符
let uid = 0;

// 创建组价实例
export function createComponentInstance(
	vnode: VNode,
	parent: ComponentInternalInstance | null
): ComponentInternalInstance {
	const instance: ComponentInternalInstance = {
		vnode,
		parent,
		root: null,
		type: vnode.type,
		uid: uid++,

		data: EMPTY_OBJ,
		props: EMPTY_OBJ,
		attrs: EMPTY_OBJ,
		slots: EMPTY_OBJ,
		refs: EMPTY_OBJ,

		setupState: EMPTY_OBJ,

		// ctx: EMPTY_OBJ,

		accessCache: EMPTY_OBJ,

		emit: null,

		proxy: null,
		update: null,

		render: null,

		subTree: null,

		effect: null,

		isMounted: false
	};

	instance.root = parent ? parent.root : instance;

	return instance;
}

export function isStatefulComponent(instance: ComponentInternalInstance) {
	return instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT;
}

export function setupComponent(instance: ComponentInternalInstance) {
	//TODO: props slots

	const isStateful = isStatefulComponent(instance);

	const setupResult = isStateful ? setupStatefulComponent(instance) : null;
	return setupResult;
}

export function setupStatefulComponent(instance: ComponentInternalInstance) {
	const Component = instance.type;
	// vue3 setup
	const { setup } = Component;

	instance.proxy = new Proxy(instance, PublicInstanceProxyHandlers);

	if (setup) {
		const setupResult = callWithErrorHandling(setup);

		handleSetupResult(instance, setupResult);

		// 先不考虑async setup
	} else {
		if (Component.data && isFunction(Component.data)) {
			// 简易的支持下vue2写法
			// data() { return {} }
			instance.data = shallowReactive(Component.data.call(instance.proxy));
		}

		finishComponentSetup(instance);
	}
}

// 处理setup 返回的值
export function handleSetupResult(instance: ComponentInternalInstance, setupResult: unknown) {
	if (isFunction(setupResult)) {
		// setup可以返回一个h函数
		/**
		 * const Com = {
		 * 	setup() {
		 * 		return () => h('div')
		 * 	}
		 * }
		 */
		instance.render = setupResult as InternalRenderFunction;
	} else if (isObject(setupResult)) {
		// setup函数也返回的是普通对象 {}
		/**
		 * setup() {
		 * 	const count = ref(0)
		 * 	return {
		 * 		count
		 * 	}
		 * }
		 */
		instance.setupState = proxyRefs(setupResult);
	}
	finishComponentSetup(instance);
}

// 专门处理render
export function finishComponentSetup(instance: ComponentInternalInstance) {
	// 处理render
	if (!instance.render) {
		const Component = instance.type;
		// 拿到render函数
		instance.render = (Component.render || NOOP) as InternalRenderFunction;
	}
}
