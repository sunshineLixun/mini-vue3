import { RendererElement, RendererNode, RendererInternals, RendererOptions } from '../renderer';
import { VNode, VNodeArrayChildren, VNodeProps } from '../vnode';
import { ComponentInternalInstance } from '../componentRenderUtils';
import { ShapeFlags, isString } from '@vue/shared';

export const isTeleport = (type: any): boolean => type.__isTeleport;

export const isTeleportDisabled = (props: VNode['props']) => props && props.disabled;

export interface TeleportProps {
	to: string | RendererElement | null | undefined;
	disabled: boolean;
}

export type TeleportVNode = VNode<RendererNode, TeleportProps>;

export const enum TeleportMoveTypes {
	TARGET_CHANGE, // target change
	TOGGLE, // enable / disable
	REORDER // moved in the main view
}

export const TeleportImpl = {
	__isTeleport: true,
	process(
		n1: TeleportVNode | null,
		n2: TeleportVNode,
		container: RendererElement,
		anchor: RendererNode | null,
		parentComponent: ComponentInternalInstance | null,
		internals: RendererInternals
	) {
		const {
			mc: mountComponent,
			pc: patchChildren,
			o: { quertSelector, insert, createText }
		} = internals;

		const { shapeFlag, children } = n2;
		const disabled = isTeleportDisabled(n2.props);

		if (n1 == null) {
			// first mount

			// ??? 为啥用空文本做跟节点

			// teleport start
			const placeholder = (n2.el = createText(''));
			// teleport end
			const mainAnchor = (n2.anchor = createText(''));

			insert(placeholder, container, anchor);
			insert(mainAnchor, container, anchor);

			const target = (n2.target = resolveTarget(n2.props, quertSelector));
			const targetAnchor = (n2.targetAnchor = createText(''));

			if (target) {
				// targetAnchor记录目标节点
				insert(targetAnchor, target);
			}

			const mount = (container: RendererElement, anchor: RendererNode | null) => {
				// teleport 子元素必须是数组
				if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
					mountComponent(children as VNodeArrayChildren, container, anchor, parentComponent);
				}
			};

			if (disabled) {
				// 如果disabled，添加到传入的container，通常情况下是app下
				mount(container, mainAnchor);
			} else {
				mount(target, targetAnchor);
			}
		} else {
			// update
			n2.el = n1.el;
			const target = (n2.target = n1.target);
			const mainAnchor = (n2.anchor = n1.anchor);
			const targetAnchor = (n2.targetAnchor = n1.targetAnchor);

			// 看下之前的元素
			const wasDisabled = isTeleportDisabled(n1.props);

			const currentTarget = wasDisabled ? container : target;
			const currentAnchor = wasDisabled ? mainAnchor : targetAnchor;

			patchChildren(n1, n2, currentTarget, currentAnchor, parentComponent);

			if (disabled) {
				// TODO: disabled的变化
			} else {
				// target的变化

				if ((n2.props && n2.props.to) !== (n1.props && n1.props.to)) {
					const newTarget = resolveTarget(n2.props, quertSelector);

					if (newTarget) {
						moveTeleport(n2, newTarget, null, internals, TeleportMoveTypes.TARGET_CHANGE);
					}
				}
			}
		}
	},
	remove(vnode: VNode, { um: unmount, o: { remove: hostRemove } }: RendererInternals) {
		const { shapeFlag, target, targetAnchor, props, anchor, children } = vnode;

		// 清空记录位置
		if (target) {
			hostRemove(targetAnchor);
		}

		if (!isTeleportDisabled(props)) {
			// 清空记录位置
			hostRemove(anchor);
			if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				// 移除子元素
				for (let i = 0; i < children.length; i++) {
					unmount(children[i] as VNode);
				}
			}
		}
	},

	move: moveTeleport
};

function moveTeleport(
	vnode: VNode,
	container: RendererElement,
	parentAnchor: RendererNode | null,
	{ o: { insert }, m: move }: RendererInternals,
	moveType: TeleportMoveTypes = TeleportMoveTypes.REORDER
) {
	// 插入到新的位置
	if (moveType === TeleportMoveTypes.TARGET_CHANGE) {
		insert(vnode.targetAnchor, container, parentAnchor);
	}

	const { shapeFlag, children, el, props } = vnode;
	const isReorder = moveType === TeleportMoveTypes.REORDER;

	// 子元素都插入到自己的父元素里面
	if (isReorder) {
		insert(el, container, parentAnchor);
	}

	if (!isReorder || isTeleportDisabled(props)) {
		// 移动子元素
		if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
			(children as VNode[]).forEach(child => move(child, container, parentAnchor));
		}
	}
}

export const Teleport = TeleportImpl as unknown as {
	__isTeleport: true;
	new (): {
		$props: VNodeProps & TeleportProps;
		$slots: {
			default(): VNode[];
		};
	};
};

export function resolveTarget(props: TeleportProps, select: RendererOptions['quertSelector']) {
	const targetSelector = props && props.to;
	// 用户可以传入一个字符串
	if (isString(targetSelector)) {
		if (!select) {
			return null;
		}
		return select(targetSelector as string);
	} else {
		// 用户也可传入一个dom节点, 那就用这个dom节点
		return targetSelector;
	}
}
