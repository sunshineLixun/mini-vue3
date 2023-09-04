import {
	Data,
	VNode,
	VNodeArrayChildren,
	VNodeProps,
	isSameVNodeType,
	normalizeVNode,
	Text,
	Comment,
	Fragment
} from '@vue/runtime-core';
import { EMPTY_OBJ, ShapeFlags, isReservedProp } from '@vue/shared';
import { createComponentInstance, setupComponent } from './component';
import { ComponentInternalInstance, renderComponentRoot, shouldUpdateComponent } from './componentRenderUtils';
import { ReactiveEffect } from '@vue/reactivity';
import { SchedulerJob, queueJob } from './scheduler';
import { updateProps } from './componentProps';

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
type PatchFn = (
	n1: VNode | null,
	n2: VNode,
	container: RendererElement,
	anchor?: RendererNode | null,
	parentComponent?: ComponentInternalInstance | null
) => void;

type NextFn = (vnode: VNode) => RendererNode;

type ProcessTextFn = (n1: VNode | null, n2: VNode, container: RendererElement, anchor: RendererNode | null) => void;

type ProcessCommentFn = (n1: VNode | null, n2: VNode, container: RendererElement, anchor: RendererNode | null) => void;

type ProcessElementFn = (n1: VNode | null, n2: VNode, container: RendererElement, anchor: RendererNode | null) => void;

type ProcessComponentFn = (
	n1: VNode | null,
	n2: VNode,
	container: RendererElement,
	anchor: RendererNode | null,
	parentComponent?: ComponentInternalInstance | null
) => void;

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

