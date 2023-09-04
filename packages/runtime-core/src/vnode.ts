import { Ref } from '@vue/reactivity';
import { ShapeFlags, isArray, isFunction, isObject, isString } from '@vue/shared';
import { RendererNode } from './renderer';
import { Component } from './component';
import { ComponentInternalInstance } from './componentRenderUtils';

// ref='xxx'
// ref="ref('xxx)"
// ref="(ref('xxx' | toRefs(reactive))) => void"
export type VNodeRef = string | Ref | ((ref: Element | null, refs: Record<string, any>) => void);

export type VNodeProps = {
	key?: string | number | symbol;
	ref?: VNodeRef;
};

/**占位 */
export const Fragment = Symbol.for('v-fgt') as any as {
	__isFragment: true;
	new (): {
		$props: VNodeProps;
	};
};
/**纯文本 */
export const Text = Symbol.for('v-txt');
/**注释节点 */
export const Comment = Symbol.for('v-cmt');

/**虚拟node的类型，文本 或者是node */
export type VNodeTypes = string | VNode | Component | typeof Text | typeof Comment | typeof Fragment;

export type Data = Record<string, unknown>;

type VNodeChildAtom = VNode | string | number | boolean | null | undefined | void;

export type VNodeChild = VNodeChildAtom | VNodeArrayChildren;

export type VNodeArrayChildren = Array<VNodeChild>;

export type VNodeNormalizedChildren = string | VNodeArrayChildren | null;

export function isVNode(value: any): value is VNode {
	return value ? value.__v_isVNode === true : false;
}

export interface VNode<HostNode = RendererNode, ExtraProps = { [key: string]: any }> {
	/**
	 * vnode标识
	 */
	__v_isVNode: true;

	/**
	 * vnode自己的类型
	 */
	type: VNodeTypes;
	/**
	 * 属性
	 */
	props: (VNodeProps & ExtraProps) | null;
	/**
	 * 循环变量，指定的key
	 */
	key: string | number | symbol | null;

	ref: VNodeRef | null;

	/**
	 * 孩子，孩子的类型可以是 空、文本、node，以及数据[文本]、数组[node]
	 */
	children: VNodeNormalizedChildren | null;

	// DOM

	// 保存对应的组件实例
	component: ComponentInternalInstance | null;

	/**
	 * 映射的真实节点
	 */
	el: HostNode | null;
	/**
	 * 对应的位置
	 */
	anchor: HostNode | null; // fragment anchor

	/**node元素类型flag */
	/**标记自己是什么类型和孩子是什么类型 */
	shapeFlag: number;
}

/**处理key */
const normalizeKey = ({ key }: VNodeProps): VNode['key'] => (key != null ? key : null);

const normalizeRef = ({ ref }: VNodeProps): VNode['ref'] => {
	if (typeof ref === 'number') {
		ref = String(ref);
	}
	return ref;
};
/**
 * 创建虚拟dom，可能是文本、div普通元素、自定义组件、注释、Fragment、静态节点、Teleport、Suspense
 */
export function createVNode(
	type: VNodeTypes,
	props: (VNodeProps & Data) | null = null,
	children: unknown = null
): VNode {
	// 源码里面：
	// type: 如果是VNode 需要cloneVNode
	// eg. :class="{a: xx, b: xxx}" :class="['classA', {'classB': true }]"
	// eg. :style="{'display': 'flex'}" :style="[{'display': 'flex'}, { 'flex': 2 }]"
	// props里面如果有class、style 也需要拍平处理
	// 这里为了简便：就不处理了

	// eg. h('div')  h('div', { props })  h('div', { props }, children)
	// 如果有值，一定是元素类型
	// 如果是对象，则为组件类型
	const shapeFlag = isString(type)
		? ShapeFlags.ELEMENT
		: isObject(type)
		? ShapeFlags.STATEFUL_COMPONENT
		: isFunction(type)
		? ShapeFlags.FUNCTIONAL_COMPONENT
		: 0;

	return createBaseVNode(type, props, children, shapeFlag);
}

function createBaseVNode(
	type: VNodeTypes,
	props: (VNodeProps & Data) | null = null,
	children: any = null,
	shapeFlag = type === Fragment ? 0 : ShapeFlags.ELEMENT
): VNode {
	const vnode: VNode = {
		__v_isVNode: true,
		type,
		props,
		key: props && normalizeKey(props),
		ref: props && normalizeRef(props),
		children,
		el: null, // 真实节点 初始化为null
		anchor: null,
		component: null,
		shapeFlag
	};
	// 处理子类型和自己的类型
	if (children) {
		// h('div', props, 'xxx') 渲染为 <div ...props>xxx</div>
		// h('div', props, [h('span', props, 'yyyy')]) 渲染为 <div ...props><span ...props>yyyy</span></div>

		vnode.shapeFlag |= isString(children) ? ShapeFlags.TEXT_CHILDREN : ShapeFlags.ARRAY_CHILDREN;
	}
	return vnode;
}

// 判断是否是同一个虚拟节点， 因为每个虚拟节点的type和key都是唯一的
export function isSameVNodeType(n1: VNode, n2: VNode) {
	return n1.type === n2.type && n1.key === n2.key;
}

// eg. h('div', props, h('span', props))  h('div', props, [h('span', props)])
// 处理child 转出vnode
export function normalizeVNode(child: VNodeChild): VNode {
	if (child === null || typeof child === 'boolean') {
		// 注释节点
		return createVNode(Comment);
	} else if (isArray(child)) {
		// 数组的话 父元素弄个空的占位符：Fragment，child copy一份
		return createVNode(Fragment, null, child.slice());
	} else if (typeof child === 'object') {
		// 本身就是 vnode
		// TODO: cloneVNode
		return cloneVNode(child);
	} else {
		// string numbers
		return createVNode(Text, null, String(child));
	}
}

// TODO:实现
export function cloneVNode(vnode: VNode): VNode {
	return vnode;
}
