import { EMPTY_OBJ, capitalize } from '@vue/shared';
import { ComponentInternalInstance } from './componentRenderUtils';
import { callWithErrorHandling } from './errorHandling';

export function emit(instance: ComponentInternalInstance, event: string, ...args: any[]) {
	const props = instance.vnode.props || EMPTY_OBJ;

	let handlerName = `on${capitalize(event)}`;
	let handler = props[handlerName];
	if (handler) {
		callWithErrorHandling(handler, args);
	}

	const onceHandler = props[handlerName + 'Once'];
	if (onceHandler) {
		// 如果没有被记录
		if (!instance.emitted) {
			instance.emitted = {};
		} else if (instance.emitted[handlerName]) {
			return;
		}

		// 缓存下，下次就阻止触发事件
		instance.emitted[handlerName] = true;

		callWithErrorHandling(onceHandler, args);
	}
}
