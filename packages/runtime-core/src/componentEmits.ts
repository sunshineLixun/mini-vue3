import { ComponentInternalInstance } from './componentRenderUtils';

export function emit(instance: ComponentInternalInstance, event: string, ...args: any[]) {
	console.log(event);
}
