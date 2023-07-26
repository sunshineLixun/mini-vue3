import { RendererOptions } from '@vue/runtime-core';

// 增删改查
export const nodeOps: Omit<RendererOptions<Node, Element>, 'patchProp'> = {
	// 增加、插入
	insert(child, parent, anchor) {
		parent.insertBefore(child, anchor || null);
	},
	// 删除
	remove(child) {
		const parent = child.parentNode;
		if (parent) {
			parent.removeChild(child);
		}
	},
	createElement(tagName) {
		return document.createElement(tagName);
	},
	createText(text: string) {
		return document.createTextNode(text);
	},
	createComment(data) {
		return document.createComment(data);
	},
	setText(el, text) {
		el.nodeValue = text;
	},
	setElementText(el, text) {
		el.textContent = text;
	},
	parentNode(node) {
		return node.parentNode as Element;
	},
	nextSibling(node) {
		return node.nextSibling;
	},
	quertSelector(selector) {
		return document.querySelector(selector);
	}
};
