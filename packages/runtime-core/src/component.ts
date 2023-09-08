// 咱用any顶一下

import { EMPTY_OBJ, NOOP, ShapeFlags, isFunction, isObject } from '@vue/shared';
import { ComponentInternalInstance, InternalRenderFunction } from './componentRenderUtils';
import { VNode } from './vnode';
import { callWithErrorHandling } from './errorHandling';
import { PublicInstanceProxyHandlers, publicPropertiesMap } from './componentPublicInstance';
import { proxyRefs, shallowReactive, track } from '@vue/reactivity';
import { initProps } from './componentProps';
import { emit } from './componentEmits';
import { initSlots } from './componentSlots';

export type Component = any;

// 自增的组件标识符
let uid = 0;

// 创建组价实例
export function createComponentInstance(
	vnode: VNode,
	parent: ComponentInternalInstance | null
): ComponentInternalInstance {
	const { type } = vnode;
	const instance: ComponentInternalInstance = {
		vnode,
		parent,
		root: null,
		type,
		uid: uid++,

		data: EMPTY_OBJ,
		props: EMPTY_OBJ,
		attrs: EMPTY_OBJ,
		slots: EMPTY_OBJ,
		refs: EMPTY_OBJ,

		setupState: EMPTY_OBJ,

		// ctx: EMPTY_OBJ,

		accessCache: EMPTY_OBJ,

		// 传给组件的props
		propsOptions: type.props || EMPTY_OBJ,

		emit: null,

		emitted: null,

		proxy: null,
		update: null,

		render: null,

		subTree: null,

		next: null,

		effect: null,

		isMounted: false,

		exposed: null,

		attrsProxy: null,
		exposeProxy: null,

		setupContext: null
	};

	instance.root = parent ? parent.root : instance;
	instance.emit = emit.bind(null, instance);

	return instance;
}

function createSetupContext(instance: ComponentInternalInstance) {
	return {
		slots: instance.slots,
		emit: instance.emit,
		get attrs() {
			// proxy attrs
			return getAttrsProxy(instance);
		},
		expose: (exposed: Record<string, any>) => {
			instance.exposed = exposed || {};
		}
	};
}

export function isStatefulComponent(instance: ComponentInternalInstance) {
	return instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT;
}

export function setupComponent(instance: ComponentInternalInstance) {
	const isStateful = isStatefulComponent(instance);

	initProps(instance, instance.vnode.props, isStateful);

	initSlots(instance, instance.vnode.children);

	const setupResult = isStateful ? setupStatefulComponent(instance) : null;
	return setupResult;
}

export function setupStatefulComponent(instance: ComponentInternalInstance) {
	const Component = instance.type;
	// vue3 setup
	const { setup } = Component;

	// 访问组件的props state setupState 都是通过代理组件实例来做。
	instance.proxy = new Proxy(instance, PublicInstanceProxyHandlers);

	if (setup) {
		// 获取setup函数形参的length > 1，传入setupContext
		// 比如用户会这样 setup(props, context)  setup(props, { emit, expose })
		// 当setup只有一个形参 时，只传入props
		const setupContext = (instance.setupContext = setup.length > 1 ? createSetupContext(instance) : null);

		const setupResult = callWithErrorHandling(setup, [instance.props, setupContext]);

		handleSetupResult(instance, setupResult);

		// 先不考虑async setup
	} else {
		if (Component.data && isFunction(Component.data)) {
			// 简易的支持下vue2写法
			// data() { return {} }
			// props data都是浅代理。
			// 绑定this指向
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
		// 自动对ref对象进行解包，可以再template中不用.value取值
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

function getAttrsProxy(instance: ComponentInternalInstance) {
	return (
		instance.attrsProxy ||
		(instance.attrsProxy = new Proxy(instance.attrs, {
			get: (target, key: string) => {
				// 当用户访问attrs，就会对$attrs触发依赖收集
				track(instance, '$attrs');
				return target[key];
			}
		}))
	);
}

// 通过对instance.exposed代理，这里外部就可以通过对 ref 进行访问组件实例
export function getExposeProxy(instance: ComponentInternalInstance) {
	if (instance.exposed) {
		return (
			// expose取值，其实就是对exposeProxy
			instance.exposeProxy ||
			(instance.exposeProxy = new Proxy(instance.exposed, {
				get(target, key: string) {
					if (key in target) {
						return target[key];
					} else if (key in publicPropertiesMap) {
						// 拿到组件的ref 还可以对组件的全局属性进行取值，比如 componentRef.value.$attrs  就会执行到这里
						return publicPropertiesMap[key](instance);
					}
				}
			}))
		);
	}
}
