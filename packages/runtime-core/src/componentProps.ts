import { shallowReactive } from '@vue/reactivity';
import { hasOwn, isReservedProp } from '@vue/shared';
import { ComponentInternalInstance, Data } from './componentRenderUtils';

export function initProps(instance: ComponentInternalInstance, rawProps: Data | null, isStateful: number) {
	const props: Data = {};
	const attrs: Data = {};

	const options = instance.propsOptions;

	if (rawProps) {
		for (let key in rawProps) {
			// 跳过vue 中 属性保留关键字
			if (isReservedProp(key)) continue;

			const value = rawProps[key];

			if (hasOwn(options, key)) {
				props[key] = value;
			} else {
				// 没有在用户申明的props中，归类为attrs
				attrs[key] = value;
			}
		}
	}

	if (isStateful) {
		// 将props转化为响应式
		instance.props = shallowReactive(props);
	} else {
		if (!instance.type.props) {
			// 函数式组件，如果没有props，将attrs给props
			instance.props = attrs;
		} else {
			// 函数式组件不需要 props转化为响应式
			instance.props = props;
		}
	}
}
