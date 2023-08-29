import { EMPTY_OBJ, hasOwn, isFunction } from '@vue/shared';
import { ComponentRenderContext } from './components';

const enum AccessTypes {
	OTHER,
	SETUP,
	DATA,
	PROPS,
	CONTEXT
}

export const PublicInstanceProxyHandlers: ProxyHandler<any> = {
	get({ _: instance }: ComponentRenderContext, key: string) {
		const { accessCache, type, data } = instance;

		// 获取data函数中的值
		if (data !== EMPTY_OBJ && hasOwn(data, key)) {
			// 缓存
			accessCache[key] = AccessTypes.DATA;
			return data[key];
		}
	},
	set(target, key, newValue, receiver) {
		console.log(key);
		return true;
	}
};
