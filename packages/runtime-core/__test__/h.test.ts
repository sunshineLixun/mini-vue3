import { describe, expect, test } from 'vitest';

import { h } from '../src/h';
import { createVNode } from '../src/vnode';

describe('renderer: h', () => {
	test('type only', () => {
		expect(h('div')).toMatchObject(createVNode('div'));
	});

	test('type props', () => {
		expect(h('div', {})).toMatchObject(createVNode('div', {}));
	});

	test('type children', () => {
		expect(h('div', '1111')).toMatchObject(createVNode('div', null, '1111'));
	});

	test('type vnode', () => {
		const vnode = h('span');
		expect(h('div', vnode)).toMatchObject(createVNode('div', null, [vnode]));
	});

	test('type props children', () => {
		expect(h('div', {}, '1111')).toMatchObject(createVNode('div', {}, '1111'));
	});

	test('type props vnode', () => {
		const vnode = h('span');
		expect(h('div', {}, vnode)).toMatchObject(createVNode('div', {}, [vnode]));
	});

	test('type props slots', () => {
		const slot = {};
		expect(h('div', {}, slot)).toMatchObject(createVNode('div', {}, slot));
	});

	test('type props more children', () => {
		const vnode = h('div', null, h('span'), h('span'));
		expect(vnode.children).toMatchObject([
			{
				type: 'span'
			},
			{
				type: 'span'
			}
		]);
	});

	// TODO: Component 组件
});
