import { NO, extend } from '@vue/shared';
import {
	ElementNode,
	ElementTypes,
	InterpolationNode,
	NodeTypes,
	Position,
	SourceLocation,
	TemplateChildNode,
	TextNode,
	createRoot
} from './ast';
import { advancePositionWithMutation } from './utils';

type AttributeValue =
	| {
			content: string;
			isQuoted: boolean;
			loc: SourceLocation;
	  }
	| undefined;

export interface ParserOptions {
	delimiters?: [string, string];

	// 定义校验tag是否合法
	isVoidTag?: (tag: string) => boolean;
}

export const enum TextModes {
	//          | Elements | Entities | End sign              | Inside of
	DATA //    | ✔        | ✔        | End tags of ancestors |
}

const enum TagType {
	Start,
	End
}

const defaultParserOptions: ParserOptions = {
	// 动态插值
	delimiters: [`{{`, `}}`],

	isVoidTag: NO
};

export interface ParserContext {
	options: ParserOptions;
	readonly originalSource: string;
	source: string;
	offset: number;
	line: number;
	column: number;
}

export function baseParse(content: string, options: ParserOptions = {}) {
	const context = createParserContext(content, options);
	const start = getCursor(context);
	const children = parseChildren(context, TextModes.DATA, []);
	const loc = getSelection(context, start);
	return createRoot(children, loc);
}

function parseChildren(context: ParserContext, mode: TextModes, ancestors: ElementNode[]) {
	const nodes: TemplateChildNode[] = [];

	// 直到找到标签结束为止
	while (!isEnd(context, mode, ancestors)) {
		const s = context.source;
		let node: TemplateChildNode | undefined = undefined;
		if (startsWith(s, context.options.delimiters[0])) {
			// "{{" 找到插值
			node = parseInterpolation(context);
		} else if (s[0] === '<') {
			// 匹配标签< 开头
			if (s.length === 1) {
				// <
				throw new SyntaxError('语法错误');
			} else if (s[1] === '!') {
				// 注释标签, 忽略不管
			} else if (s[1] === '/') {
				// </
				if (s.length === 2) {
					throw new SyntaxError('语法错误');
				} else if (s[2] === '>') {
					// </>
					throw new SyntaxError('语法错误-缺少tag名称');
				} else if (/[a-z]/i.test(s[2])) {
					// 匹配到了标签: </a-z>
					// 解析标签
					parseTag(context, TagType.End);
				}
			} else if (/[a-z]/i.test(s[1])) {
				// <div></div>
				node = parseElement(context, ancestors);
			}
		}

		// 如果上面不是标签，
		if (!node) {
			node = parseText(context, mode);
		}

		nodes.push(node);
	}

	return nodes;
}

function parseInterpolation(context: ParserContext): InterpolationNode | undefined {
	const [open, close] = context.options.delimiters;

	// {{ name }}  获取 }} 标签的起始位置，eg. 在这里就是 closeIndex = 8
	const closeIndex = context.source.indexOf(close, open.length);
	if (closeIndex === -1) {
		return undefined;
	}

	const start = getCursor(context);

	// 光标前进2位， 去掉 {{
	advanceBy(context, open.length);

	const innerStart = getCursor(context);
	const innerEnd = getCursor(context);

	// 真正的内容是 closeIndex - open.length 取中间的内容
	// 这里的rawContentLegth = 8 - 2 = 6 （算上空格）
	const rawContentLength = closeIndex - open.length;

	// 包含空格的内容 " name "
	const rawContent = context.source.slice(0, rawContentLength);

	// 解析文本内容，光标前进到 }} 符号前面，此时context.source的内容只剩 }}
	const preTrimContent = parseTextData(context, rawContentLength);

	// 去掉两边的空格 此时 content = name
	const content = preTrimContent.trim();

	const startOffset = preTrimContent.indexOf(content);

	if (startOffset > 0) {
		advancePositionWithMutation(innerStart, rawContent, startOffset);
	}

	const endOffset = rawContentLength - (preTrimContent.length - content.length - startOffset);
	advancePositionWithMutation(innerEnd, rawContent, endOffset);

	// 去掉最后的 }}
	advanceBy(context, close.length);

	return {
		type: NodeTypes.INTERPOLATION,
		content: {
			type: NodeTypes.SIMPLE_EXPRESSION,
			isStatic: false,
			content,
			loc: getSelection(context, innerStart, innerEnd)
		},
		loc: getSelection(context, start)
	};
}

