// 元素的属性 class  style props event

import { RendererOptions } from '@vue/runtime-core';
import { patchClass } from './modules/class';
import { patchStyle } from './modules/style';

export const patchProp: RendererOptions['patchProp'] = (el: Element, key: string, preValue: any, nextValue: any) => {
	if (key === 'class') {
		patchClass(el, nextValue);
	} else if (key === 'style') {
		patchStyle(el, preValue, nextValue);
	}
};
