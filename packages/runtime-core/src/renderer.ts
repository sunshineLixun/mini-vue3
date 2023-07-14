import { VNodeProps } from '@vue/runtime-core';

// 增删改查
export interface RendererOptions {
	patchProp(el: Element, key: string, preValue: any, nextValue: any): void;
	/**
	 * 插入 (增加、移动)
	 * @param el 子节点
	 * @param parent 父元素
	 * @param anchor 描点 节点
	 */
	insert(el: Node, parent: Element, anchor: Node | null): void;
	/**
	 * 删除
	 * @param el 子节点
	 */
	remove(el: Node): void;
	/**
	 * 新增一个节点
	 * @param tagName tageName
	 * @param props 属性
	 */
	createElement(tagName: string, props: VNodeProps): Element;

	/**
	 * 创建文本Node
	 * @param text 文本内容
	 */
	createText(text: string): Text;

	/**
	 * 设置节点内容
	 * @param el 节点
	 * @param text 文本内容
	 */
	setText(el: Node, text: string): void;

	/**
	 * 设置元素的textContent
	 * @param el
	 * @param text
	 */
	setElementText(el: Element, text: string): void;

	/**
	 * 注释节点
	 * @param data 注释内容
	 */
	createComment(data: string): Comment;

	/**
	 * 获取父节点
	 * @param node 子节点
	 */
	parentNode(child: Node): Element;

	/**
	 * 获取兄弟节点
	 * @param node
	 */
	nextSilbing(node: Node): Node;

	quertSelector(selector: string): Element;
}
