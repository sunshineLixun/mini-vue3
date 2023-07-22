import { isNoEmptyValue, isString } from '@vue/shared';

type Style = string | Record<string, string | string[]> | null;

export function patchStyle(el: Element, prev: Style, next: Style) {
	const style = (el as HTMLElement).style;
	const isCssString = isString(next);
	const isPrevCssString = isString(prev);

	// eg. <div :style={}></div> style是个对象

	// 存在新值，并且是对象
	if (next && !isCssString) {
		if (prev && !isPrevCssString) {
			// 说明老值 和新值都是对象
			for (const key in prev) {
				// 老值 在新的值里面没有，删除
				if (!isNoEmptyValue(next[key])) {
					style[key] = '';
				}
			}
		}

		// 设置新的值
		for (const key in next) {
			style[key] = next[key];
		}
	} else {
		// eg. <div style=""></div>
		// 新值是string
		if (isCssString) {
			// 比较下是否相等
			if (prev != next) {
				style.cssText = next;
			}
		} else if (prev) {
			// 新值是null，而且存在老值，删掉老值
			el.removeAttribute('style');
		}
	}
}
