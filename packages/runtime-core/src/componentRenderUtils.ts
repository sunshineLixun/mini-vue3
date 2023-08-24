import { WatchOptions } from '@vue/reactivity';
import { VNodeChild } from './vnode';

export type Data = Record<string, unknown>;

export type InternalRenderFunction = {
	(
		ctx: ComponentPublicInstance,

		$props: ComponentInternalInstance['props'],
		$setup: ComponentInternalInstance['setupState'],
		$data: ComponentInternalInstance['data'],
		$options: ComponentInternalInstance['ctx']
	): VNodeChild;
};

// 组件外部实例 -> 用户可以直接使用的属性
export type ComponentPublicInstance<Props = {}, Data = {}> = {
	// $指向内部组件实例
	$: ComponentInternalInstance;

	// 状态 props 相关
	$props: Props;
	$data: Data;
	$arrts: Data;
	$refs: Data;
	$slots: any;

	$options: Data;

	// 元素相关
	$el: any;
	// root
	$root: ComponentPublicInstance;
	// 父元素
	$parent: ComponentPublicInstance;

	// watch update emit
	$watch: (source: any, cb: () => any, options: WatchOptions) => any;
	$emit: () => void;
	$forceUpdate: () => void;
	$nextTick: () => void;
};

// 组件内部实例 -> 框架开发用
export interface ComponentInternalInstance {
	uid: number;

	// state
	// 最常用的几个
	data: Data;
	props: Data;
	attrs: Data;
	slots: any;
	refs: Data;
	emit: () => void;

	// 其实就是当前组件 this
	proxy: ComponentPublicInstance | null;

	setupState: Data;

	ctx: Data;

	render: InternalRenderFunction | null;
}
