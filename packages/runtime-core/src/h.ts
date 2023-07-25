import { isArray, isObject } from '@vue/shared';
import { VNode, createVNode, isVNode } from './vnode';

// h函数有以下几种传入方式

// 纯文本
// h('div')

//  type + 属性
// h('div', {})

// type + children
// h('div', [])
// h('div', 'text')
// h('div', h('span'))

// type + 属性 + children
// h('div', {}, '')
// h('div', {}, h('span'))   // vnode children
// h('div', {}, [''])        // 数组文本children
// h('div', {}, [h('span')]) // 数组 vnode children

// Components
// h(Components, () => {}) default slots
// h(Component, {}, () => {}) // default slot
// h(Component, {}, {}) // named slots

export function h(type: any, propsOrChildren?: any, children?: any, ..._: any[]): VNode {
	// 判断参数长度

	const l = arguments.length;

	// type是一定有的
	if (l === 2) {
		// 参数为2个，第二个参数 有可能是children (文本、vnode), 也有可能是props
		// children:  h('div', '')  h('div', [])
		// props: h('div', {})
		if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
			// 第二个参数是 vnode
			// h('div', h('span'))
			if (isVNode(propsOrChildren)) {
				return createVNode(type, null, [propsOrChildren]);
			}
			// 第二个参数是属性
			// h('div', {})
			return createVNode(type, propsOrChildren);
		} else {
			// 第二个参数是children
			// h('div', 'xxx')
			return createVNode(type, null, propsOrChildren);
		}
	} else {
		// 3种情况
		// h('div')
		// h('div', {}, '')
		// h('div', {}, '', '')

		if (l > 3) {
			// h('div', {}, '', '')
			// 取后两个，多余的参数都转成数组
			children = Array.prototype.slice.call(arguments, 2);
		} else if (l === 3 && isVNode(children)) {
			// h('div', {}, h('span'))
			children = [children];
		}
		return createVNode(type, propsOrChildren, children);
	}
}