function parseText(context: ParserContext, mode: TextModes): TextNode {
	// [<, {{]
	const endTokens = ['<', context.options.delimiters[0]];
	let endIndex = context.source.length;
	for (let i = 0; i < endTokens.length; i++) {
		const index = context.source.indexOf(endTokens[i]);
		if (endIndex > index && index !== -1) {
			// {{aaaaasd}}<div></div>

			// 找到 {{ 这个位置
			endIndex = index;
		}
	}

	const start = getCursor(context);
	const content = parseTextData(context, endIndex);

	return {
		type: NodeTypes.TEXT,
		loc: getSelection(context, start),
		content
	};
}

function parseTextData(context: ParserContext, length: number) {
	const rawText = context.source.slice(0, length);

	advanceBy(context, length);
	return rawText;
}

function parseElement(context: ParserContext, ancestors: ElementNode[]): ElementNode {
	// 解析开始标签 <div
	const element = parseTag(context, TagType.Start);

	// 如果是自闭合标签，或 满足自定义标签校验规则 返回本身
	// eg.  <div/> <img> <br>
	if (element.isSelfClosing || context.options.isVoidTag(element.tag)) {
		return element;
	}

	// 把开始标签都存在队列中
	ancestors.push(element);
	// 递归处理子元素
	// <div><span></span><div>
	const children = parseChildren(context, TextModes.DATA, ancestors);

	// 队列清空
	ancestors.pop();

	// 结束标签 </div>
	// 开始标签和结束标签是不是配对
	if (startsWithEndTagOpen(context.source, element.tag)) {
		// 解析结束标签
		parseTag(context, TagType.End);
	} else {
		// 如果开始标签和结束标签不匹配
		throw new SyntaxError('HTML语法错误');
	}

	// 把children存起来
	element.children = children;

	// 光标位置
	element.loc = getSelection(context, element.loc.start);

	return element;
}

function parseTag(context: ParserContext, type: TagType): ElementNode {
	const start = getCursor(context);

	//  eg. <div name='js'></div>

	const match = /^<\/?([a-z][^\s />]*)/i.exec(context.source)!;

	// div
	const tag = match[1];

	// </div
	// 移动截取位置到最后
	advanceBy(context, match[0].length);

	// 删掉空格, 为了后面解析props做准备
	advanceSpaces(context);

	const props = parseAttributes(context, type);

	// 闭合标签 />
	let isSelfClosing = false;

	// <div />
	if (startsWith(context.source, '/>')) {
		isSelfClosing = true;
	}

	// 如果是自闭和标签 光标移动到 /> 后面，如果不是移动到 > 后面
	advanceBy(context, isSelfClosing ? 2 : 1);

	// 明确表示闭合标签 返回
	if (type === TagType.End) return;

	return {
		// 标识整个节点的类型
		type: NodeTypes.ELEMENT,
		tag,
		isSelfClosing,
		loc: getSelection(context, start),
		children: [],
		props,
		// tag的类型
		tagType: ElementTypes.ELEMENT
	};
}

function createParserContext(content: string, rawOptions: ParserOptions): ParserContext {
	const options = extend({}, defaultParserOptions);

	let key: keyof ParserOptions;
	for (key in rawOptions) {
		// @ts-ignore
		options[key] = rawOptions[key] === undefined ? defaultParserOptions[key] : rawOptions[key];
	}

	return {
		options,
		// 列
		column: 1,
		// 默认第一行
		line: 1,
		// 没有偏移
		offset: 0,
		// 源数据
		originalSource: content,
		source: content
	};
}

function parseAttributes(context: ParserContext, type: TagType) {
	const props = [];
	const attributeNames = new Set<string>();

	// 知道匹配到 标签是闭合的位置: > 或者 />，表示匹配完成
	while (context.source.length > 0 && !startsWith(context.source, '>') && !startsWith(context.source, '/>')) {
		if (type === TagType.End) {
			new SyntaxError('不能从后往前遍历属性');
		}

		const attr = parseAttribute(context, attributeNames);

		if (attr.type === NodeTypes.ATTRIBUTE && attr.value && attr.name === 'class') {
			// eg. class =
			// "a
			// b
			// c"
			// class有独立换行的情况，替换掉\n 为空格，然后清空前后的空格
			attr.value.content = attr.value.content.replace(/\s+/g, ' ').trim();
		}

		if (type === TagType.Start) {
			props.push(attr);
		}
	}

	return props;
}

