import { currentInstance, setCurrentInstance, unsetCurrentInstance } from './component';
import { ComponentInternalInstance } from './componentRenderUtils';
import { callWithErrorHandling } from './errorHandling';

export const enum LifecycleHooks {
	BEFORE_CREATE = 'bc',
	CREATED = 'c',
	BEFORE_MOUNT = 'bm',
	MOUNTED = 'm',
	BEFORE_UPDATE = 'bu',
	UPDATED = 'u',
	BEFORE_UNMOUNT = 'bum',
	UNMOUNTED = 'um',
	DEACTIVATED = 'da',
	ACTIVATED = 'a'
}

function injectHook(
	type: LifecycleHooks,
	hook: Function,
	target: ComponentInternalInstance | null = currentInstance
): Function | null {
	if (target) {
		const hooks = target[type] || (target[type] = []);
		const wrappedHook = (...args: unknown[]) => {
			// 因为用户会在生命周期钩子里访问当前组件实例，这里要绑定下当前组件实例

			// 用户写的生命周期的钩子函数，就是执行wrappedHook，这里应用闭包，从父作用域拿到了target，引用了当前组件实例target，
			// 所以用户能在生命周期钩子中拿到当前组件实例
			setCurrentInstance(target);

			const res = callWithErrorHandling(hook, args);
			// 当执行完钩子函数后，重置当前组件实例
			unsetCurrentInstance();
			return res;
		};

		// 用户可以写多个生命周期函数，这里统一放在队列中。在组件的挂载、更新、卸载方法中依次执行
		hooks.push(wrappedHook);
		return wrappedHook;
	}
}

export const createHook =
	(lifecycle: LifecycleHooks) =>
	(hook: Function, target: ComponentInternalInstance | null = currentInstance) =>
		injectHook(lifecycle, (...arrgs: unknown[]) => hook(...arrgs), target);

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT);
export const onMounted = createHook(LifecycleHooks.MOUNTED);
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE);
export const onUpdated = createHook(LifecycleHooks.UPDATED);
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT);
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED);
