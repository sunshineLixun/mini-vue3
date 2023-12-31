import { ReactiveEffect, WatchOptions } from '@vue/reactivity';
import { Comment, VNode, VNodeChild, createVNode, normalizeVNode } from './vnode';
import { SchedulerJob, nextTick } from './scheduler';
import { ShapeFlags } from '@vue/shared';
import { LifecycleHooks } from './apiLifecycle';
import { LifecycleHook } from './component';

export type Data = Record<string, any>;

export type InternalRenderFunction = {
	($props: ComponentInternalInstance['props'], $data: ComponentInternalInstance['data']): VNodeChild;
};

// 组件外部实例 -> 用户可以直接使用的属性
export type ComponentPublicInstance<Props = {}, Data = {}> = {
	// $指向内部组件实例
	$: ComponentInternalInstance;

	// 状态 props 相关
	$props: Props;
	$data: Data;
	$arrts: Data;
	$refs: Data;
	$slots: any;

	$options: Data;

	// 元素相关
	$el: any;
	// root
	$root: ComponentPublicInstance;
	// 父元素
	$parent: ComponentPublicInstance;

	// watch update emit
	$watch: (source: any, cb: () => any, options: WatchOptions) => any;
	$emit: () => void;
	$forceUpdate: () => void;
	$nextTick: typeof nextTick;
};

// 组件内部实例 -> 框架开发用
export interface ComponentInternalInstance {
	uid: number;

	// 区分组件类型、状态组件 还是函数组件
	type: any;

	// 父组件
	parent: ComponentInternalInstance | null;
	// 根组件
	root: ComponentInternalInstance;

	// state
	// 最常用的几个
	data: Data;
	props: Data;
	attrs: Data;
	slots: any;
	refs: Data;

	// setup函数返回的数据
	setupState: Data;

	propsOptions: Data;

	// 缓存
	accessCache: Data | null;
	emit: () => void;

	// 记录 .once event 事件，当标记为.once时，只会触发一次
	emitted: Record<string, boolean> | null;

	setupContext: any;

	// 其实就是当前组件 this
	proxy: ComponentPublicInstance | null;

	// 缓存expose抛出的事件
	exposed: Record<string, any> | null;
	// expose代理对象
	exposeProxy: Data | null;

	// ctx: Data;
	render: InternalRenderFunction | null;

	// 访问attrs就是访问attrsProxy代理对象
	attrsProxy: Data | null;

	// 组件强制更新的方法
	// 执行就是 effect.run 方法
	update: SchedulerJob | null;

	// 自己在父组件的vnode
	vnode: VNode;

	// 组件更新时，保存新的vnode
	next: VNode | null;

	// 自己的vnode
	subTree: VNode;

	// 组件就是一个effect
	effect: ReactiveEffect;

	provides: Record<string | symbol, any>;

	isMounted: boolean;

	[LifecycleHooks.BEFORE_CREATE]: LifecycleHook;

	[LifecycleHooks.CREATED]: LifecycleHook;

	[LifecycleHooks.BEFORE_MOUNT]: LifecycleHook;

	[LifecycleHooks.MOUNTED]: LifecycleHook;

	[LifecycleHooks.BEFORE_UPDATE]: LifecycleHook;

	[LifecycleHooks.UPDATED]: LifecycleHook;

	[LifecycleHooks.BEFORE_UNMOUNT]: LifecycleHook;

	[LifecycleHooks.UNMOUNTED]: LifecycleHook;

	[LifecycleHooks.ACTIVATED]: LifecycleHook;

	[LifecycleHooks.DEACTIVATED]: LifecycleHook;
}

export function renderComponentRoot(instance: ComponentInternalInstance): VNode {
	const { type: Component, vnode, props, data, attrs, slots, setupState, emit, proxy, render } = instance;
	const { shapeFlag } = vnode;
	// 判断是状态组件还是函数组件
	let result: VNode;
	try {
		if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
			// 执行组件的render函数，拿到vnode，
			// 同时绑定响应式数据，因为在模板中会访问this、props、state等响应式数据
			// render函数返回的内容访问了属性的get， 会触发依赖收集
			result = normalizeVNode(render!.call(proxy, proxy, props, setupState, data));
		} else if (shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT) {
			// 函数组件
			let render = Component;
			result = normalizeVNode(render.length > 1 ? render(props, { attrs, slots, emit }) : render(props, null));
		}
	} catch (error) {
		console.log(error);
		// 如果错误，用注释节点Comment 来兜底？？？为什么
		result = createVNode(Comment);
	}
	return result;
}

export function shouldUpdateComponent(prevVNode: VNode, nextVNode: VNode): boolean {
	const { props: prevProps, children: prevChild } = prevVNode;
	const { props: nextProps, children: nextChild } = nextVNode;

	// children
	if (prevChild || nextChild) {
		// $stable 用于手动标记改 children 是否能被更新
		// 当为true时，会跳过更新
		if (!nextChild || !(nextChild as any).$stable) {
			return true;
		}
	}

	if (prevProps === nextProps) {
		return false;
	}

	// 如果没有老属性，直接判断新属性
	if (!prevProps) {
		return !!nextProps;
	}

	// 没有新属性，就更新
	if (!nextProps) {
		return true;
	}

	return hasPropsChanged(prevProps, nextProps);
}

export function hasPropsChanged(prevProps: Data, nextProps: Data): boolean {
	const newKeys = Object.keys(nextProps);
	const oldKeys = Object.keys(prevProps);
	// 当新老属性的key都不一样，一定是true
	if (newKeys.length !== oldKeys.length) {
		return true;
	}

	// 当新老props属性数量一致时，就比较对应的value
	for (let i = 0; i < newKeys.length; i++) {
		const key = newKeys[i];
		if (prevProps[key] !== nextProps[key]) {
			return true;
		}
	}
	return false;
}
