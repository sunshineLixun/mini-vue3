import { isNoEmptyValue } from '@vue/shared';

export function patchAttrs(el: Element, key: string, nextValue: any) {
	if (isNoEmptyValue(nextValue)) {
		el.setAttribute(key, nextValue);
	} else {
		el.removeAttribute(key);
	}
}
