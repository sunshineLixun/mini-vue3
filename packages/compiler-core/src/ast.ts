// 整体解析规则 参考 acorn
// https://github.com/acornjs/acorn

export const enum NodeTypes {
	ROOT,
	// 普通元素
	ELEMENT,
	//文本
	TEXT,
	// 注释
	COMMENT,
	// 表达式
	SIMPLE_EXPRESSION,

	INTERPOLATION,
	// attr
	ATTRIBUTE,
	// 指令
	DIRECTIVE,
	// containers
	COMPOUND_EXPRESSION,

	// if
	IF,

	// if - else-if else
	IF_BRANCH,

	// for
	FOR,

	// text
	TEXT_CALL,

	// codegen

	// vnode
	VNODE_CALL,

	// 回调
	JS_CALL_EXPRESSION,
	// object
	JS_OBJECT_EXPRESSION,
	// 属性
	JS_PROPERTY,
	// 数组
	JS_ARRAY_EXPRESSION,
	// function
	JS_FUNCTION_EXPRESSION,

	// if else
	JS_CONDITIONAL_EXPRESSION,

	// 缓存
	JS_CACHE_EXPRESSION
}

export interface Node {
	type: NodeTypes;
	loc: SourceLocation;
}

export interface BaseElementNode extends Node {
	// 标签： div  span  br  ul
	tag: string;

	tagType: ElementTypes;

	children: TemplateChildNode[];

	// 是否是闭合标签
	isSelfClosing: boolean;
}

export const enum ElementTypes {
	// 普通文本
	ELEMENT,
	// 组件
	COMPONENT,
	SLOT,
	TEMPLATE
}

export type ElementNode = BaseElementNode;

export type TemplateChildNode = ElementNode | TextNode;

export interface TextNode extends Node {
	type: NodeTypes.TEXT;
	content: string;
}

export interface RootNode extends Node {
	type: NodeTypes;
	children: TemplateChildNode[];
	helpers: Set<symbol>;
	components: string[];
	directives: string[];
	hoists: [];
	imports: [];
	cached: number;
	temps: number;
	codegenNode: TemplateChildNode;
}

export interface Position {
	// 文本偏移量
	offset: number;

	// 第几行
	line: number;

	// 第几列
	column: number;
}

// 开闭区间 [start, end)
export interface SourceLocation {
	// 文本内容开始的的位置
	start: Position;

	// 文本内容结束的的位置
	end: Position;

	// 文本内容
	source: string;
}

export const locStub: SourceLocation = {
	source: '',
	start: { line: 1, column: 1, offset: 0 },
	end: { line: 1, column: 1, offset: 0 }
};

export function createRoot(children: TemplateChildNode[], loc = locStub): RootNode {
	return {
		type: NodeTypes.ROOT,
		children,
		helpers: new Set(),
		components: [],
		directives: [],
		hoists: [],
		imports: [],
		cached: 0,
		temps: 0,
		codegenNode: undefined,
		loc
	};
}
