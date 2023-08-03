import {
	Data,
	VNode,
	VNodeArrayChildren,
	VNodeProps,
	isSameVNodeType,
	normalizeVNode,
	Text,
	Comment
} from '@vue/runtime-core';
import { EMPTY_OBJ, ShapeFlags, isReservedProp } from '@vue/shared';

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

type PatchElementFn = (n1: VNode | null, n2: VNode) => void;

type UnmountFn = (vnode: VNode) => void;

type RemoveFn = (vnode: VNode) => void;

type PatchPropsFn = (el: RendererElement, oldProps: Data, newProps: Data) => void;

type PatchChildrenFn = (n1: VNode | null, n2: VNode, container: RendererElement, anchor: RendererNode | null) => void;

type UnmountChildrenFn = (children: VNode[]) => void;

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

	// 挂载子元素
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

	// 卸载所有子元素
	const unmountChildren: UnmountChildrenFn = childrens => {
		for (let i = 0; i < childrens.length; i++) {
			unmount(childrens[i]);
		}
	};

	function patchKeyedChildren(c1: VNode[], c2: VNodeArrayChildren, container: RendererElement) {
		let i = 0;
		// 最大长度
		const l1 = c1.length;
		const l2 = c2.length;

		let e1 = l1 - 1; // 老的最后一个
		let e2 = l2 - 1; // 新值最后一个

		// 1： 从头开始查找

		// a b c
		// a b c d

		// 当达到 老值 或者 新值 任何一个 就结束循环
		while (i <= e1 && i <= e2) {
			const n1 = c1[i];
			// n2 copy一下，避免直接修改用户传入的新值
			const n2 = normalizeVNode(c2[i]);

			if (isSameVNodeType(n1, n2)) {
				// 表示是同一个节点，递归处理, 比较内部
				patch(n1, n2, container, null);
			} else {
				// 当遇到不同的节点时，结束循环
				break;
			}
			i++;
		}

		// 2：从后面开始查找

		//   a b c
		// a f b c

		while (i <= e1 && i <= e2) {
			const n1 = c1[e1];
			// n2 copy一下，避免直接修改用户传入的新值
			const n2 = normalizeVNode(c2[e2]);
			if (isSameVNodeType(n1, n2)) {
				patch(n1, n2, container, null);
			} else {
				break;
			}

			// 这种情况下 循环因子 i 不变
			// 老值 新值 同时往前推进
			e1--;
			e2--;
		}
	}

	/**
	 * 总体来说是子元素有3种情况：文本 数组 空
	 * 下面可以细分9种场景
	 * 比对子元素： 有以下几种情况：
	 *       新           旧          diff
	 * 1:   文本          数组        删除旧子元素，设置新的文本内容
	 * 2:   文本          文本        更新文本
	 * 3:   文本          空          更新文本
	 * 4:   数组          数组        diff
	 * 5:   数组          文本        清空文本，渲染新的数组children
	 * 6:   数组          空          直接渲染数组children
	 * 7:  	空            数组        删除所有子元素
	 * 8:   空           文本         清空文本
	 * 9:   空            空          忽略 不处理
	 */
	const patchChildren: PatchChildrenFn = (n1, n2, container, anchor) => {
		// 老的子元素
		const c1 = n1.children;
		const prevShapFlags = n1 ? n1.shapeFlag : 0;

		// 新的子元素
		const c2 = n2.children;

		const { shapeFlag } = n2;

		// 如果新children是文本 -> 对应前三种情况
		if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
			// 老值是数组 -> 对应第1种情况
			if (prevShapFlags & ShapeFlags.ARRAY_CHILDREN) {
				// 删除旧的子元素，设置新的文本内容
				unmountChildren(c1 as VNode[]);
			}

			// 第一种情况，旧值已经被删除子节点了，剩下2、3直接替换更新即可
			if (c1 !== c2) {
				hostSetElementText(container, c2 as string);
			}
		} else {
			// 对应后面几种情况: 新值是： 数组， 空
			if (prevShapFlags & ShapeFlags.ARRAY_CHILDREN) {
				if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
					// 新老值 都是 数组 -> 对应第4种情况
					// 重点： 全量 diff
					// 这里是情况最复杂的，也是最喜欢问考点的：
					// 1：为啥循环要指定key
					patchKeyedChildren(c1 as VNode[], c2 as VNodeArrayChildren, container);
				} else {
					// 这个分支对应第7种情况，因为第1种情况走了上面的if分支
					// 新值是空的，直接卸载老值
					unmountChildren(c1 as VNode[]);
				}
			} else {
				// 这个分2种情况：旧值是空（对应的新值是文本或者是数组）-> 如果新值是文本，会走进一个if判断； 新值是数组，挂载新的元素
				// 或者旧值是文本（对应的新值文本或者是数组）-> 卸载 旧的文本内容，挂载新的元素

				// 卸载旧的文本内容
				if (prevShapFlags & ShapeFlags.TEXT_CHILDREN) {
					// 设置空数据就行
					hostSetElementText(container, '');
				}

				if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
					// 挂载新的元素
					mountChildren(c2 as VNodeArrayChildren, container, anchor);
				}
			}
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

		// 处理props
		if (props) {
			for (const key in props) {
				if (!isReservedProp(key)) {
					hostPatchProp(el, key, null, props[key]);
				}
			}
		}

		// 在container上插入改真实节点
		hostInsert(el, container, anchor);
	};

	// 全量diff props
	// full diff props
	const patchProps: PatchPropsFn = (el, oldProps, newProps) => {
		// 不相等
		if (oldProps !== newProps) {
			// 老值存在
			if (oldProps !== EMPTY_OBJ) {
				for (const key in oldProps) {
					// 判断是否存在vue保留的key, 在新的props中也不存在，需要保留
					if (!isReservedProp(key) && !(key in newProps)) {
						hostPatchProp(el, key, oldProps[key], null);
					}
				}

				// 存在新值
				for (const key in newProps) {
					// 存在vue保留的key， 跳过本次循环， 把patch延迟在最后执行，提升patch效率
					if (isReservedProp(key)) continue;
					const prev = oldProps[key];
					const next = newProps[key];
					// 剔除 :value="" v-model:value=""
					if (prev !== next && key !== 'value') {
						hostPatchProp(el, key, prev, next);
					}
				}

				// next: {value: ''}  old: {value: ''}
				if ('value' in newProps) {
					hostPatchProp(el, 'value', oldProps.value, newProps.value);
				}
			}
		}
	};

	// diff
	const patchElement: PatchElementFn = (n1, n2) => {
		// 将老的el替换成新的el
		const el = (n2.el = n1.el);
		const oldProps = n1.props || EMPTY_OBJ;
		const newProps = n2.props || EMPTY_OBJ;

		// 1: children
		patchChildren(n1, n2, el, null);

		// 2: props
		// TODO: 这里可以根据 编译阶段 设置 patchFlag 来判断是更新class style props、动态props
		// 这里先全量diff props, 后续编译阶段可以结合起来 判断 patchFlag
		patchProps(el, oldProps, newProps);
	};

	const processElement: ProcessElementFn = (n1, n2, container, anchor) => {
		if (n1 == null) {
			// 初次渲染
			mountElement(n2, container, anchor);
		} else {
			// diff
			patchElement(n1, n2);
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

			unmount(n1);

			// 删除n1, 代表为初次渲染
			n1 = null;
		}
		const { type, shapeFlag } = n2;

		//  TODO: 判断节点类型, 有Text Comment Fragment Static
		switch (type) {
			case Text:
				break;
			case Comment:
				break;
			default:
				// 这里先处理普通元素 div  span ul
				if (shapeFlag & ShapeFlags.ELEMENT) {
					// 普通元素
					processElement(n1, n2, container, anchor);
				} else if (shapeFlag & ShapeFlags.COMPONENT) {
					// 组件
					// TODO: 组件
				}
				break;
		}
	};

	// 删除元素
	const unmount: UnmountFn = vnode => {
		remove(vnode);
	};

	const remove: RemoveFn = vnode => {
		// 保持跟源码一致
		performRemove(vnode);
	};

	const performRemove = (vnode: VNode) => {
		const { el } = vnode;
		hostRemove(el);
	};

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
				unmount(container._vnode);
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
