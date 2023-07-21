import {
	Text,
	VNode,
	VNodeArrayChildren,
	VNodeProps,
	createVNode,
	isSameVNodeType,
	normalizeVNode
} from '@vue/runtime-core';
import { ShapeFlags } from '@vue/shared';

export interface Renderer<HostElement = RendererElement> {
	render: RootRenderFunction<HostElement>;
}

// 增删改查
export interface RendererOptions<HostNode = RendererNode, HostElement = RendererElement> {
	patchProp(el: RendererElement, key: string, preValue: any, nextValue: any): void;
	/**
	 * 插入 (增加、移动)
	 * @param el 子节点
	 * @param parent 父元素
	 * @param anchor 描点 节点
	 */
	insert(el: HostNode, parent: HostElement, anchor: HostNode | null): void;
	/**
	 * 删除
	 * @param el 子节点
	 */
	remove(el: HostNode): void;
	/**
	 * 新增一个节点
	 * @param tagName tageName
	 * @param props 属性
	 */
	createElement(tagName: string, props?: VNodeProps): HostElement;

	/**
	 * 创建文本Node
	 * @param text 文本内容
	 */
	createText(text: string): Text;

	/**
	 * 设置节点内容
	 * @param el 节点
	 * @param text 文本内容
	 */
	setText(el: HostNode, text: string): void;

	/**
	 * 设置元素的textContent
	 * @param el
	 * @param text
	 */
	setElementText(el: HostElement, text: string): void;

	/**
	 * 注释节点
	 * @param data 注释内容
	 */
	createComment(data: string): Comment;

	/**
	 * 获取父节点
	 * @param node 子节点
	 */
	parentNode(child: HostNode): HostElement;

	/**
	 * 获取兄弟节点
	 * @param node
	 */
	nextSibling(node: HostNode): HostNode;

	quertSelector(selector: string): HostElement;
}

export interface RendererNode {
	[key: string]: any;
}

export interface RendererElement extends RendererNode {}

export type RootRenderFunction<HostElement = RendererElement> = (vnode: VNode | null, container: HostElement) => void;

/**
 * n1 标识已经老节点，n2标识新节点  container标识渲染跟元素
 */
type PatchFn = (n1: VNode | null, n2: VNode, container: RendererElement, anchor: RendererNode | null) => void;

type NextFn = (vnode: VNode) => RendererNode;

type ProcessTextFn = (n1: VNode | null, n2: VNode, container: RendererElement, anchor: RendererNode | null) => void;

type ProcessElementFn = (n1: VNode | null, n2: VNode, container: RendererElement, anchor: RendererNode | null) => void;

type MountElementFn = (vnode: VNode, container: RendererElement, anchor: RendererNode | null) => void;

type PatchElementFn = (n1: VNode | null, n2: VNode, container: RendererElement, anchor: RendererNode | null) => void;

type MountChildrenFn = (
	children: VNodeArrayChildren,
	container: RendererElement,
	anchor: RendererNode | null,
	start?: number
) => void;

export function createRenderer(options: RendererOptions) {
	return baseCreateRenderer(options);
}

function baseCreateRenderer(options: RendererOptions) {
	const {
		insert: hostInsert,
		remove: hostRemove,
		patchProp: hostPatchProp,
		createElement: hostCreateElement,
		createText: hostCreateText,
		createComment: hostCreateComment,
		setText: hostSetText,
		setElementText: hostSetElementText,
		parentNode: hostParentNode,
		nextSibling: hostNextSibling
	} = options;

	// 递归处理children
	// eg. h('div', props, [h('span', props)])
	const mountChildren: MountChildrenFn = (children, el, anchor, start = 0) => {
		for (let i = start; i < children.length; i++) {
			// 这里的child可能是普通文本(string, number)，也可能是vnode，也可能是 [h('span'), h('div')]
			const child = normalizeVNode(children[i]);
			// 递归处理
			patch(null, child, el, anchor);
		}
	};

	// 初次渲染
	const mountElement: MountElementFn = (vnode, container, anchor) => {
		// 真实节点
		let el: RendererElement;

		const { type, shapeFlag, props, children } = vnode;
		// type ->  div  span .... 普通元素
		el = vnode.el = hostCreateElement(type as string);

		if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
			// eg. h('div', props, 'xxx')
			hostSetElementText(el, children as string);
		} else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
			// eg. h('div', props, [h('span', props)])
			// h('div', props, ['xxx', 'ccccc'])
			mountChildren(children as VNodeArrayChildren[], el, null);
		}
	};

	// diff
	const patchElement: PatchElementFn = (n1, n2, container, anchor) => {};

	const processElement: ProcessElementFn = (n1, n2, container, anchor) => {
		if (n1 == null) {
			// 初次渲染
			mountElement(n2, container, anchor);
		} else {
			// diff
			patchElement(n1, n2, container, anchor);
		}
	};

	const patch: PatchFn = (n1, n2, container, anchor) => {
		// 相同的节点，直接返回
		if (n1 === n2) {
			return;
		}

		if (n1 && !isSameVNodeType(n1, n2)) {
			// 获取老节点相邻的节点
			anchor = getNextHostNode(n1);
			// 存在老节点，并且新节点和老节点不一样，卸载老节点
			unmount();
			n1 = null;
		}

		const { type, shapeFlag } = n2;
		console.log(type, Text, shapeFlag);
		//  TODO: 判断节点类型, 有Text Comment Fragment Static
		// 这里先处理普通元素
		if (shapeFlag & ShapeFlags.ELEMENT) {
			// 普通元素
			processElement(n1, n2, container, anchor);
		}
	};

	// TODO:卸载
	const unmount = () => {};

	const getNextHostNode: NextFn = vnode => {
		if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
			// 组件
			// TODO:获取相邻的组件
		}
		return hostNextSibling(vnode.anchor || vnode.el);
	};

	const render: RootRenderFunction = (vnode, container) => {
		if (vnode == null) {
			// 没有新节点 但是有旧的节点，要删除 卸载掉
			if (container._vnode) {
				unmount();
			}
		} else {
			patch(container._vnode || null, vnode, container, null);
		}
		// 保存老节点
		container._vnode = vnode;
	};
	return {
		render
	};
}
