import { Text, VNode, VNodeProps, isSameVNodeType } from '@vue/runtime-core';
import { ShapeFlags } from '@vue/shared';

export interface Renderer<HostElement = RendererElement> {
	render: RootRenderFunction<HostElement>;
}

// 增删改查
export interface RendererOptions {
	patchProp(el: RendererElement, key: string, preValue: any, nextValue: any): void;
	/**
	 * 插入 (增加、移动)
	 * @param el 子节点
	 * @param parent 父元素
	 * @param anchor 描点 节点
	 */
	insert(el: Node, parent: RendererElement, anchor: RendererNode | null): void;
	/**
	 * 删除
	 * @param el 子节点
	 */
	remove(el: Node): void;
	/**
	 * 新增一个节点
	 * @param tagName tageName
	 * @param props 属性
	 */
	createElement(tagName: string, props: VNodeProps): RendererElement;

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
	setText(el: Node, text: string): void;

	/**
	 * 设置元素的textContent
	 * @param el
	 * @param text
	 */
	setElementText(el: RendererElement, text: string): void;

	/**
	 * 注释节点
	 * @param data 注释内容
	 */
	createComment(data: string): Comment;

	/**
	 * 获取父节点
	 * @param node 子节点
	 */
	parentNode(child: Node): RendererElement;

	/**
	 * 获取兄弟节点
	 * @param node
	 */
	nextSibling(node: Node): Node;

	quertSelector(selector: string): RendererElement;
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
		// 判断节点类型
		switch (type) {
			case Text:
				processText(n1, n2, container, anchor);
				break;

			default:
				break;
		}
	};

	const processText: ProcessTextFn = (n1, n2, container, anchor) => {
		if (n1 == null) {
			// 没有老节点，说明是新的，直接插入
			// 虚拟节点 这种添加真实节点
			// children字段里面保存着虚拟节点中的文本内容
			// h('div', '21312')
			n2.el = hostCreateText(n2.children as string);
			hostInsert(n2.el, container, anchor);
		} else {
			// 找到老虚拟节点映射的真实节点，丢给n2
			const el = (n2.el = n1.el!);
			if (n2.children !== n1.children) {
				// 文本内容不一致， 替换
				hostSetText(el, n2.children as string);
			}
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
		//
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
