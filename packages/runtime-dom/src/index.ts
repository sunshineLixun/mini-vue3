import { extend } from '@vue/shared';
import { nodeOps } from './nodeOps';
import { patchProp } from './patchProp';
import { Renderer, RootRenderFunction, createRenderer } from '@vue/runtime-core';

const rendererOptions = extend(nodeOps, { patchProp });

let renderer: Renderer<Element | ShadowRoot>;

// 懒加载
function ensureRenderer() {
	return renderer || (renderer = createRenderer(rendererOptions));
}

export const render = ((...args) => {
	ensureRenderer().render(...args);
}) as RootRenderFunction<ShadowRoot>;

export * from '@vue/runtime-core';
