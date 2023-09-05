import { EMPTY_OBJ, capitalize } from '@vue/shared';
import { ComponentInternalInstance } from './componentRenderUtils';
import { callWithErrorHandling } from './errorHandling';

export function emit(instance: ComponentInternalInstance, event: string, ...args: any[]) {
	const props = instance.vnode.props || EMPTY_OBJ;
	let handler = props[`on${capitalize(event)}`];
	if (handler) {
		callWithErrorHandling(handler, args);
	}
	// TODO: v-model 的 emit
}
