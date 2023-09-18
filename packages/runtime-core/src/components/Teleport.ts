import { RendererElement, RendererNode, RendererInternals, RendererOptions } from '../renderer';
import { VNode, VNodeArrayChildren, VNodeProps } from '../vnode';
import { ComponentInternalInstance } from '../componentRenderUtils';
import { ShapeFlags, isString } from '@vue/shared';

export const isTeleport = (type: any): boolean => type.__isTeleport;

export interface TeleportProps {
	to: string | RendererElement | null | undefined;
	disabled: boolean;
}

export type TeleportVNode = VNode<RendererNode, TeleportProps>;

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
			o: { quertSelector, insert, createText }
		} = internals;

		const { shapeFlag, children } = n2;

		if (n1 == null) {
			// first mount

			// ??? 为啥用空文本做跟节点

			// teleport start
			const placeholder = (n2.el = createText(''));
			// teleport end
			const mainAnchor = (n2.anchor = createText(''));

			insert(placeholder, container, anchor);
			insert(mainAnchor, container, anchor);

			const target = resolveTarget(n2.props, quertSelector);
			const targetAnchor = (n2.targetAnchor = createText(''));

			const mount = (container: RendererElement, anchor: RendererNode | null) => {
				// teleport 子元素必须是数组
				if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
					mountComponent(children as VNodeArrayChildren, container, anchor, parentComponent);
				}
			};
			if (target) {
				// targetAnchor记录目标节点
				insert(targetAnchor, target);
				mount(target, targetAnchor);
			}
		} else {
			// update
			n2.el = n1.el;
		}
	},
	remove() {}
};

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
