import { Ref } from '@vue/reactivity';
import { ShapeFlags, isString } from '@vue/shared';

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
/**静态节点，children的内容不会变动的。 eg. <div>123</div> */
export const Static = Symbol.for('v-stc');

/**虚拟node的类型，文本 或者是node */
export type VNodeTypes = string | VNode | typeof Text | typeof Static | typeof Comment | typeof Fragment;

export type Data = Record<string, unknown>;

type VNodeChildAtom = VNode | string | number | boolean | null | undefined | void;

export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>;

export type VNodeChild = VNodeChildAtom | VNodeArrayChildren;

export type VNodeNormalizedChildren = string | VNodeArrayChildren | null;

export function isVNode(value: any): value is VNode {
	return value ? value.__v_isVNode === true : false;
}

export interface VNode<ExtraProps = { [key: string]: any }> {
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

	/**
	 * 孩子，孩子的类型可以是 空、文本、node，以及数据[文本]、数组[node]
	 */
	children: VNodeNormalizedChildren | null;

	// DOM

	/**
	 * 映射的真实接单
	 */
	el: Node | null;
	/**
	 * 对应的位置
	 */
	anchor: Node | null; // fragment anchor

	/**node元素类型flag */
	/**标记自己是什么类型和孩子是什么类型 */
	shapeFlag: number;
}

/**处理key */
const normalizeKey = ({ key }: VNodeProps): VNode['key'] => (key != null ? key : null);

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
	const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : 0;

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
		key: normalizeKey(props),
		children,
		el: null, // 真实节点 初始化为null
		anchor: null,
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