function parseAttribute(context: ParserContext, nameSet: Set<string>) {
	// 1： 解析名称
	// 2： 解析名称对应的value

	// 中间会有很多异常情况，比如没有属性名称，属性名称有特殊符号等等， 暂不考虑处理

	const start = getCursor(context);

	// eg. id='js'></div>
	// eg. id='js' />
	// props前面不能有空
	const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)!;

	// id
	const name = match[0];

	if (!nameSet.has(name)) {
		nameSet.add(name);
	}

	advanceBy(context, name.length);

	// 这时候source: ='js' />

	// 解析value
	let value: AttributeValue = undefined;

	// 匹配=
	//  =前后都有可能有 空格
	// eg. id  =    'js' />
	if (/^[\t\r\n\f ]*=/.test(context.source)) {
		// 清空=前面空格的情况
		advanceSpaces(context);
		// 前进一位 删掉=
		advanceBy(context, 1);
		// 清空=后面空格的情况
		advanceSpaces(context);

		// 解析value
		value = parseAttributeValue(context);
	}

	return {
		type: NodeTypes.ATTRIBUTE,
		name,
		value: value && {
			type: NodeTypes.TEXT,
			content: value.content,
			loc: value.loc
		},
		loc: getSelection(context, start)
	};
}

function parseAttributeValue(context: ParserContext): AttributeValue {
	const start = getCursor(context);
	let content: string;

	// value有'' ""
	const quote = context.source[0];
	const isQuoted = quote === `"` || quote === `'`;
	// 如果有引号
	if (isQuoted) {
		// 删掉第一个引号
		advanceBy(context, 1);
		// 获取最后一个引号的位置
		const endIndex = context.source.indexOf(quote);
		// 没找到
		if (endIndex === -1) {
			// eg. id=js
			content = parseTextData(context, context.source.length);
		} else {
			content = parseTextData(context, endIndex);
			// 删掉最后一个引号
			advanceBy(context, 1);
		}
	} else {
		// 没有引号

		// 匹配value前面没有空白符的数据
		const match = /^[^\t\r\n\f >]+/.exec(context.source);
		if (!match) {
			// eg. id=
			return undefined;
		}

		content = parseTextData(context, match[0].length);
	}

	return {
		content,
		loc: getSelection(context, start),
		isQuoted
	};
}

function getCursor(context: ParserContext): Position {
	const { column, line, offset } = context;
	return { column, line, offset };
}

function getSelection(context: ParserContext, start: Position, end?: Position): SourceLocation {
	end = end || getCursor(context);
	return {
		start,
		end,
		// 截取开始/结束区间的数据
		source: context.originalSource.slice(start.offset, end.offset)
	};
}

function startsWith(source: string, searchString: string) {
	return source.startsWith(searchString);
}

function isEnd(context: ParserContext, mode: TextModes, ancestors: ElementNode[]) {
	const s = context.source;
	switch (mode) {
		case TextModes.DATA:
			// </div> 标签结束
			if (startsWith(s, '</')) {
				// 倒序查找： </div>
				for (let i = ancestors.length - 1; i >= 0; --i) {
					if (startsWithEndTagOpen(s, ancestors[i].tag)) {
						return true;
					}
				}
			}
			break;

		default:
			break;
	}
	return !s;
}

function startsWithEndTagOpen(source: string, tag: string) {
	// tag: div span  br  ul

	// </div>
	// source.slice(2, tag.length + 2) = div
	// 匹配最后一个 闭合标签  >
	return (
		startsWith(source, '</') &&
		source.slice(2, tag.length + 2).toLowerCase() === tag.toLowerCase() &&
		/[\s />]/.test(source[tag.length + 2] || '>')
	);
}

function advanceBy(context: ParserContext, numberOfCharacters: number) {
	advancePositionWithMutation(context, context.source, numberOfCharacters);
	// 这个地方是唯一修改source的地方
	// 移动光标，截取后numberOfCharacters个字符
	context.source = context.source.slice(numberOfCharacters);
}

function advanceSpaces(context: ParserContext) {
	// 非空白符
	// 如果匹配到了空格，就删掉空格
	const match = /^[\S ]+/.exec(context.source);
	if (match) {
		advanceBy(context, match[0].length);
	}
}
