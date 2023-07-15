export type VNodeProps = {
	key: string | number | symbol;
};

type VNodeChildAtom = VNode | string | number | boolean | null | undefined | void;

export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>;

export type VNodeChild = VNodeChildAtom | VNodeArrayChildren;

export type VNodeNormalizedChildren = string | VNodeArrayChildren | null;

export type VNodeTypes = string | VNode;

export interface VNode<ExtraProps = { [key: string]: any }> {
	/**
	 * @internal
	 */
	__v_isVNode: true;

	type: VNodeTypes;
	props: (VNodeProps & ExtraProps) | null;
	key: string | number | symbol | null;

	children: VNodeNormalizedChildren;
	component: any;

	// DOM
	el: Node | null;
	anchor: Node | null; // fragment anchor
	target: Element | null; // teleport target

	shapeFlag: number;
}

/**
 * 创建虚拟dom，可能是文本、div普通元素、自定义组件、注释、Fragment、静态节点、Teleport、Suspense
 */
export function createVNode(type: VNodeTypes) {}
