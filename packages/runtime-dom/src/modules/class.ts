import { isNoEmptyValue } from '@vue/shared';

export function patchClass(el: Element, value: string) {
	if (isNoEmptyValue(value)) {
		// 直接覆盖
		el.className = value;
	} else {
		// 删除class属性
		el.removeAttribute('class');
	}
}
