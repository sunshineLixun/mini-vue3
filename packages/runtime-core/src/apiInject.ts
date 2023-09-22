import { isFunction } from '@vue/shared';
import { currentInstance } from './component';

export interface InjectionKey<T> extends Symbol {}

export function provide<T, K = InjectionKey<T> | string | number>(key: K, value: T) {
	// provide inject必须在组件中使用
	if (!currentInstance) {
		console.warn(`inject() can only be used inside setup() or functional components.`);
		return;
	}

	// 第一次的currentInstance是父组件
	// 后续执行currentInstance就是自己组件实例

	let provides = currentInstance.provides;
	const parentProvides = currentInstance.parent && currentInstance.parent.provides;

	// 创建一个属于自己的provides
	if (provides === parentProvides) {
		// 沿着原型链逐级往上查找
		provides = currentInstance.provides = Object.create(parentProvides);
	}

	provides[key as string] = value;
}

export function inject<T>(
	key: InjectionKey<T> | string,
	defaultValue: any,
	treatDefaultAsFactory: boolean = false
): T | undefined {
	if (!currentInstance) {
		console.warn(`inject() can only be used inside setup() or functional components.`);
		return;
	}
	// 从最近的父级找
	const provides = currentInstance.parent?.provides;
	if (provides && (key as string | symbol) in provides) {
		return provides[key as string];
	}

	if (treatDefaultAsFactory && isFunction(defaultValue)) {
		return defaultValue.call(currentInstance && currentInstance.proxy);
	}
	return defaultValue;
}
