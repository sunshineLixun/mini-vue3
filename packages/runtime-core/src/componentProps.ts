import { shallowReactive, toRaw } from '@vue/reactivity';
import { hasOwn, isReservedProp } from '@vue/shared';
import { ComponentInternalInstance, Data } from './componentRenderUtils';

export function initProps(instance: ComponentInternalInstance, rawProps: Data | null, isStateful: number) {
	const props: Data = {};
	const attrs: Data = {};

	// rawProps 是vnode上传递的props，通常也就是父组件传递给子组件的props
	setFullProps(instance, rawProps, props, attrs);

	if (isStateful) {
		// 将props转化为响应式，props也是浅代理。一是考虑到性能，不做深度代理。二是因为用户一般都是直接更新props某个对象，而不是更新props属性中的某个值
		instance.props = shallowReactive(props);
	} else {
		if (!instance.type.props) {
			// 函数式组件，如果没有props，将attrs给props
			instance.props = attrs;
		} else {
			// 函数式组件不需要将props转化为响应式
			instance.props = props;
		}
	}
}

function setFullProps(instance: ComponentInternalInstance, rawProps: Data | null, props: Data, attrs: Data) {
	// propsOptions用户自己在组件先写的props
	const options = instance.propsOptions;
	if (rawProps) {
		for (let key in rawProps) {
			// 跳过vue 中 属性保留关键字
			if (isReservedProp(key)) continue;

			const value = rawProps[key];

			if (hasOwn(options, key)) {
				props[key] = value;
			} else {
				// 没有在用户申明的props中，则归类为attrs
				attrs[key] = value;
			}
		}
	}
}

export function updateProps(instance: ComponentInternalInstance, rawProps: Data | null, rawPrevProps: Data | null) {
	const { props, attrs } = instance;
	setFullProps(instance, rawProps, props, attrs);

	for (const key in rawProps) {
		rawPrevProps[key] = rawProps[key];
	}

	for (const key in rawPrevProps) {
		if (!hasOwn(rawProps, key)) {
			delete rawPrevProps[key];
		}
	}
}