export type SetupRenderEffectFn = (
	instance: ComponentInternalInstance,
	initialVNode: VNode,
	container: RendererElement,
	anchor: RendererNode | null
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
			// 递归处理每个子元素
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

		// ------- 开始部分相同的vnode 比较

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

		// ------- 结尾部分相同的vnode 比较

		// 2：从后面开始查找

		//     b c
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

		// 公共序列 元素的挂载
		//  a b c
		//  a b c d
		//  i = 3; e1 = 2; e2 = 3;

		//      a c
		//  f e a c
		// i = 0; e1 = -1; e2 = 1;

		// 挂载新值要满足一下条件：
		// 1：新值一定比老值长，可以用 i 来判断， 此时 i 一定是大于 老值 e1的长度
		// 2：循环因子 i 要在新值的范围内

		if (i > e1) {
			if (i <= e2) {
				//  挂载新值
				// 怎么获取插入描点？
				// 1：先获取下一个元素
				// 2：如果下一个元素 仍然小于新值的最大长度，说明是向前插入，否则就是向后插入，向后插入直接传null即可
				const nextPos = e2 + 1;
				const anchor = nextPos < l2 ? (c2[nextPos] as VNode).el : null;
				while (i <= e2) {
					patch(null, normalizeVNode(c2[i]), container, anchor);
					i++;
				}
			}
		}

		// 公共序列 元素的卸载

		//  a b c
		//  a b
		//  i = 2; e1 = 2; e2 = 1;

		//  a b c d
		//      c d
		//  i = 0; e1 = 1; e2 = -1;

		// 满足这个条件：
		// 1: 新值比老值 短 可以用 i 来判断 , 此时 i 大于新值的长度，小于老值的长度
		// 2: 循环因子 i 要在新值的范围内
		else if (i > e2) {
			if (i <= e1) {
				while (i <= e1) {
					unmount(c1[i]);
					i++;
				}
			}
		} else {
			// ------- 两端相同，中间部位不同的vnode 比较

			//  a b [c d e] f g
			//  a b [e d c h] f g
			// 中间的不同
			//  i = 2; e1 = 4; e2 = 5;

			// 步骤：
			// 1： 第一个先遍历新序列，获取到keyToNewIndexMap
			// 2： 遍历老序列从keyToNewIndexMap中查找是否有新序列的值，存在就复用，不存在就删除

			const s1 = i; // 老的 i 比较的位置
			const s2 = i; // 新的 i 比较的位置

			// 存储新值的 映射，key是 vnode的key, value是 index
			// {vnode.key: index}
			const keyToNewIndexMap: Map<string | number | symbol, number> = new Map();

			// 新序列的循环
			for (i = s2; i <= e2; i++) {
				const nextChild = (c2[i] = normalizeVNode(c2[i]));

				if (nextChild.key !== null) {
					keyToNewIndexMap.set(nextChild.key, i);
				}
			}

			// 老序列循环
			for (i = s1; i <= e1; i++) {
				const prevChild = c1[i];
				// 从映射表中查找是否有 在 老的序列中 有新序列的值
				const newIndex = keyToNewIndexMap.get(prevChild.key);

				// 不存在: 说明新的里面没有，就要删除该vnode
				if (newIndex === undefined) {
					unmount(prevChild);
				} else {
					// 存在就复用该vnode, 进行patch
					patch(prevChild, c2[newIndex] as VNode, container);
				}
			}

			// TODO: 新元素的移动、插入

			//  a b [c d e] f g
			//  a b [e d c h] f g

			let patched = 0;
			// 将要被patch的元素长度：就是从e -> h
			const toBePatched = e2 - s2 + 1;

			// 记录被新元素 对应老元素 的位置，默认初始化为0
			const newIndexToOldIndexMap = new Array(toBePatched).fill(0);

			// 循环老元素序列
			for (i = s1; i <= e1; i++) {
				// 获取vnode
				const prevChild = c1[i];
				// 新元素比老元素少

				//  a b [c d e] f g
				//  a b f g
				if (patched >= toBePatched) {
					unmount(prevChild);
					continue;
				}
			}
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

	const processText: ProcessTextFn = (n1, n2, el, anchor) => {
		if (n1 === null) {
			// 挂载
			hostInsert((n2.el = hostCreateText(n2.children as string)), el, anchor);
		} else {
			// 更新
			const el = (n2.el = n1.el);
			if (n2.children !== n1.children) {
				hostSetText(el, n2.children as string);
			}
		}
	};

	const processComment: ProcessCommentFn = (n1, n2, container, anchor) => {
		if (n1 === null) {
			hostInsert((n2.el = hostCreateComment((n2.children as string) || '')), container, anchor);
		} else {
			n2.el = n1.el;
			// 不支持动态 注释节点
		}
	};

	const processFragment = (n1: VNode | null, n2: VNode, container: RendererElement, anchor: RendererNode | null) => {
		// 如果是第一次渲染，n2.el 默认是创建一个text文本
		// patch更新时：n2.el = n1
		const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateText(''))!;
		const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : hostCreateText(''))!;
		if (n1 === null) {
			// 父元素默认是空文本
			hostInsert(fragmentStartAnchor, container, anchor);
			hostInsert(fragmentEndAnchor, container, anchor);

			// fragmnet 子元素必须是children
			mountChildren(n2.children as VNodeArrayChildren, container, fragmentEndAnchor);
		} else {
			// patch
			patchChildren(n1, n2, container, fragmentEndAnchor);
		}
	};

	const processComponent: ProcessComponentFn = (n1, n2, container, anchor, parentComponent) => {
		if (n1 === null) {
			// n1为null, 代表挂载组件
			mountComponent(n2, container, anchor, parentComponent);
		} else {
			// 组件的props发生变化，更新组件
			updateComponent(n1, n2);
		}
	};

	// 组件更新前做的一些操作：更新props 更新children

	const updateComponentPreRender = (instance: ComponentInternalInstance, nextVNode: VNode) => {
		// 新的vnode保存当前组件实例
		nextVNode.component = instance;
		// 旧的proos
		const prevProps = instance.vnode.props;
		// 实例上的vnode保存最新的
		instance.vnode = nextVNode;

		// 清空next，防止后续一直以为有next节点，导致走更新方法
		instance.next = null;
		updateProps(instance, nextVNode.props, prevProps);
	};

	// 重点: 组件关联effect
	// 组装响应式数据，绑定effect
	const setupRenderEffect: SetupRenderEffectFn = (instance, initialVNode, container, anchor) => {
		// 默认会执行一次发方法
		const componentUpdateFn = () => {
			// 第一次执行
			if (!instance.isMounted) {
				// 1. 渲染组件内容
				const subTree = (instance.subTree = renderComponentRoot(instance));

				// patch children
				patch(null, subTree, container, anchor, instance);

				// 保存真实dom节点
				initialVNode.el = subTree.el;

				// 2. 挂载组件成功
				instance.isMounted = true;
			} else {
				let { next, vnode } = instance;
				// 说明组件props发生了更新
				if (next) {
					// 拿到真实dom元素
					next.el = vnode.el;
					updateComponentPreRender(instance, next);
				} else {
					// 如果没有，更新成最新的vnode
					next = vnode;
				}
				// 当组件内部的响应式数据发生变化时，执行
				const nextTree = renderComponentRoot(instance);
				// 获取老节点
				const prevTree = instance.subTree;
				// 更新老节点
				instance.subTree = nextTree;
				patch(prevTree, nextTree, hostParentNode(prevTree.el!), getNextHostNode(prevTree), instance);

				// 保存下最新的el
				next.el = nextTree.el;
			}
		};
		// 重点: 创建effect
		const effect = (instance.effect = new ReactiveEffect(componentUpdateFn, () => queueJob(update)));

		const update: SchedulerJob = (instance.update = () => effect.run());

		// 标记下job id 跟组件uid关联
		update.id = instance.uid;

		// 默认执行一次
		update();
	};

	// 初次挂载组件
	const mountComponent = (
		initialVNode: VNode,
		container: RendererElement,
		anchor: RendererNode | null,
		parentComponent: ComponentInternalInstance
	) => {
		const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));

		setupComponent(instance);

		setupRenderEffect(instance, initialVNode, container, anchor);
	};

	// 组件的props变更导致组件更新
	const updateComponent = (n1: VNode, n2: VNode) => {
		// 组件的props更新，比较新旧props变化，执行组件实例上的update方法，
		// 就会执行到ReactiveEffect的fn方法
		// n2新的vnode中保存旧的vnode组件实例, 同时拿到组件实例
		const instance = (n2.component = n1.component);
		// 在执行update之前，需要判断下属性有没有变化
		if (shouldUpdateComponent(n1, n2)) {
			// next保存下新的vnode，这个属性会在 effect 中用到
			instance.next = n2;
			instance.update();
		} else {
			// 没有变化时， 保存下就得vnode对应的真实节点
			// 实例vnode属性更新成新的vnode
			n2.el = n1.el;
			instance.vnode = n2;
		}
	};

	const patch: PatchFn = (n1, n2, container, anchor = null, parentComponent) => {
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

		switch (type) {
			case Text:
				processText(n1, n2, container, anchor);
				break;
			case Comment:
				processComment(n1, n2, container, anchor);
				break;
			case Fragment:
				processFragment(n1, n2, container, anchor);
				break;
			default:
				// 这里先处理普通元素 div  span ul
				if (shapeFlag & ShapeFlags.ELEMENT) {
					// 普通元素
					processElement(n1, n2, container, anchor);
				} else if (shapeFlag & ShapeFlags.COMPONENT) {
					// 组件
					processComponent(n1, n2, container, anchor, parentComponent);
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
			return getNextHostNode(vnode.component!.subTree);
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
			patch(container._vnode || null, vnode, container, null, null);
		}
		// 保存老节点
		container._vnode = vnode;
	};
	return {
		render
	};
}
