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
		let data = instance.data;
		const { accessCache, type } = instance;

		// 这里跟源码不一致，做了简化处理，兼容下vue2写法
		/**
		 *
		 * const component = {
		 * 		data() {
		 * 			return {name: 'vue'}
		 * 	  },
		 *
		 * 		render() {
		 * 			return h('div', `${this.name}`)
		 * 		}
		 *
		 * }
		 *
		 */
		if (type.data && isFunction(type.data)) {
			data = type.data();
		}

		// 获取data函数中的值
		if (data !== EMPTY_OBJ && hasOwn(data, key)) {
			// 缓存
			accessCache[key] = AccessTypes.DATA;
			return data[key];
		}
	}
};
