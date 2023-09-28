import { ShapeFlags } from '@vue/shared';
import { VNode, VNodeProps, isVNode } from '../vnode';
import { getComponentName, getCurrentInstance } from '../component';
import { onMounted, onUpdated } from '../apiLifecycle';

// 没有考虑正则
export interface KeepAliveProps {
	include?: string | string[];
	exclude?: string | string[];
	max?: number | string;
}

const KeepAliveImpl = {
	name: 'KeepAlive',
	__isKeepAlive: true,

	props: {
		include: [String, Array],
		exclude: [String, Array],
		max: [String, Number]
	},

	setup(props: KeepAliveProps, { slots }) {
		const instance = getCurrentInstance();
		const cache = new Map();
		const keys = new Set();

		let pendingCacheKey = null;

		const cacheSubtree = () => {
			if (pendingCacheKey != null) {
				cache.set(pendingCacheKey, instance.subTree);
			}
		};

		onMounted(cacheSubtree);
		onUpdated(cacheSubtree);

		return () => {
			const children = slots.default();
			if (children.length > 1) {
				return children;
			}
			const rawVNode = children[0];

			if (!isVNode(rawVNode) || !(rawVNode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT)) {
				// 如果不是vnode 或者 不是状态组件 直接返回
				return rawVNode;
			}

			const comp = rawVNode.type;

			const name = getComponentName(comp);

			const key = rawVNode.key == null ? comp : rawVNode.key;

			const cachedVNode = cache.get(key);

			if (cachedVNode) {
				// 存在缓存

				// 先删除，然后再添加
				keys.delete(key);
				keys.add(key);
			} else {
				keys.add(key);
			}

			return rawVNode;
		};
	}
};

export const KeepAlive = KeepAliveImpl as any as {
	__isKeepAlive: true;

	new (): {
		$props: VNodeProps | KeepAliveProps;
		$slots: {
			default(): VNode[];
		};
	};
};
